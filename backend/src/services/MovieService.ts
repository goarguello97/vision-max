/**
 * @fileoverview Servicio de películas para obtener datos de TMDB
 * @module services/MovieService
 */

import config from '../config';
import { getMockMovies, searchMockMovies, getMockMovieDetail, getMockCredits, MockMovie, MockMovieDetail, MockCredits } from '../utils/mockTMDB';
import { movieRepository } from '../repositories/MovieRepository';
import { NotFoundError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Interfaz que representa la respuesta paginada de películas.
 * @interface MovieListResponse
 */
export interface MovieListResponse {
  /** Número de página actual */
  page: number;
  /** Array de películas */
  results: Movie[];
  /** Total de páginas disponibles */
  total_pages: number;
  /** Total de resultados */
  total_results: number;
}

/**
 * Interfaz que representa una película básica.
 * @interface Movie
 */
export interface Movie {
  /** ID único de la película */
  id: number;
  /** Título de la película */
  title: string;
  /** Sinopsis de la película */
  overview: string;
  /** Ruta del póster */
  poster_path: string | null;
  /** Ruta de la imagen de fondo */
  backdrop_path: string | null;
  /** Fecha de lanzamiento */
  release_date: string;
  /** Puntuación promedio */
  vote_average: number;
  /** Cantidad de votos */
  vote_count: number;
  /** IDs de géneros */
  genre_ids: number[];
  /** Si es para adultos */
  adult: boolean;
  /** Idioma original */
  original_language: string;
  /** Título original */
  original_title: string;
  /** Popularidad */
  popularity: number;
}

/**
 * Interfaz que representa los detalles completos de una película.
 * @interface MovieDetail
 */
export interface MovieDetail extends Movie {
  /** Duración en minutos */
  runtime: number | null;
  /** Géneros de la película */
  genres: { id: number; name: string }[];
  /** Presupuesto */
  budget: number;
  /** Ingresos */
  revenue: number;
  /** Estado de la película */
  status: string;
  /** Tagline de la película */
  tagline: string | null;
  /** Compañías de producción */
  production_companies: { id: number; name: string }[];
}

/**
 * Interfaz que representa los créditos de una película (reparto y equipo).
 * @interface Credits
 */
export interface Credits {
  /** ID de la película */
  id: number;
  /** Reparto de la película */
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  /** Equipo técnico */
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
  }[];
}

/**
 * Servicio que maneja las operaciones relacionadas con películas.
 * Utiliza datos mock cuando MOCK_MODE está habilitado (desarrollo local sin API key).
 * Cuando MOCK_MODE=false, delega las llamadas HTTP al MovieRepository que consulta la API de TMDB.
 * @class MovieService
 * @see {@link https://developer.themoviedb.org/reference} TMDB API Reference
 */
class MovieService {
  /**
   * Obtiene las películas populares del momento.
   * Cuando MOCK_MODE está deshabilitado, consulta el endpoint /movie/popular de TMDB.
   * @async
   * @method getPopular
   * @param {number} [page=1] - Número de página para paginación
   * @returns {Promise<MovieListResponse>} Lista de películas populares con paginación
   * @see {@link https://developer.themoviedb.org/reference/movie-popular-list} TMDB API - Movie Popular List
   * @example
   * // Con mock mode (desarrollo sin API key)
   * const movies = await movieService.getPopular(1);
   * // Con TMDB real (MOCK_MODE=false)
   * const movies = await movieService.getPopular(2);
   */
  async getPopular(page: number = 1): Promise<MovieListResponse> {
    logger.info('Fetching popular movies', { page, mockMode: config.mockMode });

    if (config.mockMode) {
      const mockResult = getMockMovies(page, 20);
      return {
        page,
        results: mockResult.results as Movie[],
        total_pages: mockResult.total_pages,
        total_results: mockResult.total_results,
      };
    }

    const result = await movieRepository.getPopular(page);
    return {
      page: result.page,
      results: result.results as Movie[],
      total_pages: result.total_pages,
      total_results: result.total_results,
    };
  }

