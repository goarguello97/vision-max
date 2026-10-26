import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sequelize } from '../src/db/sequelize';
import { RefreshToken } from '../src/modules/auth/models';
import { api, CSRF, login, me, refresh, refreshCookie, registerUser } from './helpers';

// Spec 01: E4 (refresh) y E5 (logout). Gherkin "Sesión persistida con tokens" y "Cerrar sesión".

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const findToken = (raw: string) => RefreshToken.findOne({ where: { tokenHash: sha256(raw) } });
const backdate = (column: 'rotated_at' | 'expires_at', raw: string, seconds: number) =>
  sequelize.query(`UPDATE refresh_tokens SET ${column} = now() - make_interval(secs => :seconds) WHERE token_hash = :hash`, {
    replacements: { seconds, hash: sha256(raw) },
  });

describe('POST /api/auth/refresh (E4)', () => {
  it('exige el header anti-CSRF (RN-21)', async () => {
    const { rt } = await registerUser();
    const res = await api().post('/api/auth/refresh').set('Cookie', `rt=${rt}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_CHECK_FAILED');
  });

  it('sin cookie responde NO_SESSION (caso borde 7)', async () => {
    const res = await refresh();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_SESSION');
  });

  it('con una cookie desconocida responde NO_SESSION y la borra', async () => {
    const res = await refresh('cualquier-cosa');
    expect(res.body.error.code).toBe('NO_SESSION');
    expect(refreshCookie(res)!.raw).toMatch(/^rt=;/);
  });

  it('guarda solo el hash del refresh token, nunca el valor (RN-17)', async () => {
    const { rt } = await registerUser();
    const [rows] = await sequelize.query('SELECT token_hash FROM refresh_tokens');

    expect(rows).toEqual([{ token_hash: sha256(rt) }]);
  });

  it('rota el token: emite uno nuevo de la misma familia y marca el anterior (RN-18)', async () => {
    const { rt, user } = await registerUser();

    const res = await refresh(rt);
    const next = refreshCookie(res)!.value;

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(next).not.toBe(rt);

    const [old, current] = await Promise.all([findToken(rt), findToken(next)]);
    expect(old!.rotatedAt).toBeInstanceOf(Date);
    expect(old!.replacedById).toBe(current!.id);
    expect(current!.familyId).toBe(old!.familyId);
    expect(current!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
  });

  it('tolera el reuso dentro de la ventana de gracia de 10 s (dos pestañas, caso borde 6)', async () => {
    const { rt } = await registerUser();
    await refresh(rt);

    const res = await refresh(rt);
    expect(res.status).toBe(200);
  });

  it('dos refresh simultáneos con la misma cookie no cierran la sesión', async () => {
    const { rt } = await registerUser();
    const results = await Promise.all([refresh(rt), refresh(rt)]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
  });

  it('el reuso fuera de la gracia revoca toda la familia (RN-19, caso borde 8)', async () => {
    const { rt } = await registerUser();
    const rotated = refreshCookie(await refresh(rt))!.value;
    await backdate('rotated_at', rt, 11);

    const reuse = await refresh(rt);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('SESSION_REVOKED');
    expect(refreshCookie(reuse)!.raw).toMatch(/^rt=;/);

    // El token legítimo (el de la víctima) también queda revocado.
    const victim = await refresh(rotated);
    expect(victim.body.error.code).toBe('SESSION_REVOKED');
  });

  it('el reuso no afecta a otras familias del mismo usuario', async () => {
    const { rt } = await registerUser();
    const other = await login();
    await refresh(rt);
    await backdate('rotated_at', rt, 11);
    await refresh(rt);

    expect((await refresh(other.rt)).status).toBe(200);
  });

  it('un refresh vencido responde SESSION_EXPIRED (caso borde 7)', async () => {
    const { rt } = await registerUser();
    await backdate('expires_at', rt, 1);

    const res = await refresh(rt);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('el access token nuevo sirve para /me', async () => {
    const { rt } = await registerUser();
    const { accessToken } = (await refresh(rt)).body;

    expect((await me(accessToken)).status).toBe(200);
  });
});

describe('POST /api/auth/logout (E5)', () => {
  const logout = (rt?: string) => {
    const req = api().post('/api/auth/logout').set(CSRF);
    return rt ? req.set('Cookie', `rt=${rt}`) : req;
  };

  it('revoca la sesión actual y borra la cookie', async () => {
    const { rt } = await registerUser();
    const res = await logout(rt);

    expect(res.status).toBe(204);
    expect(refreshCookie(res)!.raw).toMatch(/^rt=;.*Path=\/api\/auth/);
    expect((await refresh(rt)).body.error.code).toBe('SESSION_REVOKED');
  });

  it('no cierra las sesiones de otros dispositivos (RN-23)', async () => {
    const notebook = await registerUser();
    const phone = await login();

    await logout(notebook.rt);

    expect((await refresh(phone.rt)).status).toBe(200);
  });

  it('es idempotente: sin cookie o repetido responde 204', async () => {
    const { rt } = await registerUser();
    expect((await logout()).status).toBe(204);
    expect((await logout(rt)).status).toBe(204);
    expect((await logout(rt)).status).toBe(204);
  });

  it('exige el header anti-CSRF', async () => {
    const { rt } = await registerUser();
    const res = await api().post('/api/auth/logout').set('Cookie', `rt=${rt}`);
    expect(res.status).toBe(403);
  });
});
