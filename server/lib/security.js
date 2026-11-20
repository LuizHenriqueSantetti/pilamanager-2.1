import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const makeId = () => randomUUID();
export const makeToken = () => randomBytes(32).toString('base64url');
export const digest = text => createHash('sha256').update(text).digest('hex');
export const secureEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt}$${derived.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  try {
    const [type, n, r, p, salt, hex] = stored.split('$');
    if (type !== 'scrypt' || Number(n) > 65536 || Number(r) > 8 || Number(p) > 2 || !/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(hex)) return false;
    const derived = await scrypt(password, salt, 64, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(derived, Buffer.from(hex, 'hex'));
  } catch { return false; }
}
