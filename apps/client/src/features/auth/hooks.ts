import { usernameSchema, type UsernameAvailability } from '@vision-max/shared';
import { useEffect, useState } from 'react';
import { useLazyUsernameAvailableQuery } from './authApi';

// Cuenta regresiva hasta un timestamp (rate limit de login, reenvío de link). Devuelve segundos.
export function useCountdown(until: number | null): number {
  const remaining = () => (until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    setSeconds(remaining());
    if (!until) return;
    const timer = setInterval(() => {
      const left = remaining();
      setSeconds(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);

  return seconds;
}

export const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export type UsernameCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'done'; result: UsernameAvailability };

// RN-03: chequeo en vivo del ID con debounce de 400 ms. Solo consulta si el formato es válido.
export function useUsernameCheck(value: string): UsernameCheck {
  const [trigger] = useLazyUsernameAvailableQuery();
  const [check, setCheck] = useState<UsernameCheck>({ state: 'idle' });

  useEffect(() => {
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setCheck({ state: 'idle' });
      return;
    }
    setCheck({ state: 'checking' });
    let cancelled = false;
    const timer = setTimeout(() => {
      trigger(parsed.data, true)
        .unwrap()
        .then((result) => !cancelled && setCheck({ state: 'done', result }))
        .catch(() => !cancelled && setCheck({ state: 'idle' }));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, trigger]);

  return check;
}
