import { Router } from 'express';
import { movieController } from '../controllers/MovieController';

const router = Router();

router.get('/', movieController.getPopular);
router.get('/search', movieController.search);
router.get('/:id', movieController.getById);
router.get('/:id/reviews', movieController.getReviews);

export default router;