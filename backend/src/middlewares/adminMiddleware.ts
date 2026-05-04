/**
 * @fileoverview Middleware de autorización para roles de administrador
 * @module middlewares/adminMiddleware
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { ForbiddenError } from '../utils/AppError';

/**
 * Middleware que verifica que el usuario tenga rol de ADMIN.
 * @function adminMiddleware
 * @param {AuthRequest} req - Request con datos del usuario autenticado
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next de Express
 * @throws {ForbiddenError} Si el usuario no es administrador
 */
export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new ForbiddenError('No autenticado');
    }

    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenError('Acceso denegado. Se requiere rol de administrador');
    }

    next();
  } catch (error) {
    next(error);
  }
};