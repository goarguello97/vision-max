import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

// Fondo cinematográfico de las pantallas de auth. Con imágenes arma un collage de backdrops
// en tendencia (los provee el módulo 02); sin ellas usa el gradiente de fallback (spec 01, §10).
function Backdrop({ images, className = '' }: { images: string[]; className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden bg-ink ${className}`}>
      {images.length > 0 ? (
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 opacity-70">
          {images.slice(0, 6).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" className="size-full object-cover" />
          ))}
        </div>
      ) : (
        <div className="size-full bg-[radial-gradient(ellipse_80%_60%_at_15%_85%,oklch(0.55_0.13_70/0.45),transparent_70%),radial-gradient(ellipse_70%_55%_at_85%_10%,oklch(0.45_0.08_250/0.5),transparent_70%),radial-gradient(ellipse_50%_40%_at_60%_55%,oklch(0.35_0.06_20/0.35),transparent_75%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ink/30 to-ink" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink" />
    </div>
  );
}

interface AuthShellProps {
  // Texto grande del panel izquierdo (solo desktop).
  headline: ReactNode;
  tagline?: string;
  // Alto de la banda superior en mobile: 160 px en login, 120 px en registro (mockup 8.10).
  mobileBand?: 'tall' | 'short';
  backdrops?: string[];
  children: ReactNode;
}

// Layout de auth: desktop split 7/5, tablet card de 480 px sobre fondo difuminado, mobile una columna.
export function AuthShell({ headline, tagline, mobileBand = 'tall', backdrops = [], children }: AuthShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative grid min-h-[calc(100dvh-4rem)] lg:grid-cols-12">
      {/* El panel queda fijo mientras el form (más alto que la pantalla en registro) scrollea. */}
      <aside className="relative hidden lg:col-span-7 lg:block">
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] items-end">
          <Backdrop images={backdrops} />
          <div className="relative max-w-xl px-12 pb-16">
            <h2 className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance">{headline}</h2>
            {tagline && <p className="mt-4 max-w-[36ch] text-lg leading-relaxed text-muted">{tagline}</p>}
          </div>
        </div>
      </aside>

      {/* Tablet: el mismo fondo, difuminado detrás de la card centrada. */}
      <Backdrop images={backdrops} className="hidden blur-2xl md:block lg:hidden" />

      <div className="relative lg:col-span-5">
        <div className={`relative md:hidden ${mobileBand === 'tall' ? 'h-40' : 'h-30'}`}>
          <Backdrop images={backdrops} />
        </div>
        <div className="flex justify-center px-4 pb-8 md:items-center md:px-8 md:py-16 lg:min-h-full lg:px-12">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="-mt-6 w-full max-w-[480px] md:mt-0 md:rounded-2xl md:border md:border-line md:bg-surface/90 md:p-8 md:shadow-[0_24px_80px_-24px_oklch(0.08_0.01_270/0.8)] md:backdrop-blur lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="mt-2 leading-relaxed text-muted">{description}</p>}
    </header>
  );
}

// En mobile el CTA principal queda pegado al fondo de la pantalla (mockup 8.10).
export function StickyCta({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      {children}
    </div>
  );
}
