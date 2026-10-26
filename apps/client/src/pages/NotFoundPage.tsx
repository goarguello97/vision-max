import { Link } from 'react-router';
import { ROUTES } from '../app/routes';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-3 px-4 py-12 md:px-8">
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <Link to={ROUTES.home} className="text-accent underline-offset-4 hover:underline">
        Volver al inicio
      </Link>
    </section>
  );
}
