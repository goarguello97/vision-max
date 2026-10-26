import type { Dispatch } from '@reduxjs/toolkit';
import { CSRF_HEADER, CSRF_HEADER_VALUE, type ApiError, type AuthResponse } from '@vision-max/shared';
import { API_URL } from '../../app/config';
import { bootstrapStarted, sessionEnded, sessionStarted } from './authSlice';

// Renovación de sesión con la cookie httpOnly `rt` (spec 01, §3.1).
// Usa fetch directo y no RTK Query: la llama el propio baseQuery cuando el access token vence.

let inflight: Promise<boolean> | null = null;

// Single-flight dentro de la pestaña + navigator.locks entre pestañas (caso borde 6).
export function refreshSession(dispatch: Dispatch): Promise<boolean> {
  inflight ??= withCrossTabLock(() => doRefresh(dispatch)).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return (await navigator.locks.request('vision-max-auth-refresh', fn)) as T;
  }
  return fn();
}

async function doRefresh(dispatch: Dispatch): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { [CSRF_HEADER]: CSRF_HEADER_VALUE },
    });
  } catch {
    // Sin red no se puede saber si la sesión sigue viva: en el arranque se queda como anónimo.
    dispatch(sessionEnded());
    return false;
  }

  if (res.ok) {
    dispatch(sessionStarted((await res.json()) as AuthResponse));
    return true;
  }
  const body = (await res.json().catch(() => null)) as ApiError | null;
  dispatch(sessionEnded({ revoked: body?.error.code === 'SESSION_REVOKED' }));
  return false;
}

// Sincronización entre pestañas del mismo navegador (RN-23).
type AuthMessage = { type: 'login' } | { type: 'logout' };
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('auth') : null;

export const announce = (message: AuthMessage) => channel?.postMessage(message);

// Arranque de la app: rehidrata la sesión con la cookie y escucha a las otras pestañas.
export function bootstrapSession(dispatch: Dispatch) {
  dispatch(bootstrapStarted());
  channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
    if (event.data.type === 'logout') dispatch(sessionEnded());
    if (event.data.type === 'login') void refreshSession(dispatch);
  });
  return refreshSession(dispatch);
}
