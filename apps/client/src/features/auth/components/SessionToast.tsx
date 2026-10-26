import { ShieldWarningIcon, XIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../../app/routes';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { toastCleared } from '../authSlice';

// Toast global de sesión cerrada por seguridad (mockup 8.9). Se va solo a los 10 s.
export function SessionToast() {
  const toast = useAppSelector((s) => s.auth.toast);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dispatch(toastCleared()), 10_000);
    return () => clearTimeout(timer);
  }, [toast, dispatch]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex justify-center md:inset-x-auto md:right-6 md:bottom-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_24px_60px_-20px_oklch(0.08_0.01_270/0.9)]"
          >
            <ShieldWarningIcon aria-hidden className="size-5 shrink-0 text-accent" weight="fill" />
            <div className="flex-1 text-sm leading-relaxed">
              <p>{toast.message}</p>
              <Link
                to={ROUTES.login}
                onClick={() => dispatch(toastCleared())}
                className="mt-2 inline-block font-medium text-accent underline-offset-4 hover:underline"
              >
                Ingresar
              </Link>
            </div>
            <button
              type="button"
              onClick={() => dispatch(toastCleared())}
              aria-label="Cerrar aviso"
              className="-m-1 rounded-md p-1 text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <XIcon className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
