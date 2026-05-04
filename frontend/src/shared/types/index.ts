export interface User {
  id: number;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  isBanned: boolean;
}

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

export interface MovieDetail extends Movie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
  status: string;
  tagline: string | null;
  production_companies: { id: number; name: string }[];
}

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

export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

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

export interface Favorite {
  id: number;
  movieId: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data?: User;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}