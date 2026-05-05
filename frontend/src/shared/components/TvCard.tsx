/**
 * @fileoverview Componente de tarjeta de serie de TV
 * @module shared/components/TvCard
 */

import { Link } from 'react-router-dom';
import type { TvShow } from '../types';
import styles from './TvCard.module.css';

interface TvCardProps {
  tvShow: TvShow;
}

const IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p';

export default function TvCard({ tvShow }: TvCardProps) {
  const posterUrl = tvShow.poster_path
    ? `${IMAGE_BASE_URL}/w342${tvShow.poster_path}`
    : '/placeholder-poster.svg';

  const year = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';

  return (
    <Link to={`/tv/${tvShow.id}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        <img src={posterUrl} alt={tvShow.name} className={styles.image} loading="lazy" />
        <div className={styles.overlay}>
          <span className={styles.rating}>
            {tvShow.vote_average.toFixed(1)}
          </span>
        </div>
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{tvShow.name}</h3>
        {year && <span className={styles.year}>{year}</span>}
      </div>
    </Link>
  );
}