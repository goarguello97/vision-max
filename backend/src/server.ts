import app from './app';
import config from './config';
import { logger } from './utils/logger';

const port = config.port;

const server = app.listen(port, () => {
  logger.info(`🚀 Visión Max API corriendo en http://localhost:${port}`);
  logger.info(`📦 Environment: ${config.nodeEnv}`);
  logger.info(`🎬 Mock Mode: ${config.mockMode ? 'ON' : 'OFF'}`);
  logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default server;