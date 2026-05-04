import { useEffect, useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { favoritesApi } from '../shared/utils/api';
import MovieCard from '../shared/components/MovieCard';
import type { Movie } from '../shared/types';
import styles from './FavoritesPage.module.css';

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      favoritesApi.getAll()
        .then(() => {
          // Por ahora solo obtenemos los IDs de favoritos
          // En una implementación real, necesitaríamos obtener los detalles de cada película
          setMovies([]);
        })
        .catch(() => setMovies([]))
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated]);

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

      {isLoading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : movies.length === 0 ? (
        <div className={styles.empty}>
          <p>No tienes películas en favoritos aún</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}