import { zodResolver } from '@hookform/resolvers/zod';
import { TimerIcon } from '@phosphor-icons/react';
import { loginSchema, type LoginInput } from '@vision-max/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readApiError } from '../../../app/api';
import { ROUTES } from '../../../app/routes';
import { FormAlert, PasswordField, SubmitButton, TextField } from '../../../components/form';
import { useLoginMutation } from '../authApi';
import { AuthHeading, AuthShell, StickyCta } from '../components/AuthShell';
import { FlashAlert } from '../components/FlashAlert';
import { GoogleButton, isGoogleEnabled } from '../components/GoogleButton';
import { formatCountdown, useCountdown } from '../hooks';

const linkClass = 'font-medium text-accent underline-offset-4 hover:underline focus-visible:underline';

export function LoginPage() {
  const [params] = useSearchParams();
  const [login, { isLoading }] = useLoginMutation();
  const [alert, setAlert] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const blockedFor = useCountdown(blockedUntil);

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  // Al tener éxito no se navega acá: GuestOnly redirige a `next` apenas hay sesión.
  const onSubmit = handleSubmit(async (values) => {
    setAlert(null);
    try {
      await login(values).unwrap();
    } catch (err) {
      const error = readApiError(err);
      resetField('password');
      if (error?.network) return setAlert(NETWORK_ERROR_MESSAGE);
      if (error?.code === 'TOO_MANY_ATTEMPTS') {
        const retryAfter = Number(error.meta?.retryAfterSec ?? 900);
        setBlockedUntil(Date.now() + retryAfter * 1000);
        return;
      }
      if (error?.code === 'VALIDATION_ERROR' && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          setError(field as keyof LoginInput, { message });
        }
        return;
      }
      setAlert(error?.code === 'INVALID_CREDENTIALS' ? error.message : GENERIC_ERROR_MESSAGE);
      setFocus('password');
    }
  });

  const blocked = blockedFor > 0;
  const registerHref = params.get('next') ? `${ROUTES.register}?next=${encodeURIComponent(params.get('next')!)}` : ROUTES.register;

  return (
    <AuthShell headline="Seguí donde lo dejaste." tagline="Tus favoritos te esperan.">
      <FlashAlert />
      <AuthHeading title="Bienvenido de nuevo" />

      <div className="space-y-6">
        <GoogleButton />

        {blocked ? (
          <FormAlert tone="error">
            <span className="inline-flex items-center gap-1.5">
              <TimerIcon aria-hidden className="size-4" />
              Demasiados intentos. Probá de nuevo en {formatCountdown(blockedFor)}.
            </span>
          </FormAlert>
        ) : (
          alert && <FormAlert tone="error">{alert}</FormAlert>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            label="Contraseña"
            autoComplete="current-password"
            error={errors.password?.message}
            labelAside={
              <Link to={ROUTES.forgotPassword} className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            }
            {...register('password')}
          />

          <StickyCta>
            <SubmitButton loading={isLoading} loadingLabel="Ingresando…" disabled={isLoading || blocked}>
              {blocked ? `Iniciar sesión (${formatCountdown(blockedFor)})` : 'Iniciar sesión'}
            </SubmitButton>
          </StickyCta>
        </form>

        <div className="space-y-2 text-sm text-muted">
          {isGoogleEnabled && <p>¿Te registraste con Google? Usá el botón de Google.</p>}
          <p>
            ¿No tenés cuenta?{' '}
            <Link to={registerHref} className={linkClass}>
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
