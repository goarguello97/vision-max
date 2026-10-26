import { CaretDownIcon, HeartIcon, SignOutIcon, UserIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router';
import { AUTH_ROUTES, PROTECTED_ROUTES, ROUTES, userProfilePath } from '../../../app/routes';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { Avatar } from '../../../components/Avatar';
import { logout } from '../logout';

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none';

// Slot de usuario del header (mockups 8.9 y 8.11): skeleton, anónimo o avatar con menú.
export function UserSlot() {
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();

  if (status === 'idle' || status === 'bootstrapping') {
    return <span aria-hidden className="h-9 w-24 animate-pulse rounded-lg bg-raised" />;
  }
  if (!user) {
    // Sin sesión, "Ingresar" vuelve a la página actual después del login (salvo desde "/" o desde auth).
    const skipNext = location.pathname === ROUTES.home || AUTH_ROUTES.includes(location.pathname);
    const next = skipNext ? '' : `?next=${encodeURIComponent(location.pathname + location.search)}`;
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <Link to={`${ROUTES.login}${next}`} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg">
          Ingresar
        </Link>
        <Link
          to={ROUTES.register}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent transition-[background-color,transform] hover:bg-accent-strong active:scale-[0.98]"
        >
          Registrate
        </Link>
      </div>
    );
  }
  return <UserMenu />;
}

function UserMenu() {
  const user = useAppSelector((s) => s.auth.user)!;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLAnchorElement>(null);

  // Se cierra al navegar, con Escape y al hacer click afuera.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // RN-25: después del logout se va a "/", o a /ingresar si se estaba en una ruta protegida.
  const onLogout = () => {
    const onProtected = PROTECTED_ROUTES.some((pattern) => matchPath(pattern, location.pathname));
    logout(dispatch);
    navigate(onProtected ? ROUTES.login : ROUTES.home, { replace: true });
  };

  const fullName = `${user.firstName} ${user.lastName}`;
  const panelMotion = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 }, transition: { duration: 0.16 } };

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Menú de ${fullName}`}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Avatar src={user.avatarUrl} firstName={user.firstName} lastName={user.lastName} />
        <CaretDownIcon aria-hidden className={`size-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} weight="bold" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile: bottom sheet con fondo atenuado. Desktop: dropdown anclado al avatar. */}
            <motion.div
              key="scrim"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/70 md:hidden"
            />
            <motion.div
              key="panel"
              id={panelId}
              {...panelMotion}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:absolute md:inset-x-auto md:top-full md:right-0 md:bottom-auto md:mt-2 md:w-60 md:rounded-2xl md:border md:shadow-[0_24px_60px_-20px_oklch(0.08_0.01_270/0.9)]"
            >
              <span aria-hidden className="mx-auto mb-2 block h-1 w-10 rounded-full bg-line md:hidden" />
              <div className="px-3 py-2">
                <p className="truncate font-medium">
                  <span className="md:hidden">{fullName}</span>
                  <span className="hidden md:inline">
                    {user.firstName} {user.lastName.charAt(0)}.
                  </span>
                </p>
                <p className="truncate text-sm text-muted">@{user.username}</p>
              </div>
              <div className="my-1 h-px bg-line" />
              <nav aria-label="Cuenta">
                <Link ref={firstItem} to={userProfilePath(user.username)} className={itemClass}>
                  <UserIcon aria-hidden className="size-4.5 text-muted" />
                  Mi perfil
                </Link>
                <Link to={ROUTES.myProfile} className={itemClass}>
                  <HeartIcon aria-hidden className="size-4.5 text-muted" />
                  Mis favoritos
                </Link>
              </nav>
              <div className="my-1 h-px bg-line" />
              <button type="button" onClick={onLogout} className={itemClass}>
                <SignOutIcon aria-hidden className="size-4.5 text-muted" />
                Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
