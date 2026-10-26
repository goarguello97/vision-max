import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../../config/env';

// Tokens opacos de 256 bits (refresh y reset). En la DB solo se guarda su SHA-256 en hex.
export const randomToken = () => randomBytes(32).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const hashPassword = (password: string) => bcrypt.hash(password, env.BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// RN-13: si el usuario no existe se compara igual contra un hash, para no revelarlo por el tiempo de respuesta.
const dummyHash = bcrypt.hash('vision-max-dummy-password-1', env.BCRYPT_COST);
export const burnPasswordCheck = async (password: string) => {
  await bcrypt.compare(password, await dummyHash);
  return false;
};
