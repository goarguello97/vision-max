/**
 * @fileoverview Router de películas
 * @module routes/movies
 */

import { Router } from 'express';
import { movieController } from '../controllers/MovieController';

const router = Router();

/**
 * @swagger
 * /movies:
 *   get:
 *     tags: [Movies]
 *     summary: Get popular movies
 *     description: Returns a list of popular movies from TMDB
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of popular movies
 */
router.get('/', movieController.getPopular);

/**
 * @swagger
 * /movies/search:
 *   get:
 *     tags: [Movies]
 *     summary: Search movies
 *     description: Search movies by title
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', movieController.search);

/**
 * @swagger
 * /movies/{id}:
 *   get:
 *     tags: [Movies]
 *     summary: Get movie details
 *     description: Returns detailed information about a specific movie
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TMDB movie ID
 *     responses:
 *       200:
 *         description: Movie details
 *       404:
 *         description: Movie not found
 */
router.get('/:id', movieController.getById);

/**
 * @swagger
 * /movies/{id}/reviews:
 *   get:
 *     tags: [Movies]
 *     summary: Get movie reviews
 *     description: Returns reviews for a specific movie from TMDB
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TMDB movie ID
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/:id/reviews', movieController.getReviews);

export default router;