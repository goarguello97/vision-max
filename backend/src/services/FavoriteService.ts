import { favoriteRepository } from '../repositories/FavoriteRepository';
import { NotFoundError, ConflictError } from '../utils/AppError';
import { logger } from '../utils/logger';

export class FavoriteService {
  async addFavorite(userId: number, movieId: number): Promise<void> {
    logger.info('FavoriteService.addFavorite', { userId, movieId });

    const existing = await favoriteRepository.findByUserAndMovie(userId, movieId);
    if (existing) {
      throw new ConflictError('La película ya está en favoritos');
    }

    await favoriteRepository.create(userId, movieId);
    logger.info('Favorite added', { userId, movieId });
  }

  async removeFavorite(userId: number, movieId: number): Promise<void> {
    logger.info('FavoriteService.removeFavorite', { userId, movieId });

    const existing = await favoriteRepository.findByUserAndMovie(userId, movieId);
    if (!existing) {
      throw new NotFoundError('Película no encontrada en favoritos');
    }

    await favoriteRepository.delete(userId, movieId);
    logger.info('Favorite removed', { userId, movieId });
  }

  async getFavorites(userId: number, page: number = 1, limit: number = 20) {
    logger.info('FavoriteService.getFavorites', { userId, page });

    return favoriteRepository.findByUser(userId, page, limit);
  }

  async getUserFavoriteIds(userId: number): Promise<number[]> {
    return favoriteRepository.getUserFavoriteMovies(userId);
  }

  async isFavorite(userId: number, movieId: number): Promise<boolean> {
    const favorite = await favoriteRepository.findByUserAndMovie(userId, movieId);
    return !!favorite;
  }
}

export const favoriteService = new FavoriteService();