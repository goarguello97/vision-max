/**
 * @fileoverview Definición de tipos de datos de la aplicación
 * @module shared/types
 */

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
 * Representa una reseña de película.
 * @interface Review
 */
export interface Review {
  id: number;
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
 * Representa una película favorita de un usuario.
 * @interface Favorite
 */
export interface Favorite {
  id: number;
  movieId: number;
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