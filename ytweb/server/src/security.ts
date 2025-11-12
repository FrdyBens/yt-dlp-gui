import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';
import { config } from './config.js';

export function applySecurity(app: Express) {
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }));

  app.use(
    cors({
      origin: config.corsOrigin ?? undefined,
      credentials: true,
    })
  );

  const inspectLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: config.rateLimitInspectPerMin,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/inspect', inspectLimiter);
}
