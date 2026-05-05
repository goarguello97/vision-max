/**
 * @fileoverview Servicio de favoritos de usuarios (películas y series)
 * @module services/FavoriteService
 */

import { favoriteRepository } from '../repositories/FavoriteRepository';
import { movieRepository } from '../repositories/MovieRepository';
import { tvRepository } from '../repositories/TvRepository';
import { NotFoundError, ConflictError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { MediaType } from '@prisma/client';

export class FavoriteService {
  async addFavorite(userId: number, mediaId: number, mediaType: MediaType): Promise<void> {
    logger.info('FavoriteService.addFavorite', { userId, mediaId, mediaType });

    const existing = await favoriteRepository.findByUserAndMedia(userId, mediaId, mediaType);
    if (existing) {
      throw new ConflictError('Ya está en favoritos');
    }

    await favoriteRepository.create(userId, mediaId, mediaType);
    logger.info('Favorite added', { userId, mediaId, mediaType });
  }

  async removeFavorite(userId: number, mediaId: number, mediaType: MediaType): Promise<void> {
    logger.info('FavoriteService.removeFavorite', { userId, mediaId, mediaType });

    const existing = await favoriteRepository.findByUserAndMedia(userId, mediaId, mediaType);
    if (!existing) {
      throw new NotFoundError('No encontrado en favoritos');
    }

    await favoriteRepository.delete(userId, mediaId, mediaType);
    logger.info('Favorite removed', { userId, mediaId, mediaType });
  }

  async getFavorites(userId: number, page: number = 1, limit: number = 20, mediaType?: MediaType) {
    logger.info('FavoriteService.getFavorites', { userId, page, mediaType });
    return favoriteRepository.findByUser(userId, page, limit, mediaType);
  }

  async getFavoritesWithDetails(userId: number, mediaType: MediaType, page: number = 1, limit: number = 20) {
    logger.info('FavoriteService.getFavoritesWithDetails', { userId, mediaType, page });

    const { favorites, total } = await favoriteRepository.findByUser(userId, page, limit, mediaType);

    if (favorites.length === 0) {
      return { items: [], total, page, limit };
    }

    const mediaIds = favorites.map((f) => f.mediaId);

    let items: unknown[];
    if (mediaType === 'MOVIE') {
      items = await movieRepository.getByIds(mediaIds);
    } else {
      items = await tvRepository.getByIds(mediaIds);
    }

    return { items, total, page, limit };
  }

  async getUserFavoriteIds(userId: number, mediaType: MediaType): Promise<number[]> {
    if (mediaType === 'TV') {
      return favoriteRepository.getUserFavoriteTv(userId);
    }
    return favoriteRepository.getUserFavoriteMovies(userId);
  }

  async isFavorite(userId: number, mediaId: number, mediaType: MediaType): Promise<boolean> {
    const favorite = await favoriteRepository.findByUserAndMedia(userId, mediaId, mediaType);
    return !!favorite;
  }
}

export const favoriteService = new FavoriteService();