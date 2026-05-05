/**
 * @fileoverview Router principal de la aplicación
 * @module routes/index
 */

import { Router } from 'express';
import moviesRouter from './movies';
import tvRouter from './tv';
import searchRouter from './search';
import authRouter from './auth';
import favoritesRouter from './favorites';
import reviewsRouter from './reviews';
import adminRouter from './admin';

const router = Router();

/**
 * Rutas de autenticación (/auth)
 */
router.use('/auth', authRouter);

/**
 * Rutas de películas (/movies)
 */
router.use('/movies', moviesRouter);

/**
 * Rutas de series de TV (/tv)
 */
router.use('/tv', tvRouter);

/**
 * Rutas de búsqueda (/search)
 */
router.use('/search', searchRouter);

/**
 * Rutas de favoritos (/favorites)
 */
router.use('/favorites', favoritesRouter);

/**
 * Rutas de reseñas (/reviews)
 */
router.use('/reviews', reviewsRouter);

/**
 * Rutas de administración (/admin)
 */
router.use('/admin', adminRouter);

/**
 * Endpoint de verificación de salud del servicio
 * @route GET /health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'visionmax-api',
  });
});

export default router;