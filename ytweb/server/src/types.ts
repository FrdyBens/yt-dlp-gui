import { Server as IOServer } from 'socket.io';

export type PresetType = 'best' | 'audio' | 'custom';

export interface SubtitleOptions {
  langs: string[];
  embed: boolean;
  convertTo?: 'srt' | 'ass' | 'vtt';
}

export interface DownloadOptions {
  format?: string;
  audioFormat?: 'mp3' | 'm4a' | 'opus';
  subtitles?: SubtitleOptions;
  embedMetadata?: boolean;
  outputTemplate: string;
  parallelFragments: number;
  speedLimit?: number;
  proxy?: string;
}

export interface DownloadJob {
  id: string;
  url: string;
  preset: PresetType;
  options: DownloadOptions;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: string;
  eta?: string;
  createdAt: number;
  updatedAt: number;
  ip: string;
  outputFile?: string;
  error?: string;
  logfile: string[];
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
export type JobStage = 'queued' | 'download' | 'merging' | 'postprocessing' | 'completed' | 'failed';

export interface AppConfig {
  port: number;
  host: string;
  maxConcurrency: number;
  rateLimitInspectPerMin: number;
  parallelFragmentsDefault: number;
  downloadTokenSecret: string;
  cacheMaxDays: number;
  corsOrigin?: string;
  dataDir: string;
  cacheDir: string;
  downloadsDir: string;
}

export interface BinaryInfo {
  ytDlpVersion: string | null;
  ffmpegAvailable: boolean;
}

export interface JobControllerDeps {
  io: IOServer;
  config: AppConfig;
  binaries: BinaryInfo;
}

export interface InspectCacheEntry {
  url: string;
  cachedAt: number;
  data: Record<string, unknown>;
  thumbnailPath?: string;
}
