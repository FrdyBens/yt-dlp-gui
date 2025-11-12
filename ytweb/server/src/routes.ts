import express from 'express';
import { z } from 'zod';
import type { AppConfig, BinaryInfo, PresetType } from './types.js';
import { JobController } from './jobQueue.js';
import { inspectUrl } from './yt.js';
import { getDiskUsage, streamDownload, verifyDownloadToken } from './files.js';

const downloadSchema = z.object({
  url: z.string().url(),
  preset: z.enum(['best', 'audio', 'custom']),
  options: z.object({
    format: z.string().optional(),
    audioFormat: z.enum(['mp3', 'm4a', 'opus']).optional(),
    subtitles: z
      .object({
        langs: z.array(z.string()).default([]),
        embed: z.boolean().default(false),
        convertTo: z.enum(['srt', 'ass', 'vtt']).optional(),
      })
      .optional(),
    embedMetadata: z.boolean().optional(),
    outputTemplate: z.string().min(3),
    parallelFragments: z.number().int().min(1).max(16),
    speedLimit: z.number().nonnegative().optional(),
    proxy: z.string().optional(),
  }),
});

export function registerRoutes(app: express.Express, jobController: JobController, binaries: BinaryInfo, config: AppConfig) {
  const router = express.Router();

  router.get('/health', async (_req, res) => {
    res.json({ ok: true, ytDlpVersion: binaries.ytDlpVersion, ffmpeg: binaries.ffmpegAvailable });
  });

  router.get('/inspect', async (req, res, next) => {
    try {
      const url = z.string().url().parse(req.query.url);
      const info = await inspectUrl(url);
      res.json(info);
    } catch (err) {
      next(err);
    }
  });

  router.post('/download', async (req, res, next) => {
    try {
      const parsed = downloadSchema.parse(req.body);
      const ip = req.ip;
      const job = await jobController.submitJob({ url: parsed.url, preset: parsed.preset as PresetType, options: parsed.options, ip });
      res.json({ jobId: job.id });
    } catch (err) {
      next(err);
    }
  });

  router.get('/jobs', (req, res) => {
    const jobs = jobController.listJobsForIp(req.ip).map((job) => jobController.serializeJob(job));
    res.json(jobs);
  });

  router.get('/jobs/:id', (req, res) => {
    const job = jobController.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(jobController.serializeJob(job));
  });

  router.delete('/jobs/:id', async (req, res) => {
    await jobController.cancelJob(req.params.id);
    res.json({ ok: true });
  });

  router.get('/jobs/:id/download', (req, res) => {
    const link = jobController.buildDownloadLink(req.params.id);
    if (!link) return res.status(400).json({ error: 'Job not ready' });
    res.json({ url: `/dl/${req.params.id}?token=${link.token}` });
  });

  router.get('/admin/settings', async (req, res) => {
    if (!req.ip.includes('127.0.0.1') && !req.ip.includes('::1')) {
      return res.status(403).json({ error: 'Local access only' });
    }
    const diskUsage = await getDiskUsage(config.dataDir);
    res.json({
      maxConcurrency: config.maxConcurrency,
      parallelFragmentsDefault: config.parallelFragmentsDefault,
      cacheMaxDays: config.cacheMaxDays,
      downloadsDir: config.downloadsDir,
      diskUsage,
      binaries,
    });
  });

  app.use('/api', router);

  app.get('/dl/:id', async (req, res) => {
    const job = jobController.getJob(req.params.id);
    if (!job || !job.outputFile) return res.status(404).json({ error: 'Not found' });
    const valid = verifyDownloadToken(req.query.token as string, job.id, job.outputFile, config.downloadTokenSecret);
    if (!valid) return res.status(401).json({ error: 'Invalid or expired token' });
    try {
      await streamDownload(job.outputFile, res);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Download failed' });
    }
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues.map((issue) => issue.message).join(', ') });
    }
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    res.status(500).json({ error: 'Unknown server error' });
  });
}
