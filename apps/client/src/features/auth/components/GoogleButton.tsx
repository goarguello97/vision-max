import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readApiError } from '../../../app/api';
import { GOOGLE_CLIENT_ID } from '../../../app/config';
import { ROUTES } from '../../../app/routes';
import { FormAlert, OrDivider } from '../../../components/form';
import { useGoogleAuthMutation } from '../authApi';

// Tipos mínimos de Google Identity Services (accounts.google.com/gsi/client).
interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup';
  }): void;
  renderButton(
    parent: HTMLElement,
    options: { type: 'standard'; theme: 'filled_black' | 'outline'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; width: number; locale: string },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let gsiScript: Promise<void> | null = null;
function loadGsi() {
  gsiScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScript = null;
      reject(new Error('No se pudo cargar Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return gsiScript;
}

export const isGoogleEnabled = GOOGLE_CLIENT_ID !== null;

// RN-33: botón oficial "Continuar con Google" (One Tap deshabilitado). Sin VITE_GOOGLE_CLIENT_ID no se muestra.
export function GoogleButton() {
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [googleAuth, { isLoading }] = useGoogleAuthMutation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let active = true;
    loadGsi()
      .then(() => {
        const el = container.current;
        if (!active || !el || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID!,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async ({ credential }) => {
            setError(null);
            try {
              const result = await googleAuth({ credential }).unwrap();
              if (result.status === 'needs_profile') navigate(ROUTES.completeProfile);
            } catch (err) {
              const apiError = readApiError(err);
              setError(apiError?.network ? NETWORK_ERROR_MESSAGE : (apiError?.message ?? GENERIC_ERROR_MESSAGE));
            }
          },
        });
        window.google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(400, el.clientWidth || 400),
          locale: 'es-419',
        });
      })
      .catch(() => active && setError('No pudimos cargar el ingreso con Google.'));
    return () => {
      active = false;
    };
  }, [googleAuth, navigate]);

  if (!isGoogleEnabled) return null;

  return (
    <div className="space-y-5">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div className="relative flex min-h-11 justify-center" aria-busy={isLoading || undefined}>
        <div ref={container} className={isLoading ? 'pointer-events-none opacity-60' : ''} />
      </div>
      <OrDivider />
    </div>
  );
}
