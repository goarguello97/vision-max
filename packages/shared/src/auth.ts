import { z } from 'zod';
import { AUTH_MESSAGES, isPasswordValid, RESERVED_USERNAMES, USERNAME_REGEX } from './auth-core';

// Esquemas zod del módulo 01 (Auth). Los usan el form del cliente y la validación del server.

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const NAME_REGEX = /^[\p{L}][\p{L}\p{M} '\-]*$/u;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, AUTH_MESSAGES.usernameRequired)
  .regex(USERNAME_REGEX, AUTH_MESSAGES.usernameFormat)
  .refine((u) => !RESERVED_USERNAMES.has(u), AUTH_MESSAGES.usernameReserved);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, AUTH_MESSAGES.emailRequired)
  .max(254, AUTH_MESSAGES.emailFormat)
  .regex(EMAIL_REGEX, AUTH_MESSAGES.emailFormat);

const nameSchema = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .max(50, 'Usá hasta 50 caracteres.')
    .regex(NAME_REGEX, AUTH_MESSAGES.nameFormat);

export const firstNameSchema = nameSchema(AUTH_MESSAGES.firstNameRequired);
export const lastNameSchema = nameSchema(AUTH_MESSAGES.lastNameRequired);

export const passwordSchema = z.string().refine(isPasswordValid, AUTH_MESSAGES.passwordPolicy);

export const passwordEqualsIdentity = (password: string, ...identities: string[]) =>
  identities.some((id) => id.length > 0 && password.trim().toLowerCase() === id.toLowerCase());

const registerFields = {
  username: usernameSchema,
  email: emailSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  password: passwordSchema,
};

// Body de POST /api/auth/register (E1).
export const registerSchema = z.object(registerFields).refine(
  (v) => !passwordEqualsIdentity(v.password, v.email, v.username),
  { message: AUTH_MESSAGES.passwordEqualsIdentity, path: ['password'] },
);

// El form suma la confirmación, que nunca viaja al server.
export const registerFormSchema = z
  .object({ ...registerFields, confirmPassword: z.string() })
  .refine((v) => !passwordEqualsIdentity(v.password, v.email, v.username), {
    message: AUTH_MESSAGES.passwordEqualsIdentity,
    path: ['password'],
    when: (payload) => whenFieldsValid(payload, ['password', 'email', 'username']),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: AUTH_MESSAGES.passwordMismatch,
    path: ['confirmPassword'],
    when: (payload) => whenFieldsValid(payload, ['confirmPassword']),
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, AUTH_MESSAGES.passwordRequired),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const resetPasswordFormSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: AUTH_MESSAGES.passwordMismatch,
    path: ['confirmPassword'],
    when: (payload) => whenFieldsValid(payload, ['confirmPassword']),
  });

export const googleAuthSchema = z.object({ credential: z.string().min(1) });

const googleCompleteFields = {
  username: usernameSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
};

export const googleCompleteFormSchema = z.object(googleCompleteFields);
export const googleCompleteSchema = z.object({
  onboardingToken: z.string().min(1),
  ...googleCompleteFields,
});

// zod 4 no corre los refine del objeto si algún campo falló; con `when` el chequeo cruzado
// se muestra apenas los campos que mira son válidos, sin esperar al resto del form.
function whenFieldsValid(payload: { issues: ReadonlyArray<{ path?: PropertyKey[] }> }, keys: string[]) {
  return !payload.issues.some((issue) => keys.includes(String(issue.path?.[0])));
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type GoogleCompleteInput = z.infer<typeof googleCompleteSchema>;
// Valores de los formularios del cliente (incluyen la confirmación de contraseña).
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
export type GoogleCompleteFormInput = z.infer<typeof googleCompleteFormSchema>;

