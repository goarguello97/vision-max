/**
 * @fileoverview Página de administración del sistema
 * @module pages/AdminPage
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { adminApi } from '../shared/utils/api';
import type { User } from '../shared/types';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalAdmins: number;
    bannedUsers: number;
    totalReviews: number;
    totalFavorites: number;
  } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
      ])
        .then(([statsRes, usersRes]) => {
          if (statsRes.data.success) setStats(statsRes.data.data);
          if (usersRes.data.success) setUsers(usersRes.data.data.users);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated) {
    return (
      <div className={styles.unauthorized}>
        <h2>Acceso denegado</h2>
        <p>Debes iniciar sesión</p>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className={styles.unauthorized}>
        <h2>Sin permisos</h2>
        <p>Solo administradores pueden acceder</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Panel de Administración</h1>

      {isLoading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <>
          {stats && (
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.totalUsers}</span>
                <span className={styles.statLabel}>Usuarios</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.totalAdmins}</span>
                <span className={styles.statLabel}>Admins</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.bannedUsers}</span>
                <span className={styles.statLabel}>Baneados</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.totalReviews}</span>
                <span className={styles.statLabel}>Reseñas</span>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Usuarios</h2>
            <div className={styles.usersList}>
              {users.map((u) => (
                <div key={u.id} className={styles.userItem}>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{u.username}</span>
                    <span className={styles.userEmail}>{u.email}</span>
                  </div>
                  <div className={styles.userRole}>
                    <span className={`${styles.badge} ${u.role === 'ADMIN' ? styles.adminBadge : ''}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}