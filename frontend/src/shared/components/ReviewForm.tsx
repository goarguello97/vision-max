/**
 * @fileoverview Formulario inline para crear/editar reseñas
 * @module shared/components/ReviewForm
 */

import { useState } from 'react';
import { reviewsApi } from '../utils/api';
import type { MediaType, Review } from '../types';
import styles from './ReviewForm.module.css';

interface ReviewFormProps {
  mediaId: number;
  mediaType: MediaType;
  initialReview?: Review | null;
  onSuccess: (review: Review) => void;
  onCancel?: () => void;
}

export default function ReviewForm({ mediaId, mediaType, initialReview, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [content, setContent] = useState(initialReview?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Selecciona una puntuación');
      return;
    }
    if (content.trim().length === 0) {
      setError('Escribe tu reseña');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (initialReview) {
        const res = await reviewsApi.update(initialReview.id, { content, rating });
        if (res.data.success) {
          onSuccess({ ...initialReview, content, rating });
        }
      } else {
        const res = await reviewsApi.create({ mediaId, mediaType, content, rating });
        if (res.data.success) {
          const newReview: Review = {
            id: Date.now(),
            mediaId,
            mediaType,
            content,
            rating,
            isHidden: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: { id: 0, username: '' },
          };
          onSuccess(newReview);
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Error al guardar reseña');
      } else {
        setError('Error al guardar reseña');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h4 className={styles.title}>
        {initialReview ? 'Editar tu reseña' : 'Escribe tu reseña'}
      </h4>

      <div className={styles.ratingSection}>
        <span className={styles.label}>Tu puntuación:</span>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.star} ${star <= rating ? styles.active : ''}`}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <textarea
        className={styles.textarea}
        placeholder="Escribe tu reseña..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : initialReview ? 'Actualizar' : 'Publicar'}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}