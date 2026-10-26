import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@vision-max/shared';
import { api } from '../../app/api';
import { API_URL } from '../../app/config';
import type { AppDispatch } from '../../app/store';
import { sessionEnded } from './authSlice';
import { announce } from './session';

const revoke = () =>
  fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { [CSRF_HEADER]: CSRF_HEADER_VALUE },
  }).then((res) => {
    if (!res.ok) throw new Error(`logout ${res.status}`);
  });

// RN-23/RN-24: el logout local es inmediato; si la revocación falla se reintenta una vez en segundo plano.
export function logout(dispatch: AppDispatch) {
  dispatch(sessionEnded());
  dispatch(api.util.resetApiState());
  announce({ type: 'logout' });

  revoke().catch(() => {
    const retry = () => void revoke().catch(() => undefined);
    if (navigator.onLine) setTimeout(retry, 3000);
    else window.addEventListener('online', retry, { once: true });
  });
}
