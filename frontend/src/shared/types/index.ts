/**
 * @fileoverview Definición de tipos de datos de la aplicación
 * @module shared/types
 */

/**
 * Tipo de medio para favoritos y reseñas.
 */
export type MediaType = 'MOVIE' | 'TV';

/**
 * Representa un usuario del sistema.
 * @interface User
 */
export interface User {
  id: number;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  isBanned: boolean;
  createdAt: string;
}

/**
 * Representa una película de TMDB.
 * @interface Movie
 */
export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
}

/**
 * Representa el detalle de una película con información extendida.
 * @interface MovieDetail
 */
export interface MovieDetail extends Movie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
  status: string;
  tagline: string | null;
  production_companies: { id: number; name: string }[];
}

/**
 * Representa los créditos (reparto y equipo) de una película.
 * @interface Credits
 */
export interface Credits {
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
 * Respuesta de paginación de lista de películas.
 * @interface MovieResponse
 */
export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

/**
 * Representa una serie de TV de TMDB.
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
 * Representa el detalle de una serie de TV.
 * @interface TvShowDetail
 */
export interface TvShowDetail extends TvShow {
  genres: { id: number; name: string }[];
  tagline: string | null;
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  created_by: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string | null }[];
}

/**
 * Representa los créditos de una serie de TV.
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
 * Respuesta de paginación de series de TV.
 * @interface TvResponse
 */
export interface TvResponse {
  page: number;
  results: TvShow[];
  total_pages: number;
  total_results: number;
}

/**
 * Representa una reseña.
 * @interface Review
 */
export interface Review {
  id: number;
  mediaId: number;
  mediaType: MediaType;
  content: string;
  rating: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
  };
}

/**
 * Representa un favorito.
 * @interface Favorite
 */
export interface Favorite {
  id: number;
  mediaId: number;
  mediaType: MediaType;
  createdAt: string;
}

/**
 * Respuesta de autenticación.
 * @interface AuthResponse
 */
export interface AuthResponse {
  success: boolean;
  data?: User;
  message?: string;
}

/**
 * Representa un error de la API.
 * @interface ApiError
 */
export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

/**
 * Respuesta de búsqueda unificada.
 * @interface SearchAllResponse
 */
export interface SearchAllResponse {
  movies: MovieResponse;
  tv: TvResponse;
}