import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createReadStream, constants } from 'node:fs';
import type { AppConfig, DownloadJob } from './types.js';

export const DOWNLOAD_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function streamDownload(filePath: string, res: import('express').Response) {
  await fs.access(filePath, constants.R_OK);
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  const stream = createReadStream(filePath);
  await pipeline(stream, res);
}

export function createDownloadToken(jobId: string, filePath: string, secret: string) {
  const expires = Date.now() + DOWNLOAD_TOKEN_TTL_MS;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${jobId}|${filePath}|${expires}`)
    .digest('base64url');
  return `${expires}.${sig}`;
}

export function verifyDownloadToken(token: string | undefined, jobId: string, filePath: string, secret: string) {
  if (!token) return false;
  const [expires, sig] = token.split('.');
  if (!expires || !sig) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${jobId}|${filePath}|${expires}`)
    .digest('base64url');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function sanitizeTemplate(template: string) {
  return template.replace(/[\\/<>:"|?*]/g, '_');
}

export async function getDiskUsage(dir: string) {
  let total = 0;
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else {
        const stat = await fs.stat(entryPath);
        total += stat.size;
      }
    }
  }
  await walk(dir);
  return total;
}

export interface PersistedJobEntry {
  id: string;
  url: string;
  preset: string;
  options: DownloadJob['options'];
  status: DownloadJob['status'];
  stage: DownloadJob['stage'];
  progress: number;
  outputFile?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  ip: string;
}

const JOB_LOG_FILE = path.join(process.cwd(), 'server/data/cache/jobs.json');

export async function loadPersistedJobs(): Promise<PersistedJobEntry[]> {
  try {
    const raw = await fs.readFile(JOB_LOG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function persistJobs(jobs: PersistedJobEntry[]) {
  const tmp = `${JOB_LOG_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(jobs, null, 2));
  await fs.rename(tmp, JOB_LOG_FILE);
}

export async function cleanupOldFiles(config: AppConfig) {
  const cutoff = Date.now() - config.cacheMaxDays * 24 * 60 * 60 * 1000;
  await cleanupDir(config.cacheDir, cutoff);
  await cleanupDir(config.downloadsDir, cutoff);
}

async function cleanupDir(dir: string, cutoff: number) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const stat = await fs.stat(entryPath);
    if (stat.mtimeMs < cutoff) {
      if (entry.isDirectory()) {
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.unlink(entryPath).catch(() => {});
      }
    }
  }
}
