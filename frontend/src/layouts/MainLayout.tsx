import { Outlet } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>© 2024 Visión Max. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}