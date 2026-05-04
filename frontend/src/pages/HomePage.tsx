import { useState } from 'react';
import { useMovies } from '../shared/hooks/useMovies';
import MovieCard from '../shared/components/MovieCard';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { movies, isLoading, error, loadMovies, searchMovies } = useMovies();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMovies(searchQuery);
    } else {
      loadMovies();
    }
  };

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Descubre el <span className={styles.accent}>Universo Cinematográfico</span>
          </h1>
          <p className={styles.subtitle}>
            Explora, Guarda y Reseña tus películas favoritas
          </p>
        </div>
        <div className={styles.searchWrapper}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Buscar películas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>
        </div>
      </section>

      <section className={styles.catalog}>
        <h2 className={styles.sectionTitle}>Películas Populares</h2>

        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando películas...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => loadMovies()}>Reintentar</button>
          </div>
        )}

        {!isLoading && !error && (
          <div className={styles.grid}>
            {movies.map((movie, index) => (
              <div
                key={movie.id}
                className={styles.cardWrapper}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && movies.length === 0 && (
          <div className={styles.empty}>
            <p>No se encontraron películas</p>
          </div>
        )}
      </section>
    </div>
  );
}