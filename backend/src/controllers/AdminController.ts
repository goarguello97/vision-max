import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/AdminService';
import { userRepository } from '../repositories/UserRepository';

export class AdminController {
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await userRepository.findAll(page, limit);

      res.json({
        success: true,
        data: {
          users: result.users,
          total: result.total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = (req as unknown as { user: { id: number } }).user;
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido',
        });
        return;
      }

      await adminService.banUser(admin.id, userId);

      res.json({
        success: true,
        message: 'Usuario baneado',
      });
    } catch (error) {
      next(error);
    }
  }

  async unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = (req as unknown as { user: { id: number } }).user;
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido',
        });
        return;
      }

      await adminService.unbanUser(admin.id, userId);

      res.json({
        success: true,
        message: 'Usuario desbaneado',
      });
    } catch (error) {
      next(error);
    }
  }

  async grantAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = (req as unknown as { user: { id: number } }).user;
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido',
        });
        return;
      }

      await adminService.grantAdmin(admin.id, userId);

      res.json({
        success: true,
        message: 'Rol de administrador otorgado',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = (req as unknown as { user: { id: number } }).user;
      const reviewId = parseInt(req.params.id, 10);

      if (isNaN(reviewId)) {
        res.status(400).json({
          success: false,
          message: 'ID de reseña inválido',
        });
        return;
      }

      await adminService.deleteReview(admin.id, reviewId);

      res.json({
        success: true,
        message: 'Reseña eliminada',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = (req as unknown as { user: { id: number } }).user;
      const reviewId = parseInt(req.params.id, 10);
      const isHidden = req.body.isHidden === true;

      if (isNaN(reviewId)) {
        res.status(400).json({
          success: false,
          message: 'ID de reseña inválido',
        });
        return;
      }

      const review = await adminService.updateReview(admin.id, reviewId, isHidden);

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const result = await adminService.getLogs(page, limit);

      res.json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();