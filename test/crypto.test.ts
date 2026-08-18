import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebCryptoProvider } from '../src/lib/crypto.ts';

test('encrypts and decrypts a payload with AES-256-GCM', async () => {
  const provider = createWebCryptoProvider();
  const envelope = await provider.setup('correct horse battery staple', 'recovery-key');

  await provider.unlock('correct horse battery staple', envelope);
  const encrypted = await provider.encrypt('secret payload');

  assert.notEqual(encrypted.ciphertext, 'secret payload');
  assert.equal(await provider.decrypt(encrypted), 'secret payload');
});

test('rejects a tampered encrypted payload', async () => {
  const provider = createWebCryptoProvider();
  const envelope = await provider.setup('correct horse battery staple', 'recovery-key');

  await provider.unlock('correct horse battery staple', envelope);
  const encrypted = await provider.encrypt('secret payload');
  const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext}A` };

  await assert.rejects(() => provider.decrypt(tampered));
});
