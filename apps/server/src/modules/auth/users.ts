import { RESERVED_USERNAMES, USERNAME_REGEX, type PublicUser } from '@vision-max/shared';
import { env } from '../../config/env';
import { User } from './models';

// URL pública del avatar en Supabase Storage. Helper único: lo reutiliza el módulo 03.
export function avatarUrl(user: Pick<User, 'avatarKey' | 'avatarUpdatedAt'>): string | null {
  if (!user.avatarKey || !env.SUPABASE_URL) return null;
  const base = `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_AVATARS_BUCKET}/${user.avatarKey}`;
  const version = user.avatarUpdatedAt ? Math.floor(user.avatarUpdatedAt.getTime() / 1000) : 0;
  return `${base}?v=${version}`;
}

// hasPassword sale del hash cuando el usuario se cargó con el scope withPassword.
export function toPublicUser(user: User, hasPassword = user.passwordHash != null): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: avatarUrl(user),
    hasPassword,
    hasGoogle: user.googleSub != null,
    createdAt: user.createdAt.toISOString(),
  };
}

// Para /me y /refresh: calcula hasPassword en la DB sin traer el hash al proceso.
export async function findPublicUser(id: string): Promise<PublicUser | null> {
  const user = await User.findByPk(id, {
    attributes: { include: [[User.sequelize!.literal('password_hash IS NOT NULL'), 'hasPassword']] },
  });
  return user ? toPublicUser(user, user.get('hasPassword' as keyof User) === true) : null;
}

export const isUsernameTaken = async (username: string) =>
  (await User.count({ where: { username } })) > 0;

// "gonza.97+cine@gmail.com" → "gonza_97_cine", ajustado a RN-02 y libre en la DB.
export async function suggestUsername(email: string): Promise<string> {
  let base = (email.split('@')[0] ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/, '')
    .slice(0, 20);
  if (base.length < 3) base = `${base}cinefilo`.slice(0, 20);

  const candidates = [base, ...Array.from({ length: 8 }, () => `${base.slice(0, 16)}_${randomDigits(3)}`)];
  for (const candidate of candidates) {
    if (USERNAME_REGEX.test(candidate) && !RESERVED_USERNAMES.has(candidate) && !(await isUsernameTaken(candidate))) {
      return candidate;
    }
  }
  return `${base.slice(0, 14)}_${randomDigits(5)}`;
}

const randomDigits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
