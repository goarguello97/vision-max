/**
 * @fileoverview Controlador de películas favoritas
 * @module controllers/FavoriteController
 */

import { Request, Response } from 'express';
import { favoriteService } from '../services/FavoriteService';

/**
 * Controlador que maneja las solicitudes HTTP relacionadas con favoritos.
 * @class FavoriteController
 */
export class FavoriteController {
  /**
   * Agrega una película a favoritos.
   * @async
   * @method addFavorite
   * @param {Request} req - Solicitud HTTP con movieId en parámetros
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
  async addFavorite(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const movieId = parseInt(req.params.movieId, 10);

    if (isNaN(movieId)) {
      res.status(400).json({
        success: false,
        message: 'ID de película inválido',
      });
      return;
    }

    await favoriteService.addFavorite(user.id, movieId);

    res.status(201).json({
      success: true,
      message: 'Película agregada a favoritos',
    });
  }

  /**
   * Elimina una película de favoritos.
   * @async
   * @method removeFavorite
   * @param {Request} req - Solicitud HTTP con movieId en parámetros
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
  async removeFavorite(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const movieId = parseInt(req.params.movieId, 10);

    if (isNaN(movieId)) {
      res.status(400).json({
        success: false,
        message: 'ID de película inválido',
      });
      return;
    }

    await favoriteService.removeFavorite(user.id, movieId);

    res.json({
      success: true,
      message: 'Película eliminada de favoritos',
    });
  }

  /**
   * Obtiene las películas favoritas del usuario.
   * @async
   * @method getFavorites
   * @param {Request} req - Solicitud HTTP con parámetros page y limit
   * @param {Response} res - Respuesta HTTP
   * @returns {Promise<void>}
   */
  async getFavorites(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await favoriteService.getFavorites(user.id, page, limit);

    res.json({
      success: true,
      data: {
        favorites: result.favorites,
        total: result.total,
        page,
        limit,
      },
    });
  }
}

export const favoriteController = new FavoriteController();