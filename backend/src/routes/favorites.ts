/**
 * @fileoverview Router de películas favoritas
 * @module routes/favorites
 */

import { Router } from 'express';
import { favoriteController } from '../controllers/FavoriteController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

/**
 * Todas las rutas de favoritos requieren autenticación
 */
router.use(authMiddleware);

/**
 * @route GET /favorites
 * @description Obtiene las películas favoritas del usuario
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * @requires auth - Requiere autenticación
 */
router.get('/', favoriteController.getFavorites);

/**
 * @route POST /favorites/:movieId
 * @description Agrega una película a favoritos
 * @param {number} movieId - ID de la película
 * @requires auth - Requiere autenticación
 */
router.post('/:movieId', favoriteController.addFavorite);

/**
 * @route DELETE /favorites/:movieId
 * @description Elimina una película de favoritos
 * @param {number} movieId - ID de la película
 * @requires auth - Requiere autenticación
 */
router.delete('/:movieId', favoriteController.removeFavorite);

export default router;