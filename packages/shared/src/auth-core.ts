// Constantes, tipos y helpers del módulo 01 (Auth) sin dependencias: el cliente los usa en el
// bundle principal sin arrastrar zod. Los esquemas viven en auth.ts.

export const AUTH_MESSAGES = {
  usernameRequired: 'Elegí un ID.',
  usernameFormat: 'Usá de 3 a 20 caracteres: letras, números o _ (empezando con letra).',
  usernameTaken: 'Ese ID ya está en uso.',
  usernameReserved: 'Ese ID no está disponible.',
  emailRequired: 'Ingresá tu email.',
  emailFormat: 'Ingresá un email válido.',
  emailTaken: 'Ya existe una cuenta con este email. ¿Querés iniciar sesión?',
  emailGoogleOnly: 'Esta cuenta se creó con Google. Continuá con Google.',
  firstNameRequired: 'Ingresá tu nombre.',
  lastNameRequired: 'Ingresá tu apellido.',
  nameFormat: "Usá solo letras, espacios, ' o -.",
  passwordRequired: 'Ingresá tu contraseña.',
  passwordPolicy: 'Mínimo 8 caracteres, con al menos una letra y un número.',
  passwordEqualsIdentity: 'La contraseña no puede ser igual a tu email o ID.',
  passwordMismatch: 'Las contraseñas no coinciden.',
  samePassword: 'La nueva contraseña tiene que ser distinta de la actual.',
  invalidCredentials: 'Email o contraseña incorrectos',
  forgotPasswordSent:
    'Si existe una cuenta con ese email, te enviamos un link para restablecer tu contraseña.',
  passwordUpdated: 'Contraseña actualizada. Ya podés iniciar sesión.',
  sessionRevoked: 'Tu sesión se cerró por seguridad. Iniciá sesión de nuevo.',
  onboardingExpired: 'Tu sesión de Google expiró. Volvé a intentarlo.',
  googleEmailUnverified: 'No pudimos verificar tu email de Google. Registrate con email y contraseña.',
} as const;

// RN-02: el ID es la URL del perfil (/u/:username), así que no puede chocar con rutas ni marcas.
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin', 'administrator', 'root', 'api', 'tmdb', 'soporte', 'support', 'ayuda', 'help',
  'ingresar', 'registro', 'login', 'logout', 'signup', 'me', 'u', 'perfil', 'usuarios',
  'buscar', 'explorar', 'pelicula', 'peliculas', 'serie', 'series', 'favoritos', 'ajustes',
  'settings', 'cuenta', 'auth', 'staff', 'moderador', 'sistema', 'system',
  'visionmax', 'vision_max', 'null', 'undefined',
]);

export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export const PASSWORD_MIN_BYTES = 8;
export const PASSWORD_MAX_BYTES = 72;

// bcrypt trunca en 72 bytes: la longitud se mide en bytes UTF-8, no en caracteres (caso borde 5).
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export const passwordChecks = (value: string) => ({
  length: utf8ByteLength(value) >= PASSWORD_MIN_BYTES && utf8ByteLength(value) <= PASSWORD_MAX_BYTES,
  letter: /\p{L}/u.test(value),
  number: /\d/.test(value),
});

export const isPasswordValid = (value: string) => Object.values(passwordChecks(value)).every(Boolean);

// Usuario de sesión (sección 3 de la spec 01). avatarUrl es null hasta que se sube un avatar (módulo 03).
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

export interface MeResponse {
  user: PublicUser;
}

export interface UsernameAvailability {
  available: boolean;
  reason?: 'taken' | 'reserved' | 'invalid';
}

export interface MessageResponse {
  message: string;
}

export interface ResetTokenValidation {
  valid: true;
  email: string;
}

export interface GooglePrefill {
  email: string;
  firstName: string;
  lastName: string;
  suggestedUsername: string;
}

export type GoogleAuthResponse =
  | ({ status: 'authenticated' } & AuthResponse)
  | { status: 'needs_profile'; onboardingToken: string; prefill: GooglePrefill };

export const AUTH_ERROR_CODES = [
  'VALIDATION_ERROR',
  'USERNAME_TAKEN',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'TOO_MANY_ATTEMPTS',
  'NO_SESSION',
  'SESSION_EXPIRED',
  'SESSION_REVOKED',
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'RESET_TOKEN_INVALID',
  'SAME_PASSWORD',
  'GOOGLE_TOKEN_INVALID',
  'GOOGLE_EMAIL_UNVERIFIED',
  'GOOGLE_NOT_CONFIGURED',
  'ONBOARDING_EXPIRED',
  'ACCOUNT_EXISTS',
  'CSRF_CHECK_FAILED',
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

// RN-21: header extra contra CSRF en /auth/refresh y /auth/logout.
export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_HEADER_VALUE = 'tmdb-web';
