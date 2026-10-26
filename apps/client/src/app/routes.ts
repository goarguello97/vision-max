// Mapa de rutas acordado en docs/specs/00-decisiones.md.
export const ROUTES = {
  home: '/',
  search: '/buscar',
  explore: '/explorar',
  movie: '/pelicula/:id',
  tv: '/serie/:id',
  login: '/ingresar',
  register: '/registro',
  forgotPassword: '/recuperar-contrasena',
  resetPassword: '/restablecer-contrasena',
  completeProfile: '/completar-perfil',
  myProfile: '/perfil',
  users: '/usuarios',
  userProfile: '/u/:username',
} as const;

// RN-37: rutas que exigen login (redirigen a /ingresar?next=…).
export const PROTECTED_ROUTES = [ROUTES.myProfile, ROUTES.users, ROUTES.userProfile];

export const AUTH_ROUTES: readonly string[] = [
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.completeProfile,
];

export const userProfilePath = (username: string) => `/u/${encodeURIComponent(username)}`;
