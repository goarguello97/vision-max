/**
 * @fileoverview Página de favoritos del usuario
 * @module pages/FavoritesPage
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { favoritesApi } from '../shared/utils/api';
import MovieCard from '../shared/components/MovieCard';
import TvCard from '../shared/components/TvCard';
import type { Movie, TvShow } from '../shared/types';
import styles from './FavoritesPage.module.css';

type TabType = 'MOVIE' | 'TV';

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('MOVIE');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<TvShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      favoritesApi.getDetails(activeTab)
        .then((res) => {
          if (res.data.success) {
            if (activeTab === 'MOVIE') {
              setMovies(res.data.data.items as Movie[]);
            } else {
              setTvShows(res.data.data.items as TvShow[]);
            }
          }
        })
        .catch(() => {
          if (activeTab === 'MOVIE') {
            setMovies([]);
          } else {
            setTvShows([]);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, activeTab]);

  if (!isAuthenticated) {
    return (
      <div className={styles.unauthorized}>
        <h2>Acceso denegado</h2>
        <p>Debes iniciar sesión para ver tus favoritos</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Mis Favoritos</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'MOVIE' ? styles.active : ''}`}
          onClick={() => setActiveTab('MOVIE')}
        >
          Películas
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'TV' ? styles.active : ''}`}
          onClick={() => setActiveTab('TV')}
        >
          Series TV
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : activeTab === 'MOVIE' && movies.length === 0 ? (
        <div className={styles.empty}>
          <p>No tienes películas en favoritos aún</p>
        </div>
      ) : activeTab === 'TV' && tvShows.length === 0 ? (
        <div className={styles.empty}>
          <p>No tienes series en favoritos aún</p>
        </div>
      ) : activeTab === 'MOVIE' ? (
        <div className={styles.grid}>
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {tvShows.map((tvShow) => (
            <TvCard key={tvShow.id} tvShow={tvShow} />
          ))}
        </div>
      )}
    </div>
  );
}