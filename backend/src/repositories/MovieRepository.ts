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
 * Repositorio que maneja las operaciones de películas con la API de TMDB.
 * Implementa el patrón Repository para abstraer el acceso a datos (mock o TMDB real).
 * Utiliza tmdbClient para realizar las peticiones HTTP a los endpoints de TMDB.
 * @class MovieRepository
 * @see {@link https://developer.themoviedb.org/reference} TMDB API Reference
 */
class MovieRepository {
  /**
   * Obtiene las películas populares del momento desde TMDB.
   * Consulta el endpoint GET /movie/popular con paginación.
   * @async
   * @method getPopular
   * @param {number} [page=1] - Número de página para paginación (default: 1)
   * @returns {Promise<MovieResponse>} Respuesta cruda de TMDB con lista de películas y metadatos de paginación
   * @throws {Error} Si la petición a TMDB falla o retorna error
   * @see {@link https://developer.themoviedb.org/reference/movie-popular-list} TMDB API - Movie Popular List
   * @example
   * const response = await movieRepository.getPopular(1);
   * console.log(response.results.length, response.total_pages);
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
   * Busca películas por título utilizando el endpoint /search/movie de TMDB.
   * @async
   * @method search
   * @param {string} query - Término de búsqueda (título de la película)
   * @param {number} [page=1] - Número de página para paginación (default: 1)
   * @returns {Promise<MovieResponse>} Respuesta cruda de TMDB con resultados de búsqueda y metadatos de paginación
   * @throws {Error} Si la query está vacía o la petición a TMDB falla
   * @see {@link https://developer.themoviedb.org/reference/search-movie} TMDB API - Search Movies
   * @example
   * const response = await movieRepository.search('Fight Club');
   * console.log(response.results[0].title);
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
   * Obtiene el detalle completo de una película y sus créditos (reparto/equipo).
   * Realiza dos peticiones en paralelo a los endpoints /movie/{id} y /movie/{id}/credits de TMDB.
   * @async
   * @method getById
   * @param {number} id - ID único de la película en TMDB
   * @returns {Promise<{movie: unknown, credits: unknown}>} Objeto con detalle de película y créditos sin procesar de TMDB
   * @throws {Error} Si la película no existe (TMDB retorna 404) o la petición falla
   * @see {@link https://developer.themoviedb.org/reference/movie-details} TMDB API - Movie Details
   * @see {@link https://developer.themoviedb.org/reference/movie-credits} TMDB API - Movie Credits
   * @example
   * const { movie, credits } = await movieRepository.getById(550);
   * const director = credits.crew.find(c => c.job === 'Director');
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
   * Obtiene las reseñas de una película específica desde TMDB.
   * Consulta el endpoint GET /movie/{id}/reviews.
   * @async
   * @method getReviews
   * @param {number} movieId - ID único de la película en TMDB
   * @returns {Promise<unknown[]>} Array de reseñas crudas de TMDB (sin transformar)
   * @throws {Error} Si la petición a TMDB falla
   * @see {@link https://developer.themoviedb.org/reference/movie-reviews} TMDB API - Movie Reviews
   * @example
   * const reviews = await movieRepository.getReviews(550);
   * reviews.forEach(r => console.log(r.author, r.content));
   */
  async getReviews(movieId: number): Promise<unknown[]> {
    logger.info('MovieRepository.getReviews', { movieId, mockMode: config.mockMode });

    if (config.mockMode) {
      return [];
    }

    const response = await tmdbClient.get(`/movie/${movieId}/reviews`);
    return (response as { results: unknown[] }).results;
  }

  async getByIds(ids: number[]): Promise<unknown[]> {
    logger.info('MovieRepository.getByIds', { ids: ids.length, mockMode: config.mockMode });

    if (config.mockMode || ids.length === 0) {
      return [];
    }

    const results = await Promise.all(
      ids.map((id) => tmdbClient.get(`/movie/${id}`))
    );

    return results;
  }
}

export const movieRepository = new MovieRepository();