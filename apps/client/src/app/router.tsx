import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAuth } from '../features/auth/guards';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { StatusPage } from '../pages/StatusPage';
import { Layout } from './Layout';
import { ROUTES } from './routes';

// Las pantallas de auth cargan aparte: traen react-hook-form y los esquemas zod, que el catálogo no usa.
const authPage = (load: () => Promise<Record<string, React.ComponentType>>, name: string) => async () => ({
  Component: (await load())[name],
});

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <StatusPage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: ROUTES.login, lazy: authPage(() => import('../features/auth/pages/LoginPage'), 'LoginPage') },
          { path: ROUTES.register, lazy: authPage(() => import('../features/auth/pages/RegisterPage'), 'RegisterPage') },
          {
            path: ROUTES.forgotPassword,
            lazy: authPage(() => import('../features/auth/pages/ForgotPasswordPage'), 'ForgotPasswordPage'),
          },
          {
            path: ROUTES.completeProfile,
            lazy: authPage(() => import('../features/auth/pages/CompleteProfilePage'), 'CompleteProfilePage'),
          },
        ],
      },
      // Con sesión iniciada, la página cierra la sesión antes de mostrar el form (caso borde 11).
      {
        path: ROUTES.resetPassword,
        lazy: authPage(() => import('../features/auth/pages/ResetPasswordPage'), 'ResetPasswordPage'),
      },
      {
        element: <RequireAuth />,
        children: [
          { path: ROUTES.myProfile, element: <ComingSoonPage title="Mi perfil" /> },
          { path: ROUTES.users, element: <ComingSoonPage title="Buscar usuarios" /> },
          { path: ROUTES.userProfile, element: <ComingSoonPage title="Perfil" /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
