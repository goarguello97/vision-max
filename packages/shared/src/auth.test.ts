import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  firstNameSchema,
  loginSchema,
  passwordSchema,
  registerFormSchema,
  registerSchema,
  resetPasswordFormSchema,
  usernameSchema,
} from './auth';
import { AUTH_MESSAGES, passwordChecks, utf8ByteLength } from './auth-core';

// Casos de la sección 4.4 y de los escenarios Gherkin de la spec 01.

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error!.issues[0]!.message;

const validRegister = {
  username: 'gonza_97',
  email: 'gonza@mail.com',
  firstName: 'Gonzalo',
  lastName: 'Argüello',
  password: 'peliculas2026',
};

describe('usernameSchema (RN-02)', () => {
  it('normaliza a minúsculas y recorta espacios', () => {
    expect(usernameSchema.parse('  Cinefilo_97 ')).toBe('cinefilo_97');
  });

  it.each(['gon', 'gonza_97', 'a_b_c', 'abcdefghijklmnopqrst'])('acepta "%s"', (id) => {
    expect(usernameSchema.safeParse(id).success).toBe(true);
  });

  it.each(['ab', '9lives', 'gon.za', '_gonza', 'gonza-97', 'ñandu', 'abcdefghijklmnopqrstu'])(
    'rechaza "%s" por formato',
    (id) => {
      expect(firstMessage(usernameSchema.safeParse(id))).toBe(AUTH_MESSAGES.usernameFormat);
    },
  );

  it.each(['admin', 'Admin', 'perfil', 'visionmax', 'vision_max', 'undefined'])('rechaza el reservado "%s"', (id) => {
    expect(firstMessage(usernameSchema.safeParse(id))).toBe(AUTH_MESSAGES.usernameReserved);
  });

  it('pide un ID si está vacío', () => {
    expect(firstMessage(usernameSchema.safeParse('  '))).toBe(AUTH_MESSAGES.usernameRequired);
  });
});

describe('emailSchema (RN-04)', () => {
  it('normaliza espacios y mayúsculas (casos borde 3 y 4)', () => {
    expect(emailSchema.parse(' GONZA@Mail.com ')).toBe('gonza@mail.com');
  });

  it.each(['gonza', 'gonza@', '@mail.com', 'gonza@mail', 'gon za@mail.com'])('rechaza "%s"', (email) => {
    expect(firstMessage(emailSchema.safeParse(email))).toBe(AUTH_MESSAGES.emailFormat);
  });

  it('pide el email si está vacío', () => {
    expect(firstMessage(emailSchema.safeParse(''))).toBe(AUTH_MESSAGES.emailRequired);
  });

  it('rechaza más de 254 caracteres', () => {
    expect(emailSchema.safeParse(`${'a'.repeat(250)}@mail.com`).success).toBe(false);
  });
});

