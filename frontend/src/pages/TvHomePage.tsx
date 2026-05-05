/**
 * @fileoverview Página de series de TV populares
 * @module pages/TvHomePage
 */

import { useState } from 'react';
import { useTvShows } from '../shared/hooks/useTvShows';
import TvCard from '../shared/components/TvCard';
import styles from './TvHomePage.module.css';

export default function TvHomePage() {
  const { tvShows, isLoading, error, loadTvShows, searchTvShows } = useTvShows();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchTvShows(searchQuery);
    } else {
      loadTvShows();
    }
  };

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Explora las <span className={styles.accent}>Mejores Series TV</span>
          </h1>
          <p className={styles.subtitle}>
            Descubre nuevos programas, sigue tus favoritos y más
          </p>
        </div>
        <div className={styles.searchWrapper}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Buscar series..."
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
        <h2 className={styles.sectionTitle}>Series Populares</h2>

        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando series...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => loadTvShows()}>Reintentar</button>
          </div>
        )}

        {!isLoading && !error && (
          <div className={styles.grid}>
            {tvShows.map((tvShow, index) => (
              <div
                key={tvShow.id}
                className={styles.cardWrapper}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TvCard tvShow={tvShow} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && tvShows.length === 0 && (
          <div className={styles.empty}>
            <p>No se encontraron series</p>
          </div>
        )}
      </section>
    </div>
  );
}