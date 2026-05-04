import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/AppError';
import { userRepository } from '../repositories/UserRepository';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw new UnauthorizedError('No autenticado');
    }

    const payload = verifyToken(token);

    const user = await userRepository.findById(payload.id);
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    if (user.isBanned) {
      throw new UnauthorizedError('Usuario baneado');
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (token) {
      const payload = verifyToken(token);
      const user = await userRepository.findById(payload.id);

      if (user && !user.isBanned) {
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        };
      }
    }

    next();
  } catch {
    next();
  }
};