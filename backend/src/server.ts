/**
 * @fileoverview Servidor HTTP de la aplicación
 * @module server
 */

import app from './app';
import config from './config';
import { logger } from './utils/logger';

const port = config.port;

/**
 * Inicia el servidor HTTP en el puerto configurado
 * @constant {Server}
 */
const server = app.listen(port, () => {
  logger.info(`🚀 Visión Max API corriendo en http://localhost:${port}`);
  logger.info(`📦 Environment: ${config.nodeEnv}`);
  logger.info(`🎬 Mock Mode: ${config.mockMode ? 'ON' : 'OFF'}`);
  logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
});

/**
 * Manejo de señal SIGTERM para apagado graceful
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

/**
 * Manejo de señal SIGINT (Ctrl+C) para apagado graceful
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default server;