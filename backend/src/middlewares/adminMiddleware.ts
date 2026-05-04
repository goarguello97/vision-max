import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { ForbiddenError } from '../utils/AppError';

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