/**
 * @fileoverview Página de detalle de película
 * @module pages/MovieDetailPage
 */

import { useParams } from 'react-router-dom';
import { useMovieDetail } from '../shared/hooks/useMovies';
import { useAuth } from '../shared/hooks/useAuth';
import Button from '../shared/components/Button';
import styles from './MovieDetailPage.module.css';

const IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);
  const { movie, credits, reviews, isLoading, error } = useMovieDetail(movieId);
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Cargando detalles...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className={styles.error}>
        <p>Error al cargar la película</p>
      </div>
    );
  }

  const backdropUrl = movie.backdrop_path
    ? `${IMAGE_BASE_URL}/w1280${movie.backdrop_path}`
    : null;

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
    : '/placeholder-poster.svg';

  const director = credits?.crew.find((c) => c.job === 'Director');
  const cast = credits?.cast.slice(0, 5);

  return (
    <div className={styles.detail}>
      {backdropUrl && (
        <div className={styles.backdrop}>
          <img src={backdropUrl} alt={movie.title} className={styles.backdropImg} />
          <div className={styles.backdropOverlay}></div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.posterWrapper}>
          <img src={posterUrl} alt={movie.title} className={styles.poster} />
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{movie.title}</h1>

          {movie.tagline && (
            <p className={styles.tagline}>"{movie.tagline}"</p>
          )}

          <div className={styles.meta}>
            <span className={styles.rating}>
              ★ {movie.vote_average.toFixed(1)}
            </span>
            <span className={styles.year}>
              {movie.release_date?.split('-')[0]}
            </span>
            {movie.runtime && (
              <span className={styles.runtime}>{movie.runtime} min</span>
            )}
          </div>

          <div className={styles.genres}>
            {movie.genres?.map((genre) => (
              <span key={genre.id} className={styles.genre}>
                {genre.name}
              </span>
            ))}
          </div>

          <div className={styles.actions}>
            {isAuthenticated && (
              <>
                <Button variant="primary">Agregar a Favoritos</Button>
                <Button variant="secondary">Escribir Reseña</Button>
              </>
            )}
          </div>

          <div className={styles.overview}>
            <h3>Sinopsis</h3>
            <p>{movie.overview}</p>
          </div>

          {director && (
            <div className={styles.crew}>
              <h3>Director</h3>
              <p>{director.name}</p>
            </div>
          )}

          {cast && cast.length > 0 && (
            <div className={styles.cast}>
              <h3>Reparto</h3>
              <div className={styles.castList}>
                {cast.map((actor) => (
                  <div key={actor.id} className={styles.actor}>
                    <div className={styles.actorImg}>
                      {actor.profile_path ? (
                        <img
                          src={`${IMAGE_BASE_URL}/w185${actor.profile_path}`}
                          alt={actor.name}
                        />
                      ) : (
                        <div className={styles.actorPlaceholder}></div>
                      )}
                    </div>
                    <span className={styles.actorName}>{actor.name}</span>
                    <span className={styles.actorCharacter}>{actor.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews && reviews.length > 0 && (
            <div className={styles.reviews}>
              <h3>Reseñas</h3>
              {reviews.map((review) => (
                <div key={review.id} className={styles.review}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewUser}>{review.user.username}</span>
                    <span className={styles.reviewRating}>★ {review.rating}/5</span>
                  </div>
                  <p className={styles.reviewContent}>{review.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}