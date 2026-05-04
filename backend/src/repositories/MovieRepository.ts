/**
 * @fileoverview Repositorio para operaciones de películas (TMDB API)
 * @module repositories/MovieRepository
 */

import config from '../config';
import { getMockMovies, searchMockMovies, getMockMovieDetail, getMockCredits } from '../utils/mockTMDB';
import { tmdbClient } from '../utils/tmdbClient';
import { logger } from '../utils/logger';

/**
 * Interfaz de respuesta de películas de TMDB.
 * @interface MovieResponse
 */
export interface MovieResponse {
  page: number;
  results: unknown[];
  total_pages: number;
  total_results: number;
}

/**
 * Interfaz de créditos de película de TMDB.
 * @interface CreditsResponse
 */
export interface CreditsResponse {
  id: number;
  cast: unknown[];
  crew: unknown[];
}

/**
 * Repositorio que maneja las operaciones de películas con TMDB.
 * Soporta modo mock para desarrollo sin API.
 * @class MovieRepository
 */
class MovieRepository {
  /**
   * Obtiene las películas populares del momento.
   * @async
   * @method getPopular
   * @param {number} [page=1] - Número de página
   * @returns {Promise<MovieResponse>} Respuesta con lista de películas
   */
  async getPopular(page: number = 1): Promise<MovieResponse> {
    logger.info('MovieRepository.getPopular', { page, mockMode: config.mockMode });

    if (config.mockMode) {
      const result = getMockMovies(page, 20);
      return { ...result, page };
    }

    return tmdbClient.get<MovieResponse>('/movie/popular', { page: page.toString() });
  }

  /**
   * Busca películas por título.
   * @async
   * @method search
   * @param {string} query - Término de búsqueda
   * @param {number} [page=1] - Número de página
   * @returns {Promise<MovieResponse>} Respuesta con resultados de búsqueda
   */
  async search(query: string, page: number = 1): Promise<MovieResponse> {
    logger.info('MovieRepository.search', { query, page, mockMode: config.mockMode });

    if (config.mockMode) {
      const result = searchMockMovies(query);
      return { ...result, page };
    }

    return tmdbClient.get<MovieResponse>('/search/movie', {
      query,
      page: page.toString(),
    });
  }

  /**
   * Obtiene el detalle de una película y sus créditos.
   * @async
   * @method getById
   * @param {number} id - ID de la película
   * @returns {Promise<{movie: unknown, credits: unknown}>} Detalle y créditos
   */
  async getById(id: number): Promise<{ movie: unknown; credits: unknown }> {
    logger.info('MovieRepository.getById', { id, mockMode: config.mockMode });

    if (config.mockMode) {
      const movie = getMockMovieDetail(id);
      if (!movie) {
        throw new Error('Movie not found');
      }
      const credits = getMockCredits(id);
      return { movie, credits };
    }

    const [movie, credits] = await Promise.all([
      tmdbClient.get(`/movie/${id}`),
      tmdbClient.get(`/movie/${id}/credits`),
    ]);

    return { movie, credits: credits as CreditsResponse };
  }

  /**
   * Obtiene las reseñas de una película.
   * @async
   * @method getReviews
   * @param {number} movieId - ID de la película
   * @returns {Promise<unknown[]>} Lista de reseñas
   */
  async getReviews(movieId: number): Promise<unknown[]> {
    logger.info('MovieRepository.getReviews', { movieId, mockMode: config.mockMode });

    if (config.mockMode) {
      return [];
    }

    const response = await tmdbClient.get(`/movie/${movieId}/reviews`);
    return (response as { results: unknown[] }).results;
  }
}

export const movieRepository = new MovieRepository();