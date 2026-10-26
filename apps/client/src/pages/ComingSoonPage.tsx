import { Link } from 'react-router';
import { ROUTES } from '../app/routes';

// Ocupa las rutas protegidas del módulo 03 (Favoritos y perfiles) hasta que se implementen.
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-7xl space-y-3 px-4 py-12 md:px-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted">Esta sección todavía está en construcción.</p>
      <Link to={ROUTES.home} className="inline-block text-accent underline-offset-4 hover:underline">
        Volver al inicio
      </Link>
    </section>
  );
}
