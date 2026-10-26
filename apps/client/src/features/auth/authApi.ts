import type { Dispatch } from '@reduxjs/toolkit';
import type {
  AuthResponse,
  ForgotPasswordInput,
  GoogleAuthResponse,
  GoogleCompleteInput,
  LoginInput,
  MeResponse,
  MessageResponse,
  RegisterInput,
  ResetPasswordInput,
  ResetTokenValidation,
  UsernameAvailability,
} from '@vision-max/shared';
import { api } from '../../app/api';
import { onboardingStarted, sessionStarted, userUpdated } from './authSlice';
import { announce } from './session';

// Login, registro y Google dejan la sesión iniciada y avisan a las otras pestañas.
async function startSessionOnSuccess(dispatch: Dispatch, queryFulfilled: Promise<{ data: AuthResponse }>) {
  try {
    const { data } = await queryFulfilled;
    dispatch(sessionStarted(data));
    announce({ type: 'login' });
  } catch {
    // El error lo muestra el formulario.
  }
}

// Endpoints E1 a E11 de /api/auth. E4 (refresh) y E5 (logout) van por session.ts y logout.ts.
export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => startSessionOnSuccess(dispatch, queryFulfilled),
    }),
    login: build.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => startSessionOnSuccess(dispatch, queryFulfilled),
    }),
    usernameAvailable: build.query<UsernameAvailability, string>({
      query: (u) => ({ url: '/auth/username-available', params: { u } }),
      keepUnusedDataFor: 10,
    }),
    // El módulo 03 invalida el tag 'Me' al subir un avatar y el header se refresca con esto.
    getMe: build.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data.user));
        } catch {
          // Sin sesión: el header ya muestra el estado anónimo.
        }
      },
    }),
    forgotPassword: build.mutation<MessageResponse, ForgotPasswordInput>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    validateResetToken: build.query<ResetTokenValidation, string>({
      query: (token) => ({ url: '/auth/reset-password/validate', params: { token } }),
      keepUnusedDataFor: 0,
    }),
    resetPassword: build.mutation<MessageResponse, ResetPasswordInput>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    googleAuth: build.mutation<GoogleAuthResponse, { credential: string }>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.status === 'authenticated') {
            dispatch(sessionStarted(data));
            announce({ type: 'login' });
          } else {
            dispatch(onboardingStarted({ token: data.onboardingToken, prefill: data.prefill }));
          }
        } catch {
          // El error lo muestra el botón de Google.
        }
      },
    }),
    googleComplete: build.mutation<AuthResponse, GoogleCompleteInput>({
      query: (body) => ({ url: '/auth/google/complete', method: 'POST', body }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => startSessionOnSuccess(dispatch, queryFulfilled),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLazyUsernameAvailableQuery,
  useGetMeQuery,
  useForgotPasswordMutation,
  useValidateResetTokenQuery,
  useResetPasswordMutation,
  useGoogleAuthMutation,
  useGoogleCompleteMutation,
} = authApi;
