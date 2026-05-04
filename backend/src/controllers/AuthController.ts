import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { registerSchema, loginSchema } from '../models/schemas';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import config from '../config';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);

      const result = await authService.register(input);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      throw error;
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);

      const result = await authService.login(input);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      throw error;
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Sesión cerrada',
    });
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const result = await authService.getMe(user.id);

    res.json({
      success: true,
      data: result,
    });
  }
}

export const authController = new AuthController();