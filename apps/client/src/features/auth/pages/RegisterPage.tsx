import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_MESSAGES, passwordChecks, registerFormSchema, type RegisterFormInput } from '@vision-max/shared';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readApiError } from '../../../app/api';
import { ROUTES } from '../../../app/routes';
import { FormAlert, PasswordChecklist, PasswordField, SubmitButton, TextField } from '../../../components/form';
import { useRegisterMutation } from '../authApi';
import { AuthHeading, AuthShell, StickyCta } from '../components/AuthShell';
import { FlashAlert } from '../components/FlashAlert';
import { GoogleButton } from '../components/GoogleButton';
import { UsernameField } from '../components/UsernameField';



const linkClass = 'font-medium text-accent underline-offset-4 hover:underline focus-visible:underline';

export function RegisterPage() {
  const [params] = useSearchParams();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    resetField,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onTouched',
    defaultValues: { username: '', email: '', firstName: '', lastName: '', password: '', confirmPassword: '' },
  });

  const username = watch('username');
  const password = watch('password');
  const checks = passwordChecks(password);
  const loginHref = params.get('next') ? `${ROUTES.login}?next=${encodeURIComponent(params.get('next')!)}` : ROUTES.login;

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    setAlert(null);
    try {
      await registerUser(values).unwrap();
    } catch (err) {
      const error = readApiError(err);
      if (error?.network) {
        // Caso borde 21: el form conserva lo escrito, salvo las contraseñas.
        resetField('password');
        resetField('confirmPassword');
        return setAlert(NETWORK_ERROR_MESSAGE);
      }
      if (error?.fields) {
        const entries = Object.entries(error.fields) as [keyof RegisterFormInput, string][];
        entries.forEach(([field, message], i) => setError(field, { message }, { shouldFocus: i === 0 }));
        return;
      }
      setAlert(error?.message ?? GENERIC_ERROR_MESSAGE);
    }
  });

  // "Ya existe una cuenta…" lleva el link a iniciar sesión (Gherkin "Email ya registrado").
  const emailError: ReactNode =
    errors.email?.message === AUTH_MESSAGES.emailTaken ? (
      <>
        Ya existe una cuenta con este email. ¿Querés{' '}
        <Link to={loginHref} className={linkClass}>
          iniciar sesión
        </Link>
        ?
      </>
    ) : (
      errors.email?.message
    );

  return (
    <AuthShell
      mobileBand="short"
      headline={
        <>
          Todo el cine,
          <br />
          en un solo lugar.
        </>
      }
      tagline="Millones de películas y series para descubrir."
    >
      <FlashAlert />
      <AuthHeading title="Creá tu cuenta" description="Guardá tus favoritos y descubrí otros perfiles." />

      <div className="space-y-6">
        <GoogleButton />
        {alert && <FormAlert tone="error">{alert}</FormAlert>}

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <UsernameField value={username} error={errors.username?.message} {...register('username')} />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Nombre" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
            <TextField label="Apellido" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
          </div>

          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            error={emailError}
            {...register('email')}
          />

          <PasswordField
            label="Contraseña"
            autoComplete="new-password"
            error={errors.password?.message}
            hint={<PasswordChecklist checks={checks} showFailures={!!touchedFields.password || isSubmitted} />}
            {...register('password')}
          />

          <PasswordField
            label="Confirmar contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <StickyCta>
            <SubmitButton loading={isLoading} loadingLabel="Creando cuenta…" disabled={isLoading}>
              Crear cuenta
            </SubmitButton>
          </StickyCta>
        </form>

        <div className="space-y-2 text-sm leading-relaxed text-muted">
          <p>Al crear tu cuenta aceptás los Términos y la Política de privacidad.</p>
          <p>
            ¿Ya tenés cuenta?{' '}
            <Link to={loginHref} className={linkClass}>
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
