import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { store } from './app/store';
import { bootstrapSession } from './features/auth/session';
import './index.css';

// Rehidrata la sesión con la cookie de refresh antes del primer render de rutas protegidas.
void bootstrapSession(store.dispatch);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </Provider>
  </StrictMode>,
);
