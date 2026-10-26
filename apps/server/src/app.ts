import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@vision-max/shared';
import { env } from './config/env';
import { sequelize } from './db/sequelize';
import { apiError, HttpError } from './http/errors';
import { authRouter } from './modules/auth/routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    const db = await sequelize.authenticate().then(
      () => 'up' as const,
      () => 'down' as const,
    );
    const body: HealthResponse = { status: 'ok', db, uptimeSec: Math.round(process.uptime()) };
    res.status(db === 'up' ? 200 : 503).json(body);
  });

  app.use('/api/auth', authRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json(apiError('NOT_FOUND', 'El recurso no existe.'));
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json(err.body);
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json(apiError('INVALID_JSON', 'El cuerpo de la solicitud no es JSON válido.'));
      return;
    }
    // Nunca se loguea el body: en /auth/* trae contraseñas y tokens.
    console.error('[server] error no manejado:', err);
    res.status(500).json(apiError('INTERNAL_ERROR', 'Algo salió mal. Probá de nuevo en un momento.'));
  };
  app.use(onError);

  return app;
}
