import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import type { AppConfig } from './types.js';

dotenv.config();

const dataDir = path.resolve(process.cwd(), 'server/data');
const cacheDir = path.join(dataDir, 'cache');
const downloadsDir = path.join(dataDir, 'downloads');

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 5000),
  host: process.env.HOST ?? '0.0.0.0',
  maxConcurrency: Number(process.env.MAX_CONCURRENCY ?? 3),
  rateLimitInspectPerMin: Number(process.env.RATE_LIMIT_INSPECT_PER_MIN ?? 10),
  parallelFragmentsDefault: Number(process.env.PARALLEL_FRAGMENTS_DEFAULT ?? 8),
  downloadTokenSecret: process.env.DOWNLOAD_TOKEN_SECRET ?? 'dev-secret',
  cacheMaxDays: Number(process.env.CACHE_MAX_DAYS ?? 14),
  corsOrigin: process.env.CORS_ORIGIN,
  dataDir,
  cacheDir,
  downloadsDir,
};

for (const dir of [dataDir, cacheDir, downloadsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
