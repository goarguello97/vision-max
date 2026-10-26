import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { HttpError } from '../../http/errors';

// A6: Google Identity Services. El front manda el ID token (credential) y acá se verifica.
const client = new OAuth2Client();

export interface GoogleIdentity {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError(503, 'GOOGLE_NOT_CONFIGURED', 'El ingreso con Google no está disponible.');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    payload = undefined;
  }
  if (!payload?.sub || !payload.email) {
    throw new HttpError(401, 'GOOGLE_TOKEN_INVALID', 'No pudimos validar tu cuenta de Google. Probá de nuevo.');
  }
  if (payload.email_verified !== true) {
    throw new HttpError(
      403,
      'GOOGLE_EMAIL_UNVERIFIED',
      'No pudimos verificar tu email de Google. Registrate con email y contraseña.',
    );
  }

  // Nombre y apellido se recortan a la longitud de la columna; el usuario los puede editar después.
  return {
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    firstName: (payload.given_name ?? payload.name ?? '').trim().slice(0, 50),
    lastName: (payload.family_name ?? '').trim().slice(0, 50),
  };
}
