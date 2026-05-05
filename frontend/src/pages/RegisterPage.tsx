/**
 * @fileoverview Página de registro de usuario
 * @module pages/RegisterPage
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../shared/hooks/useAuth';
import { authApi } from '../shared/utils/api';
import Button from '../shared/components/Button';
import styles from './AuthPage.module.css';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  username: z.string().min(3, 'Mínimo 3 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const checkUsername = async (username: string) => {
    if (username.length < 3) return;
    setIsCheckingUsername(true);
    try {
      const response = await authApi.checkUsername(username);
      if (!response.data.available) {
        setUsernameError('El nombre de usuario ya está en uso');
      } else {
        setUsernameError('');
      }
    } catch {
      setUsernameError('');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const checkEmail = async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    setIsCheckingEmail(true);
    try {
      const response = await authApi.checkEmail(email);
      if (!response.data.available) {
        setEmailError('El email ya está registrado');
      } else {
        setEmailError('');
      }
    } catch {
      setEmailError('');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await registerUser(data.email, data.password, data.username);
      setSuccess('Registro exitoso. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al registrarse';
      setError(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      setSuccess('');
      setError('');
    };
  }, []);

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Registrarse</h1>
        <p className={styles.subtitle}>Únete a la comunidad</p>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>Usuario</label>
            <input
              id="username"
              type="text"
              {...formRegister('username')}
              onBlur={(e) => checkUsername(e.target.value)}
              className={styles.input}
              placeholder="tuusuario"
            />
            {isCheckingUsername && <span className={styles.fieldError}>Verificando...</span>}
            {usernameError && <span className={styles.fieldError}>{usernameError}</span>}
            {errors.username && <span className={styles.fieldError}>{errors.username.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              {...formRegister('email')}
              onBlur={(e) => checkEmail(e.target.value)}
              className={styles.input}
              placeholder="tu@email.com"
            />
            {isCheckingEmail && <span className={styles.fieldError}>Verificando...</span>}
            {emailError && <span className={styles.fieldError}>{emailError}</span>}
            {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              {...formRegister('password')}
              className={styles.input}
              placeholder="••••••••"
            />
            {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
          </div>

          <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
            Registrarse
          </Button>
        </form>

        <p className={styles.switch}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}