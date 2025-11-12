import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import express from 'express';
import { Server as IOServer } from 'socket.io';
import { config } from './config.js';
import { applySecurity } from './security.js';
import { JobController } from './jobQueue.js';
import { detectBinaries } from './yt.js';
import { registerRoutes } from './routes.js';
import { cleanupOldFiles } from './files.js';

async function bootstrap() {
  const binaries = await detectBinaries();
  if (!binaries.ytDlpVersion) {
    console.warn('yt-dlp not detected on PATH. The server will still run but downloads will fail.');
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  applySecurity(app);

  const server = http.createServer(app);
  const io = new IOServer(server, {
    cors: { origin: config.corsOrigin ?? undefined },
  });

  const jobController = new JobController({ io, config, binaries });
  await jobController.init();

  io.on('connection', (socket) => {
    socket.on('join', (jobId: string) => {
      socket.join(jobId);
    });
  });

  registerRoutes(app, jobController, binaries, config);

  const clientDist = path.resolve(process.cwd(), 'client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  server.listen(config.port, config.host, () => {
    console.log(`ytweb server listening on http://${config.host}:${config.port}`);
    listLanAddresses(config.port);
  });

  setInterval(() => {
    cleanupOldFiles(config).catch((err) => console.error('cleanup failed', err));
  }, 12 * 60 * 60 * 1000).unref();
}

function listLanAddresses(port: number) {
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((iface) => {
    iface?.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        console.log(`LAN: http://${details.address}:${port}`);
      }
    });
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
