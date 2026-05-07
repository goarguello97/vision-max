/**
 * @fileoverview Página de perfil de usuario
 * @module pages/ProfilePage
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../shared/hooks/useAuth';
import { authApi } from '../shared/utils/api';
import Button from '../shared/components/Button';
import styles from './ProfilePage.module.css';

const profileSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string().min(3, 'Mínimo 3 caracteres'),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const { register: formRegister, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      username: user?.username || '',
    },
  });

  const { register: passwordRegister, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  if (!isAuthenticated || !user) {
    navigate('/login');
    return null;
  }

  const checkUsername = async (username: string) => {
    if (username.length < 3 || username === user.username) return;
    try {
      const response = await authApi.checkUsername(username);
      if (!response.data.available) {
        setUsernameError('El nombre de usuario ya está en uso');
      } else {
        setUsernameError('');
      }
    } catch {
      setUsernameError('');
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    if (usernameError) return;
    setIsLoadingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      await updateProfile({ email: data.email, username: data.username });
      setProfileSuccess('Perfil actualizado correctamente');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setProfileError(error.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsLoadingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess('Contraseña cambiada correctamente');
      resetPassword();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setPasswordError(error.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Mi Perfil</h1>

        <div className={styles.grid}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Información de la Cuenta</h2>
            
            <div className={styles.info}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Rol</span>
                <span className={styles.infoValue}>{user.role}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Miembro desde</span>
                <span className={styles.infoValue}>{formatDate(user.createdAt)}</span>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className={styles.form}>
              {profileError && <div className={styles.error}>{profileError}</div>}
              {profileSuccess && <div className={styles.success}>{profileSuccess}</div>}

              <div className={styles.field}>
                <label htmlFor="username" className={styles.label}>Usuario</label>
                <input
                  id="username"
                  type="text"
                  {...formRegister('username')}
                  onBlur={(e) => checkUsername(e.target.value)}
                  className={styles.input}
                />
                {usernameError && <span className={styles.fieldError}>{usernameError}</span>}
                {profileErrors.username && <span className={styles.fieldError}>{profileErrors.username.message}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  id="email"
                  type="email"
                  {...formRegister('email')}
                  className={styles.input}
                />
                {profileErrors.email && <span className={styles.fieldError}>{profileErrors.email.message}</span>}
              </div>

              <Button type="submit" isLoading={isLoadingProfile} className={styles.submitBtn}>
                Guardar Cambios
              </Button>
            </form>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Cambiar Contraseña</h2>

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className={styles.form}>
              {passwordError && <div className={styles.error}>{passwordError}</div>}
              {passwordSuccess && <div className={styles.success}>{passwordSuccess}</div>}

              <div className={styles.field}>
                <label htmlFor="currentPassword" className={styles.label}>Contraseña Actual</label>
                <input
                  id="currentPassword"
                  type="password"
                  {...passwordRegister('currentPassword')}
                  className={styles.input}
                  placeholder="••••••••"
                />
                {passwordErrors.currentPassword && <span className={styles.fieldError}>{passwordErrors.currentPassword.message}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="newPassword" className={styles.label}>Nueva Contraseña</label>
                <input
                  id="newPassword"
                  type="password"
                  {...passwordRegister('newPassword')}
                  className={styles.input}
                  placeholder="••••••••"
                />
                {passwordErrors.newPassword && <span className={styles.fieldError}>{passwordErrors.newPassword.message}</span>}
              </div>

              <Button type="submit" isLoading={isLoadingPassword} className={styles.submitBtn}>
                Cambiar Contraseña
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