describe('nombre y apellido (RN-05)', () => {
  it.each(['Gonzalo', 'María José', "O'Brien", 'Pérez-Ñúñez', 'Zoë'])('acepta "%s"', (name) => {
    expect(firstNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(['Gonza97', 'Ana 🎬', '-Ana', 'Ana_Maria'])('rechaza "%s"', (name) => {
    expect(firstMessage(firstNameSchema.safeParse(name))).toBe(AUTH_MESSAGES.nameFormat);
  });

  it('recorta y exige al menos un carácter', () => {
    expect(firstNameSchema.parse('  Ana  ')).toBe('Ana');
    expect(firstMessage(firstNameSchema.safeParse('   '))).toBe(AUTH_MESSAGES.firstNameRequired);
  });

  it('rechaza más de 50 caracteres', () => {
    expect(firstNameSchema.safeParse('a'.repeat(51)).success).toBe(false);
  });
});

describe('política de contraseña (RN-06, A9)', () => {
  it.each(['abc12', 'soloLetras', '12345678'])('rechaza "%s"', (password) => {
    expect(firstMessage(passwordSchema.safeParse(password))).toBe(AUTH_MESSAGES.passwordPolicy);
  });

  it('acepta 8 caracteres con letra y número', () => {
    expect(passwordSchema.safeParse('pelis202').success).toBe(true);
  });

  it('mide el largo en bytes UTF-8, no en caracteres (caso borde 5)', () => {
    expect(utf8ByteLength('ñ')).toBe(2);
    expect(utf8ByteLength('🎬')).toBe(4);
    // "a1" + 17 emojis = 19 caracteres y 70 bytes; con 18 emojis son 74 bytes y se pasa del límite.
    expect(passwordSchema.safeParse(`a1${'🎬'.repeat(17)}`).success).toBe(true);
    expect(passwordSchema.safeParse(`a1${'🎬'.repeat(18)}`).success).toBe(false);
  });

  it('el checklist informa cada requisito por separado', () => {
    expect(passwordChecks('abc')).toEqual({ length: false, letter: true, number: false });
    expect(passwordChecks('peliculas2026')).toEqual({ length: true, letter: true, number: true });
  });
});

describe('registerSchema (E1)', () => {
  it('acepta un registro válido y normaliza ID y email', () => {
    expect(registerSchema.parse({ ...validRegister, username: 'Gonza_97', email: ' Gonza@Mail.com' })).toMatchObject({
      username: 'gonza_97',
      email: 'gonza@mail.com',
    });
  });

  it('rechaza una contraseña igual al email', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'gonza1@mail.com', password: 'Gonza1@mail.com' });
    expect(result.error!.issues[0]).toMatchObject({ path: ['password'], message: AUTH_MESSAGES.passwordEqualsIdentity });
  });

  it('rechaza una contraseña igual al ID', () => {
    const result = registerSchema.safeParse({ ...validRegister, username: 'clave2026', password: 'Clave2026' });
    expect(result.error!.issues[0]).toMatchObject({ path: ['password'], message: AUTH_MESSAGES.passwordEqualsIdentity });
  });

  it('devuelve un mensaje por campo inválido', () => {
    const result = registerSchema.safeParse({ username: 'ab', email: 'x', firstName: '', lastName: 'A1', password: '123' });
    const fields = new Set(result.error!.issues.map((issue) => issue.path[0]));
    expect(fields).toEqual(new Set(['username', 'email', 'firstName', 'lastName', 'password']));
  });
});

describe('registerFormSchema (formulario)', () => {
  it('marca la confirmación distinta en confirmPassword', () => {
    const result = registerFormSchema.safeParse({ ...validRegister, confirmPassword: 'peliculas2025' });
    expect(result.error!.issues).toEqual([
      expect.objectContaining({ path: ['confirmPassword'], message: AUTH_MESSAGES.passwordMismatch }),
    ]);
  });

  it('muestra la confirmación distinta aunque otros campos tengan error (mockup 8.2)', () => {
    const result = registerFormSchema.safeParse({
      ...validRegister,
      username: 'ab',
      password: 'abc12',
      confirmPassword: 'abc13',
    });
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain(AUTH_MESSAGES.passwordMismatch);
    expect(messages).toContain(AUTH_MESSAGES.usernameFormat);
  });

  it('no repite la regla email/ID si la contraseña ya no cumple la política', () => {
    const result = registerFormSchema.safeParse({ ...validRegister, password: 'abc', confirmPassword: 'abc' });
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toEqual([AUTH_MESSAGES.passwordPolicy]);
  });
});

describe('resetPasswordFormSchema', () => {
  it('exige política y coincidencia', () => {
    expect(resetPasswordFormSchema.safeParse({ password: 'nuevaClave2026', confirmPassword: 'nuevaClave2026' }).success).toBe(true);
    const result = resetPasswordFormSchema.safeParse({ password: 'nuevaClave2026', confirmPassword: 'otra' });
    expect(result.error!.issues[0]).toMatchObject({ path: ['confirmPassword'], message: AUTH_MESSAGES.passwordMismatch });
  });
});

describe('loginSchema (E3)', () => {
  it('no aplica la política de contraseña en el login', () => {
    expect(loginSchema.safeParse({ email: 'gonza@mail.com', password: 'x' }).success).toBe(true);
  });

  it('pide la contraseña', () => {
    expect(firstMessage(loginSchema.safeParse({ email: 'gonza@mail.com', password: '' }))).toBe(
      AUTH_MESSAGES.passwordRequired,
    );
  });
});
