/**
 * @fileoverview Servicio de películas para obtener datos de TMDB
 * @module services/MovieService
 */

import config from '../config';
import { getMockMovies, searchMockMovies, getMockMovieDetail, getMockCredits, MockMovie, MockMovieDetail, MockCredits } from '../utils/mockTMDB';
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
 * Utiliza datos mock cuando MOCK_MODE está habilitado.
 * @class MovieService
 */
class MovieService {
  /**
   * Obtiene las películas populares del momento.
   * @async
   * @method getPopular
   * @param {number} [page=1] - Número de página
   * @returns {Promise<MovieListResponse>} Lista de películas populares
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

    throw new Error('Real TMDB API not implemented yet');
  }

  /**
   * Busca películas por título.
   * @async
   * @method search
   * @param {string} query - Término de búsqueda
   * @param {number} [page=1] - Número de página
   * @returns {Promise<MovieListResponse>} Lista de películas que coinciden
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

    throw new Error('Real TMDB API not implemented yet');
  }

  /**
   * Obtiene los detalles de una película específica.
   * @async
   * @method getById
   * @param {number} id - ID de la película
   * @returns {Promise<{movie: MovieDetail, credits: Credits}>} Detalles y créditos
   * @throws {NotFoundError} Si la película no existe
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

    throw new Error('Real TMDB API not implemented yet');
  }

  /**
   * Obtiene las reseñas de una película.
   * @async
   * @method getReviews
   * @param {number} movieId - ID de la película
   * @returns {Promise<{id: number, author: string, content: string, rating: number}[]>} Lista de reseñas
   */
  async getReviews(movieId: number): Promise<{ id: number; author: string; content: string; rating: number }[]> {
    logger.info('Fetching movie reviews', { movieId });

    if (config.mockMode) {
      return [];
    }

    return [];
  }
}

export const movieService = new MovieService();