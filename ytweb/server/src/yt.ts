import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { BinaryInfo, DownloadJob, DownloadOptions, InspectCacheEntry, JobStage } from './types.js';
import { sanitizeTemplate } from './files.js';
import { config } from './config.js';

const INSPECT_CACHE_DIR = path.join(config.cacheDir, 'inspect');
const THUMB_CACHE_DIR = path.join(config.cacheDir, 'thumbnails');
const cacheReady = Promise.all([
  fs.mkdir(INSPECT_CACHE_DIR, { recursive: true }),
  fs.mkdir(THUMB_CACHE_DIR, { recursive: true }),
]);

export const PROGRESS_PREFIX = 'progress:';

export function parseProgressLine(line: string) {
  if (!line.startsWith(PROGRESS_PREFIX)) return null;
  const [, downloaded, total, percent, eta, speed] = line.split(':');
  const pctNumber = Number((percent ?? '0').replace('%', ''));
  return {
    downloadedBytes: Number(downloaded || 0),
    totalBytes: Number(total || 0) || undefined,
    percent: Number.isFinite(pctNumber) ? pctNumber : 0,
    eta: eta && eta !== 'None' ? eta : undefined,
    speed: speed && speed !== 'None' ? speed : undefined,
  };
}

export async function detectBinaries(): Promise<BinaryInfo> {
  const yt = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8' });
  const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return {
    ytDlpVersion: yt.status === 0 ? yt.stdout.trim() : null,
    ffmpegAvailable: ff.status === 0,
  };
}

export async function inspectUrl(url: string): Promise<InspectCacheEntry> {
  await cacheReady;
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const cacheFile = path.join(INSPECT_CACHE_DIR, `${hash}.json`);
  try {
    const cached = JSON.parse(await fs.readFile(cacheFile, 'utf8')) as InspectCacheEntry;
    return cached;
  } catch {
    // continue
  }

  const result = await runYtDlp(['-J', '--no-warnings', url]);
  const json = JSON.parse(result);
  const entry: InspectCacheEntry = {
    url,
    cachedAt: Date.now(),
    data: json,
  };

  const thumbUrl = json.thumbnail ?? json.thumbnails?.[0]?.url;
  if (thumbUrl) {
    try {
      const thumbRes = await fetch(thumbUrl);
      if (thumbRes.ok) {
        const buf = Buffer.from(await thumbRes.arrayBuffer());
        const thumbPath = path.join(THUMB_CACHE_DIR, `${hash}${guessExt(thumbRes.headers.get('content-type'))}`);
        await fs.writeFile(thumbPath, buf);
        entry.thumbnailPath = thumbPath;
      }
    } catch (err) {
      console.warn('thumbnail cache failed', err);
    }
  }

  await fs.writeFile(cacheFile, JSON.stringify(entry));
  return entry;
}

function guessExt(contentType: string | null) {
  if (!contentType) return '.jpg';
  if (contentType.includes('png')) return '.png';
  return '.jpg';
}

async function runYtDlp(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });
  });
}

export interface DownloadExecutionResult {
  outputFile: string;
}

export function buildYtDlpArgs(job: DownloadJob, binaries: BinaryInfo) {
  const args: string[] = ['--no-warnings', '--progress-template', `${PROGRESS_PREFIX}%(progress.downloaded_bytes)s:%(progress.total_bytes_estimate)s:%(progress._percent_str)s:%(progress._eta_str)s:%(progress.speed)s`, '--print', 'after_move:filepath'];
  const parallel = Math.min(16, Math.max(1, job.options.parallelFragments));
  args.push('-N', String(parallel));
  args.push('--no-playlist');
  const templateSafe = sanitizeTemplate(job.options.outputTemplate);
  const outputTemplate = path.join(config.downloadsDir, `${job.id}_${templateSafe}`);
  args.push('-o', outputTemplate);

  if (job.options.proxy) {
    args.push('--proxy', job.options.proxy);
  }
  if (job.options.speedLimit && job.options.speedLimit > 0) {
    args.push('--limit-rate', `${job.options.speedLimit}K`);
  }

  if (job.preset === 'audio') {
    args.push('-x');
    args.push('--audio-format', job.options.audioFormat ?? 'mp3');
    args.push('--audio-quality', '0');
    args.push('-f', job.options.format ?? 'bestaudio/best');
  } else if (job.preset === 'best') {
    args.push('-f', job.options.format ?? 'bv*+ba/b');
    args.push('--merge-output-format', 'mp4');
  } else {
    if (job.options.format) {
      args.push('-f', job.options.format);
    }
  }

  const sub = job.options.subtitles;
  if (sub) {
    if (sub.langs.length) {
      args.push('--write-subs');
      args.push('--sub-langs', sub.langs.join(','));
    }
    if (sub.convertTo) {
      args.push('--convert-subs', sub.convertTo);
    }
    if (sub.embed && binaries.ffmpegAvailable) {
      args.push('--embed-subs');
    }
  }

  if (job.options.embedMetadata && binaries.ffmpegAvailable) {
    args.push('--embed-thumbnail', '--embed-metadata');
  }

  args.push(job.url);
  return { args, outputTemplate };
}

export interface ExecutionHooks {
  onStage(stage: JobStage): void;
  onProgress(update: ReturnType<typeof parseProgressLine>): void;
  onLog(line: string): void;
  onFile(path: string): void;
}

export function executeDownload(job: DownloadJob, binaries: BinaryInfo, hooks: ExecutionHooks) {
  const { args } = buildYtDlpArgs(job, binaries);
  const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let finalPath: string | null = null;

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split(/\n+/).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('after_move:filepath')) {
        const [, file] = line.split(' ');
        if (file) {
          finalPath = file.trim();
          hooks.onFile(finalPath);
        }
      } else if (line.startsWith(PROGRESS_PREFIX)) {
        const progress = parseProgressLine(line);
        if (progress) {
          hooks.onStage('download');
          hooks.onProgress(progress);
        }
      } else {
        hooks.onLog(line);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const line = chunk.toString();
    hooks.onLog(line);
    if (line.includes('Merging formats')) {
      hooks.onStage('merging');
    } else if (line.includes('Post-process')) {
      hooks.onStage('postprocessing');
    }
  });

  const completion = new Promise<DownloadExecutionResult>((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0 && finalPath) {
        hooks.onStage('completed');
        resolve({ outputFile: finalPath });
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });

  return {
    child,
    completion,
  };
}

export async function gracefulKill(child: ChildProcessWithoutNullStreams) {
  if (process.platform === 'win32') {
    child.kill('SIGTERM');
    await sleep(300);
    child.kill('SIGKILL');
  } else {
    child.kill('SIGINT');
  }
}
