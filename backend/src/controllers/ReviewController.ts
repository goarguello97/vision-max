/**
 * @fileoverview Controlador de reseñas de películas
 * @module controllers/ReviewController
 */

import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/ReviewService';
import { createReviewSchema, updateReviewSchema } from '../models/schemas';
import { ZodError } from 'zod';

/**
 * Controlador que maneja las solicitudes HTTP relacionadas con reseñas.
 * @class ReviewController
 */
export class ReviewController {
  /**
   * Crea una nueva reseña.
   * @async
   * @method create
   * @param {Request} req - Solicitud HTTP con datos de la reseña
   * @param {Response} res - Respuesta HTTP
   * @param {NextFunction} next - Función de siguiente middleware
   * @returns {Promise<void>}
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as unknown as { user: { id: number } }).user;

      try {
        const input = createReviewSchema.parse(req.body);
        const review = await reviewService.create(user.id, input);

        res.status(201).json({
          success: true,
          data: review,
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza una reseña existente.
   * @async
   * @method update
   * @param {Request} req - Solicitud HTTP con id de reseña y datos actualizados
   * @param {Response} res - Respuesta HTTP
   * @param {NextFunction} next - Función de siguiente middleware
   * @returns {Promise<void>}
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as unknown as { user: { id: number } }).user;
      const reviewId = parseInt(req.params.id, 10);

      if (isNaN(reviewId)) {
        res.status(400).json({
          success: false,
          message: 'ID de reseña inválido',
        });
        return;
      }

      try {
        const input = updateReviewSchema.parse(req.body);
        const review = await reviewService.update(user.id, reviewId, input);

        res.json({
          success: true,
          data: review,
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina una reseña.
   * @async
   * @method delete
   * @param {Request} req - Solicitud HTTP con id de reseña
   * @param {Response} res - Respuesta HTTP
   * @param {NextFunction} next - Función de siguiente middleware
   * @returns {Promise<void>}
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as unknown as { user: { id: number; role: string } }).user;
      const reviewId = parseInt(req.params.id, 10);

      if (isNaN(reviewId)) {
        res.status(400).json({
          success: false,
          message: 'ID de reseña inválido',
        });
        return;
      }

      const isAdmin = user.role === 'ADMIN';
      await reviewService.delete(user.id, reviewId, isAdmin);

      res.json({
        success: true,
        message: 'Reseña eliminada',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene las reseñas de una película.
   * @async
   * @method getByMovie
   * @param {Request} req - Solicitud HTTP con movieId y parámetros de paginación
   * @param {Response} res - Respuesta HTTP
   * @param {NextFunction} next - Función de siguiente middleware
   * @returns {Promise<void>}
   */
  async getByMovie(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movieId = parseInt(req.params.movieId, 10);

      if (isNaN(movieId)) {
        res.status(400).json({
          success: false,
          message: 'ID de película inválido',
        });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await reviewService.getByMovie(movieId, page, limit);

      res.json({
        success: true,
        data: {
          reviews: result.reviews,
          total: result.total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();