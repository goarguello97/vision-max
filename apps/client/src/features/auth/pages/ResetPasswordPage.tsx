import { zodResolver } from '@hookform/resolvers/zod';
import { WarningIcon } from '@phosphor-icons/react';
import {
  AUTH_MESSAGES,
  passwordChecks,
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from '@vision-max/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readApiError } from '../../../app/api';
import { ROUTES } from '../../../app/routes';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { FormAlert, PasswordChecklist, PasswordField, SubmitButton } from '../../../components/form';
import { useResetPasswordMutation, useValidateResetTokenQuery } from '../authApi';
import { flashShown } from '../authSlice';
import { AuthHeading, AuthShell, StickyCta } from '../components/AuthShell';
import { logout } from '../logout';

function InvalidLink() {
  return (
    <div role="alert">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-line bg-raised text-accent">
        <WarningIcon aria-hidden className="size-7" />
      </div>
      <AuthHeading
        title="Este link ya no es válido"
        description="Puede haber vencido, ya haberse usado o haber sido reemplazado por uno más nuevo."
      />
      <Link
        to={ROUTES.forgotPassword}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent px-5 font-semibold text-on-accent transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Pedir un link nuevo
      </Link>
      <p className="mt-4 text-center text-sm">
        <Link to={ROUTES.login} className="text-muted underline-offset-4 hover:text-fg hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}

function ValidatingSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Validando el link">
      <div className="h-8 w-3/4 rounded-lg bg-raised" />
      <div className="h-4 w-1/2 rounded-lg bg-raised" />
      <div className="h-12 rounded-lg bg-raised" />
      <div className="h-12 rounded-lg bg-raised" />
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const validation = useValidateResetTokenQuery(token, { skip: token === '' });
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [expired, setExpired] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  // Caso borde 11: abrir el link con sesión iniciada cierra la sesión primero.
  useEffect(() => {
    if (status === 'authenticated') logout(dispatch);
  }, [status, dispatch]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    resetField,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setAlert(null);
    try {
      await resetPassword({ token, password }).unwrap();
      dispatch(flashShown({ type: 'success', message: AUTH_MESSAGES.passwordUpdated, path: ROUTES.login }));
      navigate(ROUTES.login, { replace: true });
    } catch (err) {
      const error = readApiError(err);
      if (error?.network) {
        resetField('password');
        resetField('confirmPassword');
        return setAlert(NETWORK_ERROR_MESSAGE);
      }
      if (error?.code === 'RESET_TOKEN_INVALID') return setExpired(true);
      if (error?.fields?.password) return setError('password', { message: error.fields.password }, { shouldFocus: true });
      setAlert(error?.message ?? GENERIC_ERROR_MESSAGE);
    }
  });

  const invalid = token === '' || expired || validation.isError;

  let content;
  if (invalid) content = <InvalidLink />;
  else if (!validation.data) content = <ValidatingSkeleton />;
  else
    content = (
      <>
        <AuthHeading title="Creá una nueva contraseña" description={`para ${validation.data.email}`} />
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {alert && <FormAlert tone="error">{alert}</FormAlert>}
          <PasswordField
            label="Nueva contraseña"
            autoComplete="new-password"
            error={errors.password?.message}
            hint={
              <PasswordChecklist
                checks={passwordChecks(watch('password'))}
                showFailures={!!touchedFields.password || isSubmitted}
              />
            }
            {...register('password')}
          />
          <PasswordField
            label="Confirmar contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <FormAlert tone="info">Al guardar se cerrará tu sesión en todos tus dispositivos.</FormAlert>
          <StickyCta>
            <SubmitButton loading={isLoading} loadingLabel="Guardando…" disabled={isLoading}>
              Guardar contraseña
            </SubmitButton>
          </StickyCta>
        </form>
      </>
    );

  return (
    <AuthShell headline="Una contraseña nueva y listo." tagline="Después ingresás con ella desde cualquier dispositivo.">
      {content}
    </AuthShell>
  );
}
