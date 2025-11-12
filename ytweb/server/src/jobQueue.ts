import { randomUUID } from 'node:crypto';
import type { DownloadJob, JobControllerDeps, PresetType } from './types.js';
import { executeDownload, gracefulKill } from './yt.js';
import { createDownloadToken, loadPersistedJobs, persistJobs } from './files.js';

const DOWNLOADS_PER_IP = 3;

export class JobController {
  private jobs = new Map<string, DownloadJob>();
  private queue: DownloadJob[] = [];
  private runningChildren = new Map<string, ReturnType<typeof executeDownload>>();
  private active = 0;

  constructor(private deps: JobControllerDeps) {}

  async init() {
    const persisted = await loadPersistedJobs();
    for (const entry of persisted) {
      const job: DownloadJob = {
        id: entry.id,
        url: entry.url,
        preset: entry.preset as PresetType,
        options: entry.options,
        status: entry.status,
        stage: entry.stage,
        progress: entry.progress,
        outputFile: entry.outputFile,
        error: entry.error,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        ip: entry.ip,
        logfile: [],
      };
      if (job.status === 'running' || job.status === 'queued') {
        job.status = 'failed';
        job.stage = 'failed';
        job.error = 'Server restarted during download';
      }
      this.jobs.set(job.id, job);
    }
    await this.persist();
  }

  listJobsForIp(ip: string) {
    return [...this.jobs.values()].filter((job) => job.ip === ip).sort((a, b) => b.createdAt - a.createdAt);
  }

  getJob(id: string) {
    return this.jobs.get(id);
  }

  private countForIp(ip: string) {
    return [...this.jobs.values()].filter((job) => job.ip === ip && (job.status === 'running' || job.status === 'queued')).length;
  }

  async submitJob(payload: { url: string; preset: PresetType; options: DownloadJob['options']; ip: string }) {
    if (this.countForIp(payload.ip) >= DOWNLOADS_PER_IP) {
      throw new Error('Too many concurrent downloads for this IP');
    }

    const existing = [...this.jobs.values()].find(
      (job) => job.status === 'completed' && job.url === payload.url && JSON.stringify(job.options) === JSON.stringify(payload.options)
    );
    if (existing && existing.outputFile) {
      return existing;
    }

    const now = Date.now();
    const job: DownloadJob = {
      id: randomUUID(),
      url: payload.url,
      preset: payload.preset,
      options: payload.options,
      status: 'queued',
      stage: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      ip: payload.ip,
      logfile: [],
    };
    this.jobs.set(job.id, job);
    this.queue.push(job);
    await this.persist();
    this.tick();
    this.emit(job);
    return job;
  }

  private tick() {
    while (this.active < this.deps.config.maxConcurrency && this.queue.length) {
      const job = this.queue.shift();
      if (!job) continue;
      if (job.status !== 'queued') continue;
      this.runJob(job).catch((err) => console.error('job failed', err));
    }
  }

  private async runJob(job: DownloadJob) {
    this.active += 1;
    job.status = 'running';
    job.stage = 'download';
    job.updatedAt = Date.now();
    this.emit(job);
    await this.persist();

    const execution = executeDownload(job, this.deps.binaries, {
      onStage: (stage) => {
        job.stage = stage;
        job.updatedAt = Date.now();
        this.emit(job);
      },
      onProgress: (progress) => {
        if (!progress) return;
        job.progress = progress.percent;
        job.downloadedBytes = progress.downloadedBytes;
        job.totalBytes = progress.totalBytes;
        job.speed = progress.speed;
        job.eta = progress.eta;
        job.updatedAt = Date.now();
        this.emit(job);
      },
      onLog: (line) => {
        job.logfile.push(line.trim());
        job.logfile = job.logfile.slice(-50);
        this.emit(job);
      },
      onFile: (file) => {
        job.outputFile = file;
      },
    });

    this.runningChildren.set(job.id, execution);

    try {
      const { completion } = execution;
      await completion;
      job.status = 'completed';
      job.stage = 'completed';
      job.progress = 100;
      job.updatedAt = Date.now();
      this.emit(job);
    } catch (err) {
      job.status = 'failed';
      job.stage = 'failed';
      job.error = err instanceof Error ? err.message : 'Unknown error';
      job.updatedAt = Date.now();
      this.emit(job);
    } finally {
      this.runningChildren.delete(job.id);
      this.active -= 1;
      await this.persist();
      this.tick();
    }
  }

  async cancelJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.status === 'completed' || job.status === 'failed') return;
    const execution = this.runningChildren.get(id);
    if (execution) {
      await gracefulKill(execution.child);
      this.runningChildren.delete(id);
      this.active = Math.max(0, this.active - 1);
    } else {
      this.queue = this.queue.filter((j) => j.id !== id);
    }
    job.status = 'canceled';
    job.stage = 'failed';
    job.updatedAt = Date.now();
    job.error = 'Canceled by user';
    await this.persist();
    this.emit(job);
    this.tick();
  }

  private emit(job: DownloadJob) {
    this.deps.io.to(job.id).emit('progress', this.serializeJob(job));
  }

  serializeJob(job: DownloadJob) {
    return {
      id: job.id,
      url: job.url,
      preset: job.preset,
      options: job.options,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      downloadedBytes: job.downloadedBytes,
      totalBytes: job.totalBytes,
      speed: job.speed,
      eta: job.eta,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      outputFile: job.outputFile,
      error: job.error,
      logfile: job.logfile,
    };
  }

  async persist() {
    const payload = [...this.jobs.values()].map((job) => ({
      id: job.id,
      url: job.url,
      preset: job.preset,
      options: job.options,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      outputFile: job.outputFile,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      ip: job.ip,
    }));
    await persistJobs(payload);
  }

  buildDownloadLink(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.outputFile) return null;
    const token = createDownloadToken(job.id, job.outputFile, this.deps.config.downloadTokenSecret);
    return { token, path: job.outputFile };
  }
}
