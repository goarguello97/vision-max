/**
 * @fileoverview Controlador de favoritos
 * @module controllers/FavoriteController
 */

import { Request, Response } from 'express';
import { favoriteService } from '../services/FavoriteService';
import { MediaType } from '@prisma/client';

export class FavoriteController {
  async addFavorite(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const mediaId = parseInt(req.params.mediaId, 10);
    const mediaType = req.params.mediaType as MediaType;

    if (isNaN(mediaId)) {
      res.status(400).json({ success: false, message: 'ID inválido' });
      return;
    }

    if (!['MOVIE', 'TV'].includes(mediaType)) {
      res.status(400).json({ success: false, message: 'Tipo de medio inválido' });
      return;
    }

    await favoriteService.addFavorite(user.id, mediaId, mediaType);
    res.status(201).json({ success: true, message: 'Agregado a favoritos' });
  }

  async removeFavorite(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const mediaId = parseInt(req.params.mediaId, 10);
    const mediaType = req.params.mediaType as MediaType;

    if (isNaN(mediaId)) {
      res.status(400).json({ success: false, message: 'ID inválido' });
      return;
    }

    if (!['MOVIE', 'TV'].includes(mediaType)) {
      res.status(400).json({ success: false, message: 'Tipo de medio inválido' });
      return;
    }

    await favoriteService.removeFavorite(user.id, mediaId, mediaType);
    res.json({ success: true, message: 'Eliminado de favoritos' });
  }

  async getFavorites(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const mediaType = req.query.mediaType as MediaType | undefined;

    if (mediaType && !['MOVIE', 'TV'].includes(mediaType)) {
      res.status(400).json({ success: false, message: 'Tipo de medio inválido' });
      return;
    }

    const result = await favoriteService.getFavorites(user.id, page, limit, mediaType);
    res.json({
      success: true,
      data: { favorites: result.favorites, total: result.total, page, limit },
    });
  }

  async getFavoritesWithDetails(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: number } }).user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const mediaType = req.query.mediaType as MediaType;

    if (!['MOVIE', 'TV'].includes(mediaType)) {
      res.status(400).json({ success: false, message: 'Tipo de medio inválido' });
      return;
    }

    const result = await favoriteService.getFavoritesWithDetails(user.id, mediaType, page, limit);
    res.json({
      success: true,
      data: result,
    });
  }
}

export const favoriteController = new FavoriteController();