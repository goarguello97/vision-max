/**
 * @fileoverview Servicio de películas favoritas de usuarios
 * @module services/FavoriteService
 */

import { favoriteRepository } from '../repositories/FavoriteRepository';
import { NotFoundError, ConflictError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Servicio que maneja las operaciones de películas favoritas.
 * Permite a los usuarios agregar, eliminar y consultar sus películas favoritas.
 * @class FavoriteService
 */
export class FavoriteService {
  /**
   * Agrega una película a los favoritos del usuario.
   * @async
   * @method addFavorite
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<void>}
   * @throws {ConflictError} Si la película ya está en favoritos
   */
  async addFavorite(userId: number, movieId: number): Promise<void> {
    logger.info('FavoriteService.addFavorite', { userId, movieId });

    const existing = await favoriteRepository.findByUserAndMovie(userId, movieId);
    if (existing) {
      throw new ConflictError('La película ya está en favoritos');
    }

    await favoriteRepository.create(userId, movieId);
    logger.info('Favorite added', { userId, movieId });
  }

  /**
   * Elimina una película de los favoritos del usuario.
   * @async
   * @method removeFavorite
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<void>}
   * @throws {NotFoundError} Si la película no está en favoritos
   */
  async removeFavorite(userId: number, movieId: number): Promise<void> {
    logger.info('FavoriteService.removeFavorite', { userId, movieId });

    const existing = await favoriteRepository.findByUserAndMovie(userId, movieId);
    if (!existing) {
      throw new NotFoundError('Película no encontrada en favoritos');
    }

    await favoriteRepository.delete(userId, movieId);
    logger.info('Favorite removed', { userId, movieId });
  }

  /**
   * Obtiene las películas favoritas del usuario con paginación.
   * @async
   * @method getFavorites
   * @param {number} userId - ID del usuario
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad de resultados por página
   * @returns {Promise<{favorites: any[], total: number}>} Lista de favoritos y total
   */
  async getFavorites(userId: number, page: number = 1, limit: number = 20) {
    logger.info('FavoriteService.getFavorites', { userId, page });

    return favoriteRepository.findByUser(userId, page, limit);
  }

  /**
   * Obtiene los IDs de todas las películas favoritas del usuario.
   * @async
   * @method getUserFavoriteIds
   * @param {number} userId - ID del usuario
   * @returns {Promise<number[]>} Array de IDs de películas
   */
  async getUserFavoriteIds(userId: number): Promise<number[]> {
    return favoriteRepository.getUserFavoriteMovies(userId);
  }

  /**
   * Verifica si una película está en los favoritos del usuario.
   * @async
   * @method isFavorite
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<boolean>} true si está en favoritos
   */
  async isFavorite(userId: number, movieId: number): Promise<boolean> {
    const favorite = await favoriteRepository.findByUserAndMovie(userId, movieId);
    return !!favorite;
  }
}

export const favoriteService = new FavoriteService();