/**
 * @fileoverview Controlador de autenticación
 * @module controllers/AuthController
 */

import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { registerSchema, loginSchema } from '../models/schemas';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import config from '../config';

/**
 * Controlador que maneja las solicitudes HTTP relacionadas con autenticación.
 * @class AuthController
 */
export class AuthController {
  /**
   * Registra un nuevo usuario en el sistema.
   * @async
   * @method register
   * @param {Request} req - Solicitud HTTP con datos de registro
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Inicia sesión de un usuario.
   * @async
   * @method login
   * @param {Request} req - Solicitud HTTP con credenciales
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario.
   * @async
   * @method logout
   * @param {Request} req - Solicitud HTTP
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Sesión cerrada',
    });
  }

  /**
   * Obtiene el usuario autenticado actual.
   * @async
   * @method me
   * @param {Request} req - Solicitud HTTP
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
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