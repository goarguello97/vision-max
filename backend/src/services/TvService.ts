/**
 * @fileoverview Servicio de series de TV para obtener datos de TMDB
 * @module services/TvService
 */

import { tvRepository } from '../repositories/TvRepository';
import { NotFoundError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Interfaz que representa la respuesta paginada de series de TV.
 * @interface TvListResponse
 */
export interface TvListResponse {
  page: number;
  results: TvShow[];
  total_pages: number;
  total_results: number;
}

/**
 * Interfaz que representa una serie de TV básica.
 * @interface TvShow
 */
export interface TvShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  original_name: string;
  popularity: number;
}

/**
 * Interfaz que representa los detalles completos de una serie de TV.
 * @interface TvShowDetail
 */
export interface TvShowDetail extends TvShow {
  genres: { id: number; name: string }[];
  tagline: string | null;
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  created_by: {
    id: number;
    name: string;
  }[];
  networks: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
}

/**
 * Interfaz que representa los créditos de una serie de TV.
 * @interface TvCredits
 */
export interface TvCredits {
  id: number;
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
  }[];
}

/**
 * Servicio que maneja las operaciones relacionadas con series de TV.
 * @class TvService
 */
class TvService {
  /**
   * Obtiene las series de TV populares.
   * @async
   * @method getPopular
   * @param {number} [page=1] - Número de página
   * @returns {Promise<TvListResponse>} Lista de series populares
   */
  async getPopular(page: number = 1): Promise<TvListResponse> {
    logger.info('Fetching popular TV shows', { page });

    const result = await tvRepository.getPopular(page);
    return {
      page: result.page,
      results: result.results as TvShow[],
      total_pages: result.total_pages,
      total_results: result.total_results,
    };
  }

  /**
   * Busca series de TV por título.
   * @async
   * @method search
   * @param {string} query - Término de búsqueda
   * @param {number} [page=1] - Número de página
   * @returns {Promise<TvListResponse>} Lista de series que coinciden
   */
  async search(query: string, page: number = 1): Promise<TvListResponse> {
    logger.info('Searching TV shows', { query, page });

    if (!query || query.trim().length === 0) {
      return this.getPopular(page);
    }

    const result = await tvRepository.search(query, page);
    return {
      page: result.page,
      results: result.results as TvShow[],
      total_pages: result.total_pages,
      total_results: result.total_results,
    };
  }

  /**
   * Obtiene los detalles de una serie específica.
   * @async
   * @method getById
   * @param {number} id - ID único de la serie en TMDB
   * @returns {Promise<{tv: TvShowDetail, credits: TvCredits}>} Detalles y créditos
   * @throws {NotFoundError} Si la serie no existe
   */
  async getById(id: number): Promise<{ tv: TvShowDetail; credits: TvCredits }> {
    logger.info('Fetching TV show details', { id });

    const result = await tvRepository.getById(id);
    return {
      tv: result.tv as TvShowDetail,
      credits: result.credits as TvCredits,
    };
  }

  /**
   * Obtiene las reseñas de una serie.
   * @async
   * @method getReviews
   * @param {number} tvId - ID único de la serie en TMDB
   * @returns {Promise<{id: number, author: string, content: string, rating: number}[]>} Array de reseñas
   */
  async getReviews(tvId: number): Promise<{ id: number; author: string; content: string; rating: number }[]> {
    logger.info('Fetching TV show reviews', { tvId });

    const reviews = await tvRepository.getReviews(tvId);
    return reviews as { id: number; author: string; content: string; rating: number }[];
  }
}

export const tvService = new TvService();