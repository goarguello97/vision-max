import { createApp } from './app';
import { env } from './config/env';
import { sequelize } from './db/sequelize';
import { startAuthCleanupJob } from './modules/auth/cleanup';

const server = createApp().listen(env.PORT, () => {
  console.log(`[server] escuchando en :${env.PORT} (${env.NODE_ENV})`);
});

sequelize.authenticate().then(
  () => console.log('[db] conexión OK'),
  (err: Error) => console.error('[db] sin conexión:', err.message),
);

function shutdown(signal: string) {
  console.log(`[server] ${signal} recibido, cerrando…`);
  server.close(() => {
    sequelize.close().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startAuthCleanupJob();
