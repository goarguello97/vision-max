import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { FormAlert } from '../../../components/form';
import { flashCleared } from '../authSlice';

// Aviso de una sola vez que deja otra pantalla (mockup 8.7). Se muestra solo en su ruta y se descarta con ✕.
export function FlashAlert() {
  const flash = useAppSelector((s) => s.auth.flash);
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();

  if (!flash || flash.path !== pathname) return null;
  return (
    <div className="mb-6">
      <FormAlert tone={flash.type === 'success' ? 'success' : 'error'} onDismiss={() => dispatch(flashCleared())}>
        {flash.message}
      </FormAlert>
    </div>
  );
}

// Lo monta el Layout: cuando la navegación sale de la ruta del aviso, el aviso se descarta.
// Solo reacciona a cambios de ruta: el aviso se crea en la pantalla anterior, justo antes de navegar.
export function useClearStaleFlash() {
  const flashPath = useAppSelector((s) => s.auth.flash?.path);
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (flashPath && flashPath !== pathname) dispatch(flashCleared());
  }, [flashPath, pathname, dispatch]);
}
