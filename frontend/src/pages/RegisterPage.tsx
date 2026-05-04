import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../shared/hooks/useAuth';
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
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    try {
      await registerUser(data.email, data.password, data.username);
      navigate('/');
    } catch (err) {
      setError('Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Registrarse</h1>
        <p className={styles.subtitle}>Únete a la comunidad</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>Usuario</label>
            <input
              id="username"
              type="text"
              {...register('username')}
              className={styles.input}
              placeholder="tuusuario"
            />
            {errors.username && <span className={styles.fieldError}>{errors.username.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={styles.input}
              placeholder="tu@email.com"
            />
            {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
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