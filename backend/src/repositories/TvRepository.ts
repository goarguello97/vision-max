/**
 * @fileoverview Repositorio para operaciones de series de TV (TMDB API)
 * @module repositories/TvRepository
 */

import config from '../config';
import { tmdbClient } from '../utils/tmdbClient';
import { logger } from '../utils/logger';

/**
 * Interfaz de respuesta de series de TV de TMDB.
 * @interface TvResponse
 */
export interface TvResponse {
  page: number;
  results: unknown[];
  total_pages: number;
  total_results: number;
}

/**
 * Interfaz de créditos de serie de TV de TMDB.
 * @interface TvCreditsResponse
 */
export interface TvCreditsResponse {
  id: number;
  cast: unknown[];
  crew: unknown[];
}

/**
 * Repositorio que maneja las operaciones de series de TV con la API de TMDB.
 * Implementa el patrón Repository para abstraer el acceso a datos.
 * @class TvRepository
 */
class TvRepository {
  /**
   * Obtiene las series de TV populares del momento.
   * @async
   * @method getPopular
   * @param {number} [page=1] - Número de página
   * @returns {Promise<TvResponse>} Respuesta cruda de TMDB
   */
  async getPopular(page: number = 1): Promise<TvResponse> {
    logger.info('TvRepository.getPopular', { page, mockMode: config.mockMode });
    return tmdbClient.get<TvResponse>('/tv/popular', { page: page.toString() });
  }

  /**
   * Busca series de TV por título.
   * @async
   * @method search
   * @param {string} query - Término de búsqueda
   * @param {number} [page=1] - Número de página
   * @returns {Promise<TvResponse>} Respuesta cruda de TMDB
   */
  async search(query: string, page: number = 1): Promise<TvResponse> {
    logger.info('TvRepository.search', { query, page, mockMode: config.mockMode });
    return tmdbClient.get<TvResponse>('/search/tv', {
      query,
      page: page.toString(),
    });
  }

  /**
   * Obtiene el detalle de una serie y sus créditos.
   * @async
   * @method getById
   * @param {number} id - ID de la serie en TMDB
   * @returns {Promise<{tv: unknown, credits: unknown}>} Detalle y créditos
   */
  async getById(id: number): Promise<{ tv: unknown; credits: unknown }> {
    logger.info('TvRepository.getById', { id, mockMode: config.mockMode });

    const [tv, credits] = await Promise.all([
      tmdbClient.get(`/tv/${id}`),
      tmdbClient.get(`/tv/${id}/credits`),
    ]);

    return { tv, credits: credits as TvCreditsResponse };
  }

  /**
   * Obtiene las reseñas de una serie.
   * @async
   * @method getReviews
   * @param {number} tvId - ID de la serie en TMDB
   * @returns {Promise<unknown[]>} Array de reseñas
   */
  async getReviews(tvId: number): Promise<unknown[]> {
    logger.info('TvRepository.getReviews', { tvId, mockMode: config.mockMode });
    const response = await tmdbClient.get(`/tv/${tvId}/reviews`);
    return (response as { results: unknown[] }).results;
  }
}

export const tvRepository = new TvRepository();