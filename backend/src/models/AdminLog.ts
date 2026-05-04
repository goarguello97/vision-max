export type AdminAction =
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'GRANT_ADMIN'
  | 'REVOKE_ADMIN'
  | 'DELETE_REVIEW'
  | 'UPDATE_REVIEW'
  | 'HIDE_REVIEW';

export interface AdminLogEntry {
  id: number;
  adminId: number;
  action: AdminAction;
  targetUserId: number | null;
  createdAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  bannedUsers: number;
  totalReviews: number;
  hiddenReviews: number;
  totalFavorites: number;
}