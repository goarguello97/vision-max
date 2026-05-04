/**
 * @fileoverview Aplicación principal de Express
 * @module app
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import config from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';
import { logger } from './utils/logger';
import { swaggerDocs, setupSwagger } from './config/swagger';

/**
 * Instancia de la aplicación Express
 * @constant {Application}
 */
const app: Application = express();

/**
 * Configuración de middlewares de seguridad
 */
app.use(helmet());

/**
 * Configuración de CORS
 * Permite solicitudes del frontend configurado
 */
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

/**
 * Middleware de compresión de respuestas
 */
app.use(compression());

/**
 * Middleware para parseo de cookies
 */
app.use(cookieParser());

/**
 * Middleware para parseo de JSON
 */
app.use(express.json());

/**
 * Middleware para parseo de datos URL-encoded
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Middleware de logging para debug
 * Registra método y path de cada solicitud
 */
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, { query: req.query, params: req.params });
  next();
});

/**
 * Configuración de rutas principales
 */
app.use('/', routes);

/**
 * Documentación Swagger
 */
app.use('/api-docs', swaggerDocs, setupSwagger);

/**
 * Middleware para manejar rutas no encontradas
 */
app.use(notFoundHandler);

/**
 * Middleware para manejo de errores
 */
app.use(errorHandler);

export default app;