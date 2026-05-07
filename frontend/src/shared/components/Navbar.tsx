/**
 * @fileoverview Componente de barra de navegación
 * @module shared/components/Navbar
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/profile');
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
              <button
                className={styles.userButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className={styles.username}>{user?.username}</span>
                <span className={styles.dropdownArrow}>▼</span>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <button className={styles.dropdownItem} onClick={handleProfileClick}>
                    Mi Perfil
                  </button>
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              )}
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