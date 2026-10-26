import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyGoogleCredential } from '../src/modules/auth/google';

// Verificación del ID token (RN-33): se simula google-auth-library para no depender de la red.
const verifyIdToken = vi.hoisted(() => vi.fn());
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

const ticket = (payload: object) => ({ getPayload: () => payload });

describe('verifyGoogleCredential', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('verifica contra GOOGLE_CLIENT_ID y normaliza los datos', async () => {
    verifyIdToken.mockResolvedValue(
      ticket({ sub: '123', email: 'Gonza@Gmail.com', email_verified: true, given_name: ' Gonzalo ', family_name: 'Argüello' }),
    );

    await expect(verifyGoogleCredential('token')).resolves.toEqual({
      sub: '123',
      email: 'gonza@gmail.com',
      firstName: 'Gonzalo',
      lastName: 'Argüello',
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: 'test-client-id.apps.googleusercontent.com',
    });
  });

  it('rechaza un email no verificado con 403 (caso borde 14)', async () => {
    verifyIdToken.mockResolvedValue(ticket({ sub: '123', email: 'g@empresa.com', email_verified: false }));

    await expect(verifyGoogleCredential('token')).rejects.toMatchObject({
      status: 403,
      body: { error: { code: 'GOOGLE_EMAIL_UNVERIFIED' } },
    });
  });

  it('rechaza un token que Google no valida con 401', async () => {
    verifyIdToken.mockImplementation(async () => {
      throw new Error('Wrong recipient');
    });

    await expect(verifyGoogleCredential('token')).rejects.toMatchObject({
      status: 401,
      body: { error: { code: 'GOOGLE_TOKEN_INVALID' } },
    });
  });
});
