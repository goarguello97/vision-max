/**
 * @fileoverview Página de detalle de película
 * @module pages/MovieDetailPage
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useMovieDetail } from '../shared/hooks/useMovies';
import { useAuth } from '../shared/hooks/useAuth';
import { favoritesApi, reviewsApi } from '../shared/utils/api';
import Button from '../shared/components/Button';
import ReviewForm from '../shared/components/ReviewForm';
import type { Review } from '../shared/types';
import styles from './MovieDetailPage.module.css';

const IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);
  const { movie, credits, reviews, isLoading, error } = useMovieDetail(movieId);
  const { isAuthenticated, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user && movieId) {
      favoritesApi.getAll(1, 100, 'MOVIE').then((res) => {
        if (res.data.success) {
          const ids = res.data.data.favorites.map((f) => f.mediaId);
          setIsFavorite(ids.includes(movieId));
        }
      });

      reviewsApi.getUserReviewForMedia(movieId, 'MOVIE').then((res) => {
        if (res.data.success && res.data.data) {
          setUserReview(res.data.data);
        }
      });
    }
  }, [isAuthenticated, user, movieId]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) return;
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesApi.remove(movieId, 'MOVIE');
        setIsFavorite(false);
      } else {
        await favoritesApi.add(movieId, 'MOVIE');
        setIsFavorite(true);
      }
    } catch {
      // Handle error silently
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleWriteReview = () => {
    setShowReviewForm(true);
    setTimeout(() => {
      reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleReviewSuccess = (review: Review) => {
    setUserReview(review);
    setShowReviewForm(false);
  };

  const handleCancelReview = () => {
    setShowReviewForm(false);
  };

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
                <Button
                  variant={isFavorite ? 'secondary' : 'primary'}
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                >
                  {isFavorite ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}
                </Button>
                <Button variant="secondary" onClick={handleWriteReview}>
                  {userReview ? 'Editar Reseña' : 'Escribir Reseña'}
                </Button>
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

          {(showReviewForm || userReview) && (
            <div ref={reviewsRef}>
              <ReviewForm
                mediaId={movieId}
                mediaType="MOVIE"
                initialReview={userReview}
                onSuccess={handleReviewSuccess}
                onCancel={userReview ? handleCancelReview : undefined}
              />
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