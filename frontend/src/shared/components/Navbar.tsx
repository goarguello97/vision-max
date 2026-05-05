/**
 * @fileoverview Componente de barra de navegación
 * @module shared/components/Navbar
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Visión<span className={styles.logoAccent}>Max</span>
        </Link>

        <div className={styles.links}>
          <Link to="/" className={styles.link}>Películas</Link>
          <Link to="/tv" className={styles.link}>Series TV</Link>

          {isAuthenticated && (
            <>
              <Link to="/favorites" className={styles.link}>Favoritos</Link>
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className={styles.link}>Admin</Link>
              )}
            </>
          )}
        </div>

        <div className={styles.auth}>
          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <span className={styles.username}>{user?.username}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Registrarse</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}