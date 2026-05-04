import { Router } from 'express';
import { favoriteController } from '../controllers/FavoriteController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', favoriteController.getFavorites);
router.post('/:movieId', favoriteController.addFavorite);
router.delete('/:movieId', favoriteController.removeFavorite);

export default router;