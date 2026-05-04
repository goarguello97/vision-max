/**
 * @fileoverview Router de reseñas de películas
 * @module routes/reviews
 */

import { Router } from 'express';
import { reviewController } from '../controllers/ReviewController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @route POST /reviews
 * @description Crea una nueva reseña
 * @requires auth - Requiere autenticación
 */
router.post('/', authMiddleware, reviewController.create);

/**
 * @route PUT /reviews/:id
 * @description Actualiza una reseña existente
 * @param {number} id - ID de la reseña
 * @requires auth - Requiere autenticación
 */
router.put('/:id', authMiddleware, reviewController.update);

/**
 * @route DELETE /reviews/:id
 * @description Elimina una reseña
 * @param {number} id - ID de la reseña
 * @requires auth - Requiere autenticación
 */
router.delete('/:id', authMiddleware, reviewController.delete);

export default router;