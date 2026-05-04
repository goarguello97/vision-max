/**
 * @fileoverview Router de películas
 * @module routes/movies
 */

import { Router } from 'express';
import { movieController } from '../controllers/MovieController';

const router = Router();

/**
 * @route GET /movies
 * @description Obtiene las películas populares
 * @query {number} page - Número de página
 */
router.get('/', movieController.getPopular);

/**
 * @route GET /movies/search
 * @description Busca películas por título
 * @query {string} query - Término de búsqueda
 * @query {number} page - Número de página
 */
router.get('/search', movieController.search);

/**
 * @route GET /movies/:id
 * @description Obtiene los detalles de una película
 * @param {number} id - ID de la película
 */
router.get('/:id', movieController.getById);

/**
 * @route GET /movies/:id/reviews
 * @description Obtiene las reseñas de una película
 * @param {number} id - ID de la película
 */
router.get('/:id/reviews', movieController.getReviews);

export default router;