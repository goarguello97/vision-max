import { Request, Response } from 'express';
import { favoriteService } from '../services/FavoriteService';

export class FavoriteController {
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