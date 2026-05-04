/**
 * @fileoverview Componente principal de la aplicación
 * @module App
 */

import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MovieDetailPage from './pages/MovieDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="movie/:id" element={<MovieDetailPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}

export default App;