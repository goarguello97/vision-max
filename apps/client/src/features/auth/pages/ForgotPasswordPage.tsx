import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { AUTH_MESSAGES, forgotPasswordSchema, type ForgotPasswordInput } from '@vision-max/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readApiError } from '../../../app/api';
import { ROUTES } from '../../../app/routes';
import { FormAlert, SubmitButton, TextField } from '../../../components/form';
import { useForgotPasswordMutation } from '../authApi';
import { AuthHeading, AuthShell, StickyCta } from '../components/AuthShell';
import { formatCountdown, useCountdown } from '../hooks';

const RESEND_DELAY_MS = 45_000;

export function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const resendIn = useCountdown(resendAt);
  const reduceMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  const send = async (email: string) => {
    setAlert(null);
    try {
      await forgotPassword({ email }).unwrap();
      setSentTo(email);
      setResendAt(Date.now() + RESEND_DELAY_MS);
    } catch (err) {
      const error = readApiError(err);
      setAlert(error?.network ? NETWORK_ERROR_MESSAGE : (error?.message ?? GENERIC_ERROR_MESSAGE));
    }
  };

  return (
    <AuthShell headline="Volvé a tu cuenta en un minuto." tagline="Te mandamos un link para crear una contraseña nueva.">
      <Link
        to={ROUTES.login}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Volver a iniciar sesión
      </Link>

      {sentTo ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
        >
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-line bg-raised text-accent">
            <EnvelopeSimpleIcon aria-hidden className="size-7" />
          </div>
          <AuthHeading title="Revisá tu correo" />
          <p className="leading-relaxed text-muted">
            {AUTH_MESSAGES.forgotPasswordSent} El link vence en 60 minutos.
          </p>
          {alert && (
            <div className="mt-6">
              <FormAlert tone="error">{alert}</FormAlert>
            </div>
          )}
          <p className="mt-8 text-sm text-muted">¿No llegó? Revisá spam o pedí otro.</p>
          <button
            type="button"
            onClick={() => send(sentTo)}
            disabled={resendIn > 0 || isLoading}
            className="mt-3 inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-medium transition-colors hover:border-muted disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-line focus-visible:outline-2 focus-visible:outline-accent"
          >
            {resendIn > 0 ? `Reenviar link (en ${formatCountdown(resendIn)})` : 'Reenviar link'}
          </button>
        </motion.div>
      ) : (
        <>
          <AuthHeading
            title="¿Olvidaste tu contraseña?"
            description="Ingresá tu email y te enviamos un link para crear una nueva."
          />
          <form onSubmit={handleSubmit(({ email }) => send(email))} noValidate className="space-y-5">
            {alert && <FormAlert tone="error">{alert}</FormAlert>}
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <StickyCta>
              <SubmitButton loading={isLoading} loadingLabel="Enviando…" disabled={isLoading}>
                Enviar link
              </SubmitButton>
            </StickyCta>
          </form>
        </>
      )}
    </AuthShell>
  );
}
