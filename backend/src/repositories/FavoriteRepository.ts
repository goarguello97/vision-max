/**
 * @fileoverview Repositorio para operaciones de favoritos
 * @module repositories/FavoriteRepository
 */

import prisma from '../database/client';
import { MediaType } from '@prisma/client';

/**
 * Interfaz de favorito con información del medio.
 * @interface FavoriteWithMedia
 */
interface FavoriteWithMedia {
  id: number;
  mediaId: number;
  mediaType: MediaType;
  createdAt: Date;
}

/**
 * Repositorio que maneja las operaciones de favoritos de usuarios.
 * @class FavoriteRepository
 */
export class FavoriteRepository {
  /**
   * Busca un favorito por usuario, medio y tipo.
   * @async
   * @method findByUserAndMedia
   * @param {number} userId - ID del usuario
   * @param {number} mediaId - ID del medio
   * @param {MediaType} mediaType - Tipo de medio (MOVIE o TV)
   * @returns {Promise<Favorite | null>} Favorito encontrado o null
   */
  async findByUserAndMedia(userId: number, mediaId: number, mediaType: MediaType) {
    return prisma.favorite.findUnique({
      where: {
        userId_mediaId_mediaType: {
          userId,
          mediaId,
          mediaType,
        },
      },
    });
  }

  /**
   * Crea un nuevo favorito para un usuario.
   * @async
   * @method create
   * @param {number} userId - ID del usuario
   * @param {number} mediaId - ID del medio
   * @param {MediaType} mediaType - Tipo de medio
   * @returns {Promise<Favorite>} Favorito creado
   */
  async create(userId: number, mediaId: number, mediaType: MediaType) {
    return prisma.favorite.create({
      data: {
        userId,
        mediaId,
        mediaType,
      },
    });
  }

  /**
   * Elimina un favorito de un usuario.
   * @async
   * @method delete
   * @param {number} userId - ID del usuario
   * @param {number} mediaId - ID del medio
   * @param {MediaType} mediaType - Tipo de medio
   * @returns {Promise<Favorite>} Favorito eliminado
   */
  async delete(userId: number, mediaId: number, mediaType: MediaType) {
    return prisma.favorite.delete({
      where: {
        userId_mediaId_mediaType: {
          userId,
          mediaId,
          mediaType,
        },
      },
    });
  }

  /**
   * Obtiene los favoritos de un usuario con paginación.
   * @async
   * @method findByUser
   * @param {number} userId - ID del usuario
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad por página
   * @param {MediaType} [mediaType] - Filtrar por tipo de medio
   * @returns {Promise<{favorites: Favorite[], total: number}>} Lista de favoritos y total
   */
  async findByUser(userId: number, page: number = 1, limit: number = 20, mediaType?: MediaType) {
    const skip = (page - 1) * limit;

    const where = mediaType ? { userId, mediaType } : { userId };

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.favorite.count({ where }),
    ]);

    return { favorites, total };
  }

  /**
   * Obtiene los favoritos de TV de un usuario.
   * @async
   * @method getUserFavoriteTv
   * @param {number} userId - ID del usuario
   * @returns {Promise<number[]>} Array de IDs de series
   */
  async getUserFavoriteTv(userId: number): Promise<number[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId, mediaType: 'TV' as MediaType },
      select: { mediaId: true },
    });
    return favorites.map((f) => f.mediaId);
  }

  /**
   * Obtiene los IDs de películas favoritas de un usuario.
   * @async
   * @method getUserFavoriteMovies
   * @param {number} userId - ID del usuario
   * @returns {Promise<number[]>} Array de IDs de películas
   */
  async getUserFavoriteMovies(userId: number): Promise<number[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId, mediaType: 'MOVIE' as MediaType },
      select: { mediaId: true },
    });
    return favorites.map((f) => f.mediaId);
  }
}

export const favoriteRepository = new FavoriteRepository();