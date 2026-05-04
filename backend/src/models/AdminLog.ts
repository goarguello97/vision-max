/**
 * @fileoverview Modelos para logs de administrador y estadísticas
 * @module models/AdminLog
 */

/**
 * Acciones realizables por administradores.
 * @typedef {'BAN_USER' | 'UNBAN_USER' | 'GRANT_ADMIN' | 'REVOKE_ADMIN' | 'DELETE_REVIEW' | 'UPDATE_REVIEW' | 'HIDE_REVIEW'} AdminAction
 */
export type AdminAction =
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'GRANT_ADMIN'
  | 'REVOKE_ADMIN'
  | 'DELETE_REVIEW'
  | 'UPDATE_REVIEW'
  | 'HIDE_REVIEW';

/**
 * Entrada de log de acción administrativa.
 * @interface AdminLogEntry
 */
export interface AdminLogEntry {
  id: number;
  adminId: number;
  action: AdminAction;
  targetUserId: number | null;
  createdAt: Date;
}

/**
 * Estadísticas agregadas del sistema para el panel de admin.
 * @interface AdminStats
 */
export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  bannedUsers: number;
  totalReviews: number;
  hiddenReviews: number;
  totalFavorites: number;
}