import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../lib/auth/password.ts';
test('salted password hashes verify only the matching password', async () => {
    const p = 'test-only-long-password-729!';
    const a = await hashPassword(p);
    const b = await hashPassword(p);
    assert.notEqual(a, b);
    assert.equal(await verifyPassword(p, a), true);
    assert.equal(await verifyPassword('a-different-password', a), false);
    assert.equal(await verifyPassword(p, null), false);
    assert.equal(await verifyPassword(p, 'broken'), false);
});
