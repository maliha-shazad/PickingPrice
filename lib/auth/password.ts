import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
// Memory-bounded scrypt: 16 MiB per operation, with increased parallelization cost.
const options = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (e, key) => e ? reject(e) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString('hex');
  return `scrypt$16384$8$5$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  const parts = stored?.split('$');
  const valid = parts?.length === 6 && parts[0] === 'scrypt' && parts[1] === '16384' && parts[2] === '8' && parts[3] === '5';
  const salt = valid ? parts[4] : '000000000000000000000000000000000000000000000000';
  const calculated = await derive(password, salt);
  const expected = valid ? Buffer.from(parts[5], 'hex') : Buffer.alloc(64);
  return !!valid && expected.length === calculated.length && timingSafeEqual(calculated, expected);
}
