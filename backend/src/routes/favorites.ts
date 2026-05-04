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
 * @swagger
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: Get user favorites
 *     description: Returns the authenticated user's favorite movies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of favorite movies
 */
router.get('/', favoriteController.getFavorites);

/**
 * @swagger
 * /favorites/{movieId}:
 *   post:
 *     tags: [Favorites]
 *     summary: Add to favorites
 *     description: Adds a movie to user's favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         description: TMDB movie ID
 *     responses:
 *       201:
 *         description: Added to favorites
 *       400:
 *         description: Already in favorites
 */
router.post('/:movieId', favoriteController.addFavorite);

/**
 * @swagger
 * /favorites/{movieId}:
 *   delete:
 *     tags: [Favorites]
 *     summary: Remove from favorites
 *     description: Removes a movie from user's favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         description: TMDB movie ID
 *     responses:
 *       200:
 *         description: Removed from favorites
 */
router.delete('/:movieId', favoriteController.removeFavorite);

export default router;