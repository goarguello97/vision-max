import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { ROUTES } from '../../app/routes';
import { useAppSelector } from '../../app/store';

// RN-38: `next` solo acepta paths internos ("/x"), nunca "//evil.com" ni URLs absolutas.
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

export function loginPathFor(path: string) {
  return `${ROUTES.login}?next=${encodeURIComponent(path).replace(/%2F/g, '/')}`;
}

function RouteLoader() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-live="polite">
      <span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

// RN-37: rutas con login. Mientras dura el bootstrap se muestra un loader, nunca el login.
export function RequireAuth() {
  const status = useAppSelector((s) => s.auth.status);
  const location = useLocation();

  if (status === 'idle' || status === 'bootstrapping') return <RouteLoader />;
  if (status === 'anonymous') {
    return <Navigate to={loginPathFor(location.pathname + location.search)} replace />;
  }
  return <Outlet />;
}

// Rutas de auth: con sesión se sale a `next` (o a "/"). Así el login no necesita navegar por su cuenta.
export function GuestOnly() {
  const status = useAppSelector((s) => s.auth.status);
  const [params] = useSearchParams();

  if (status === 'idle' || status === 'bootstrapping') return <RouteLoader />;
  if (status === 'authenticated') {
    return <Navigate to={safeNext(params.get('next')) ?? ROUTES.home} replace />;
  }
  return <Outlet />;
}
