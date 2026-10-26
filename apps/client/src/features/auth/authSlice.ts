import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { AUTH_MESSAGES, type AuthResponse, type GooglePrefill, type PublicUser } from '@vision-max/shared';

// Estado de sesión (spec 01, §4.2). El access token vive solo acá, en memoria (A2).
export type AuthStatus = 'idle' | 'bootstrapping' | 'authenticated' | 'anonymous';

export interface Notice {
  type: 'success' | 'error' | 'security';
  message: string;
}

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  accessToken: string | null;
  onboarding: { token: string; prefill: GooglePrefill } | null;
  // Aviso de una sola vez para la pantalla `path` (ej. "Contraseña actualizada…" en /ingresar).
  // Se descarta al navegar a otra ruta (Layout), no al desmontar: StrictMode desmonta y remonta.
  flash: (Notice & { path: string }) | null;
  // Toast global (ej. sesión revocada por reuso de refresh token).
  toast: Notice | null;
}

const initialState: AuthState = {
  status: 'idle',
  user: null,
  accessToken: null,
  onboarding: null,
  flash: null,
  toast: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    bootstrapStarted(state) {
      state.status = 'bootstrapping';
    },
    sessionStarted(state, action: PayloadAction<AuthResponse>) {
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.onboarding = null;
    },
    sessionEnded(state, action: PayloadAction<{ revoked?: boolean } | undefined>) {
      state.status = 'anonymous';
      state.user = null;
      state.accessToken = null;
      if (action.payload?.revoked) {
        state.toast = { type: 'security', message: AUTH_MESSAGES.sessionRevoked };
      }
    },
    userUpdated(state, action: PayloadAction<PublicUser>) {
      state.user = action.payload;
    },
    onboardingStarted(state, action: PayloadAction<{ token: string; prefill: GooglePrefill }>) {
      state.onboarding = action.payload;
    },
    onboardingCleared(state) {
      state.onboarding = null;
    },
    flashShown(state, action: PayloadAction<Notice & { path: string }>) {
      state.flash = action.payload;
    },
    flashCleared(state) {
      state.flash = null;
    },
    toastCleared(state) {
      state.toast = null;
    },
  },
});

export const {
  bootstrapStarted,
  sessionStarted,
  sessionEnded,
  userUpdated,
  onboardingStarted,
  onboardingCleared,
  flashShown,
  flashCleared,
  toastCleared,
} = authSlice.actions;
