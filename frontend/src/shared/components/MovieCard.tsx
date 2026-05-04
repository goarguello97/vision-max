/**
 * @fileoverview Componente de tarjeta de película
 * @module shared/components/MovieCard
 */

import { Link } from 'react-router-dom';
import type { Movie } from '../types';
import styles from './MovieCard.module.css';

/**
 * Props del componente MovieCard.
 * @interface MovieCardProps
 */
interface MovieCardProps {
  movie: Movie;
}

const IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p';

export default function MovieCard({ movie }: MovieCardProps) {
  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}/w342${movie.poster_path}`
    : '/placeholder-poster.svg';

  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

  return (
    <Link to={`/movie/${movie.id}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        <img src={posterUrl} alt={movie.title} className={styles.image} loading="lazy" />
        <div className={styles.overlay}>
          <span className={styles.rating}>
            {movie.vote_average.toFixed(1)}
          </span>
        </div>
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{movie.title}</h3>
        {year && <span className={styles.year}>{year}</span>}
      </div>
    </Link>
  );
}