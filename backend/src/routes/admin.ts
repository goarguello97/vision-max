import { Router } from 'express';
import { adminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminController.getUsers);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/unban', adminController.unbanUser);
router.put('/users/:id/grant-admin', adminController.grantAdmin);
router.delete('/reviews/:id', adminController.deleteReview);
router.put('/reviews/:id', adminController.updateReview);
router.get('/logs', adminController.getLogs);
router.get('/stats', adminController.getStats);

export default router;