import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import type { Logger } from 'pino';
import type { Config } from './config';
import type { AuthService } from './modules/auth/auth.service';
import type { LoanService } from './modules/loans/loan.service';
import { authRouter } from './modules/auth/auth.routes';
import { loanRouter } from './modules/loans/loan.routes';
import { authenticate } from './middleware/authenticate';
import { errorHandler } from './middleware/error-handler';
import { AppError } from './lib/errors';

export function createApp(deps: {
  config: Config;
  logger: Logger;
  auth: AuthService;
  loans: LoanService;
  checkDatabase: () => Promise<void>;
  rateLimits?: boolean;
}) {
  const app = express();
  const rateLimits = deps.rateLimits ?? true;
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: deps.config.corsOrigins }));
  app.use(
    pinoHttp({
      logger: deps.logger,
      genReqId: () => randomUUID(),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/ready', async (_req, res) => {
    try {
      await deps.checkDatabase();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  if (rateLimits)
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 120,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
          error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute.' },
        },
      }),
    );
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/auth', authRouter(deps.auth, rateLimits));
  app.use('/api/loans', authenticate(deps.config.JWT_SECRET), loanRouter(deps.loans));
  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found.'));
  });
  app.use(errorHandler(deps.logger));
  return app;
}
