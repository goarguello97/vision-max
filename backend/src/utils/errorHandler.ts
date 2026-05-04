/**
 * @fileoverview Manejadores de errores para Express
 * @module utils/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';
import { logger } from './logger';

/**
 * Estructura de respuesta de error.
 * @interface ErrorResponse
 */
interface ErrorResponse {
  status: string;
  message: string;
  code?: string;
  stack?: string;
}

/**
 * Middleware de manejo de errores centralizado.
 * @function errorHandler
 * @param {Error} err - Error thrown
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} _next - Función next de Express
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      message: err.message,
      code: err.code,
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    logger.warn(`Operational Error: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode).json(response);
    return;
  }

  logger.error('Unexpected Error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  const response: ErrorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
};

/**
 * Middleware para manejar rutas no encontradas.
 * @function notFoundHandler
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};