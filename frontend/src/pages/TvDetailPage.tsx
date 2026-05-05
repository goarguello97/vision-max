/**
 * @fileoverview Página de detalle de serie de TV
 * @module pages/TvDetailPage
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTvDetail } from '../shared/hooks/useTvShows';
import { useAuth } from '../shared/hooks/useAuth';
import { favoritesApi, reviewsApi } from '../shared/utils/api';
import Button from '../shared/components/Button';
import ReviewForm from '../shared/components/ReviewForm';
import type { Review } from '../shared/types';
import styles from './TvDetailPage.module.css';

const IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p';

export default function TvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tvId = Number(id);
  const { tv, credits, reviews, isLoading, error } = useTvDetail(tvId);
  const { isAuthenticated, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user && tvId) {
      favoritesApi.getAll(1, 100, 'TV').then((res) => {
        if (res.data.success) {
          const ids = res.data.data.favorites.map((f) => f.mediaId);
          setIsFavorite(ids.includes(tvId));
        }
      });

      reviewsApi.getUserReviewForMedia(tvId, 'TV').then((res) => {
        if (res.data.success && res.data.data) {
          setUserReview(res.data.data);
        }
      });
    }
  }, [isAuthenticated, user, tvId]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) return;
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesApi.remove(tvId, 'TV');
        setIsFavorite(false);
      } else {
        await favoritesApi.add(tvId, 'TV');
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

  if (error || !tv) {
    return (
      <div className={styles.error}>
        <p>Error al cargar la serie</p>
      </div>
    );
  }

  const backdropUrl = tv.backdrop_path
    ? `${IMAGE_BASE_URL}/w1280${tv.backdrop_path}`
    : null;

  const posterUrl = tv.poster_path
    ? `${IMAGE_BASE_URL}/w500${tv.poster_path}`
    : '/placeholder-poster.svg';

  const creator = credits?.crew.find((c) => c.job === 'Creator') || credits?.crew.find((c) => c.job === 'Director');
  const cast = credits?.cast.slice(0, 5);

  return (
    <div className={styles.detail}>
      {backdropUrl && (
        <div className={styles.backdrop}>
          <img src={backdropUrl} alt={tv.name} className={styles.backdropImg} />
          <div className={styles.backdropOverlay}></div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.posterWrapper}>
          <img src={posterUrl} alt={tv.name} className={styles.poster} />
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{tv.name}</h1>

          {tv.tagline && (
            <p className={styles.tagline}>"{tv.tagline}"</p>
          )}

          <div className={styles.meta}>
            <span className={styles.rating}>
              ★ {tv.vote_average.toFixed(1)}
            </span>
            <span className={styles.year}>
              {tv.first_air_date?.split('-')[0]}
            </span>
            <span className={styles.seasons}>
              {tv.number_of_seasons} {tv.number_of_seasons === 1 ? 'temporada' : 'temporadas'}
            </span>
            <span className={styles.episodes}>
              {tv.number_of_episodes} episodios
            </span>
          </div>

          <div className={styles.genres}>
            {tv.genres?.map((genre) => (
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
            <p>{tv.overview}</p>
          </div>

          {creator && (
            <div className={styles.crew}>
              <h3>Creador</h3>
              <p>{creator.name}</p>
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
                mediaId={tvId}
                mediaType="TV"
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