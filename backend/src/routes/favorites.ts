/**
 * @fileoverview Router de favoritos
 * @module routes/favorites
 */

import { Router } from 'express';
import { favoriteController } from '../controllers/FavoriteController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', favoriteController.getFavorites);

router.get('/details', favoriteController.getFavoritesWithDetails);

router.post('/:mediaType/:mediaId', favoriteController.addFavorite);

router.delete('/:mediaType/:mediaId', favoriteController.removeFavorite);

export default router;