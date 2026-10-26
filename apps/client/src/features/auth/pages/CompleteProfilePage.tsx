import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleLogoIcon, SealCheckIcon } from '@phosphor-icons/react';
import { googleCompleteFormSchema, type GoogleCompleteFormInput } from '@vision-max/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readApiError } from '../../../app/api';
import { ROUTES } from '../../../app/routes';
import { useAppDispatch, useAppSelector, type RootState } from '../../../app/store';
import { Avatar } from '../../../components/Avatar';
import { FormAlert, SubmitButton, TextField } from '../../../components/form';
import { useGoogleCompleteMutation } from '../authApi';
import { flashShown, onboardingCleared } from '../authSlice';
import { AuthHeading, AuthShell, StickyCta } from '../components/AuthShell';
import { UsernameField } from '../components/UsernameField';

// Paso único del alta con Google (RN-34.3, mockup 8.8). Sin onboardingToken en memoria vuelve a /registro.
export function CompleteProfilePage() {
  const onboarding = useAppSelector((s) => s.auth.onboarding);
  if (!onboarding) return <Navigate to={ROUTES.register} replace />;
  return <CompleteProfileForm onboarding={onboarding} />;
}

function CompleteProfileForm({ onboarding }: { onboarding: NonNullable<RootState['auth']['onboarding']> }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [complete, { isLoading }] = useGoogleCompleteMutation();
  const [alert, setAlert] = useState<string | null>(null);
  const { prefill } = onboarding;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<GoogleCompleteFormInput>({
    resolver: zodResolver(googleCompleteFormSchema),
    mode: 'onTouched',
    defaultValues: { username: prefill.suggestedUsername, firstName: prefill.firstName, lastName: prefill.lastName },
  });

  const leave = (to: string, message?: string) => {
    dispatch(onboardingCleared());
    if (message) dispatch(flashShown({ type: 'error', message, path: to }));
    navigate(to, { replace: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setAlert(null);
    try {
      await complete({ onboardingToken: onboarding.token, ...values }).unwrap();
    } catch (err) {
      const error = readApiError(err);
      if (error?.network) return setAlert(NETWORK_ERROR_MESSAGE);
      if (error?.code === 'ONBOARDING_EXPIRED') return leave(ROUTES.register, error.message);
      // Caso borde 17: la cuenta apareció entretanto. Volver a Google ahora la vincula.
      if (error?.code === 'ACCOUNT_EXISTS') return leave(ROUTES.login, error.message);
      if (error?.fields) {
        const entries = Object.entries(error.fields) as [keyof GoogleCompleteFormInput, string][];
        entries.forEach(([field, message], i) => setError(field, { message }, { shouldFocus: i === 0 }));
        return;
      }
      setAlert(error?.message ?? GENERIC_ERROR_MESSAGE);
    }
  });

  return (
    <AuthShell headline="Un último paso." tagline="Elegí cómo te van a encontrar en Vision Max.">
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-line bg-raised/50 p-3">
        <Avatar firstName={watch('firstName') || prefill.firstName} lastName={watch('lastName') || prefill.lastName} size="lg" />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{prefill.email}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-muted">
            <GoogleLogoIcon aria-hidden className="size-3.5" weight="bold" />
            Google
            <SealCheckIcon aria-label="verificado" className="size-3.5 text-success" weight="fill" />
          </p>
        </div>
      </div>

      <AuthHeading title="Elegí tu ID público" description="Así te van a ver otros usuarios." />

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {alert && <FormAlert tone="error">{alert}</FormAlert>}
        <UsernameField value={watch('username')} error={errors.username?.message} {...register('username')} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Nombre" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
          <TextField label="Apellido" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <StickyCta>
          <SubmitButton loading={isLoading} loadingLabel="Creando tu cuenta…" disabled={isLoading}>
            Empezar
          </SubmitButton>
        </StickyCta>
        <button
          type="button"
          onClick={() => leave(ROUTES.register)}
          className="w-full text-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Cancelar y volver
        </button>
      </form>
    </AuthShell>
  );
}
