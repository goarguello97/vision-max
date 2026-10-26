import { Link, Outlet } from 'react-router';
import { useClearStaleFlash } from '../features/auth/components/FlashAlert';
import { SessionToast } from '../features/auth/components/SessionToast';
import { UserSlot } from '../features/auth/components/UserMenu';
import { ROUTES } from './routes';

// Cada página define su propio contenedor: las de auth van a sangre completa.
export function Layout() {
  useClearStaleFlash();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <Link to={ROUTES.home} className="text-lg font-semibold tracking-tight">
            Vision <span className="text-accent">Max</span>
          </Link>
          <UserSlot />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <SessionToast />
    </div>
  );
}
