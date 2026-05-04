/**
 * @fileoverview Repositorio para operaciones de favoritos
 * @module repositories/FavoriteRepository
 */

import prisma from '../database/client';

/**
 * Interfaz de favorito con información de la película.
 * @interface FavoriteWithMovie
 */
interface FavoriteWithMovie {
  id: number;
  movieId: number;
  createdAt: Date;
  movie?: {
    id: number;
    title: string;
    poster_path: string | null;
    vote_average: number;
  };
}

/**
 * Repositorio que maneja las operaciones de favoritos de usuarios.
 * @class FavoriteRepository
 */
export class FavoriteRepository {
  /**
   * Busca un favorito por usuario y película.
   * @async
   * @method findByUserAndMovie
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<Favorite | null>} Favorito encontrado o null
   */
  async findByUserAndMovie(userId: number, movieId: number) {
    return prisma.favorite.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  /**
   * Crea un nuevo favorito para un usuario.
   * @async
   * @method create
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<Favorite>} Favorito creado
   */
  async create(userId: number, movieId: number) {
    return prisma.favorite.create({
      data: {
        userId,
        movieId,
      },
    });
  }

  /**
   * Elimina un favorito de un usuario.
   * @async
   * @method delete
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<Favorite>} Favorito eliminado
   */
  async delete(userId: number, movieId: number) {
    return prisma.favorite.delete({
      where: {
        userId_movieId: {
          userId,
          movieId,
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
   * @returns {Promise<{favorites: Favorite[], total: number}>} Lista de favoritos y total
   */
  async findByUser(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return { favorites, total };
  }

  /**
   * Cuenta el total de favoritos en el sistema.
   * @async
   * @method count
   * @returns {Promise<number>} Total de favoritos
   */
  async count(): Promise<number> {
    return prisma.favorite.count();
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
      where: { userId },
      select: { movieId: true },
    });
    return favorites.map((f) => f.movieId);
  }
}

export const favoriteRepository = new FavoriteRepository();