  /**
   * Busca películas por título en TMDB.
   * Cuando MOCK_MODE está deshabilitado, consulta el endpoint /search/movie de TMDB.
   * Si la query está vacía, delega a getPopular().
   * @async
   * @method search
   * @param {string} query - Término de búsqueda (título de película)
   * @param {number} [page=1] - Número de página para paginación
   * @returns {Promise<MovieListResponse>} Lista de películas que coinciden con la búsqueda
   * @see {@link https://developer.themoviedb.org/reference/search-movie} TMDB API - Search Movies
   * @example
   * const results = await movieService.search('Fight Club');
   * const results = await movieService.search('Inception', 2);
   */
  async search(query: string, page: number = 1): Promise<MovieListResponse> {
    logger.info('Searching movies', { query, page, mockMode: config.mockMode });

    if (!query || query.trim().length === 0) {
      return this.getPopular(page);
    }

    if (config.mockMode) {
      const mockResult = searchMockMovies(query);
      return {
        page: 1,
        results: mockResult.results as Movie[],
        total_pages: mockResult.total_pages,
        total_results: mockResult.total_results,
      };
    }

    const result = await movieRepository.search(query, page);
    return {
      page: result.page,
      results: result.results as Movie[],
      total_pages: result.total_pages,
      total_results: result.total_results,
    };
  }

  /**
   * Obtiene los detalles de una película específica, incluyendo créditos.
   * Cuando MOCK_MODE está deshabilitado, consulta los endpoints /movie/{id} y /movie/{id}/credits de TMDB.
   * Realiza las dos consultas en paralelo para optimizar el rendimiento.
   * @async
   * @method getById
   * @param {number} id - ID único de la película en TMDB
   * @returns {Promise<{movie: MovieDetail, credits: Credits}>} Objeto con detalles de la película y créditos (reparto/equipo)
   * @throws {NotFoundError} Si la película no existe o la API de TMDB retorna error
   * @see {@link https://developer.themoviedb.org/reference/movie-details} TMDB API - Movie Details
   * @see {@link https://developer.themoviedb.org/reference/movie-credits} TMDB API - Movie Credits
   * @example
   * const { movie, credits } = await movieService.getById(550);
   * console.log(movie.title, credits.cast[0].name);
   */
  async getById(id: number): Promise<{ movie: MovieDetail; credits: Credits }> {
    logger.info('Fetching movie details', { id, mockMode: config.mockMode });

    if (config.mockMode) {
      const movie = getMockMovieDetail(id);
      if (!movie) {
        throw new NotFoundError(`Película con ID ${id} no encontrada`);
      }

      const credits = getMockCredits(id);
      return { movie: movie as MovieDetail, credits };
    }

    const result = await movieRepository.getById(id);
    return {
      movie: result.movie as MovieDetail,
      credits: result.credits as Credits,
    };
  }

  /**
   * Obtiene las reseñas de una película específica.
   * Cuando MOCK_MODE está deshabilitado, consulta el endpoint /movie/{id}/reviews de TMDB.
   * @async
   * @method getReviews
   * @param {number} movieId - ID único de la película en TMDB
   * @returns {Promise<{id: number, author: string, content: string, rating: number}[]>} Array de reseñas con autor y contenido
   * @see {@link https://developer.themoviedb.org/reference/movie-reviews} TMDB API - Movie Reviews
   * @example
   * const reviews = await movieService.getReviews(550);
   * reviews.forEach(r => console.log(`${r.author}: ${r.content}`));
   */
  async getReviews(movieId: number): Promise<{ id: number; author: string; content: string; rating: number }[]> {
    logger.info('Fetching movie reviews', { movieId });

    if (config.mockMode) {
      return [];
    }

    const reviews = await movieRepository.getReviews(movieId);
    return reviews as { id: number; author: string; content: string; rating: number }[];
  }
}

export const movieService = new MovieService();