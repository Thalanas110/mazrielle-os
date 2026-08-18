import { argon2id } from 'hash-wasm';

export const CRYPTO_VERSION = 1 as const;
const AES_KEY_BYTES = 32;
const GCM_NONCE_BYTES = 12;
const SALT_BYTES = 16;

export interface EncryptedPayload {
  version: typeof CRYPTO_VERSION;
  algorithm: 'AES-256-GCM';
  nonce: string;
  ciphertext: string;
}

export interface WrappedKey {
  algorithm: 'AES-256-GCM';
  kdf: 'Argon2id';
  salt: string;
  nonce: string;
  ciphertext: string;
  memory_size: number;
  iterations: number;
  parallelism: number;
}

export interface VaultEnvelope {
  version: typeof CRYPTO_VERSION;
  password: WrappedKey;
  recovery: WrappedKey;
}

export interface VaultCryptoProvider {
  setup(masterPassword: string, recoveryKey: string): Promise<VaultEnvelope>;
  unlock(secret: string, envelope: VaultEnvelope): Promise<void>;
  lock(): void;
  isUnlocked(): boolean;
  encrypt(plaintext: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): Promise<string>;
}

const KDF_OPTIONS = {
  memorySize: 19_456,
  iterations: 2,
  parallelism: 1,
  hashLength: AES_KEY_BYTES,
} as const;

function webCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is required for vault encryption');
  }
  return globalThis.crypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  webCrypto().getRandomValues(bytes);
  return bytes;
}

async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await argon2id({
    ...KDF_OPTIONS,
    password: secret,
    salt,
    outputType: 'binary',
  });
  return webCrypto().subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function wrapBytes(secret: string, bytes: Uint8Array): Promise<WrappedKey> {
  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(GCM_NONCE_BYTES);
  const key = await deriveKey(secret, salt);
  const ciphertext = await webCrypto().subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, bytes);
  return {
    algorithm: 'AES-256-GCM',
    kdf: 'Argon2id',
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    ...KDF_OPTIONS,
  };
}

async function unwrapBytes(secret: string, wrapped: WrappedKey): Promise<Uint8Array> {
  const key = await deriveKey(secret, fromBase64(wrapped.salt));
  const plaintext = await webCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(wrapped.nonce) },
    key,
    fromBase64(wrapped.ciphertext),
  );
  const bytes = new Uint8Array(plaintext);
  if (bytes.byteLength !== AES_KEY_BYTES) throw new Error('Invalid vault key length');
  return bytes;
}

export function createWebCryptoProvider(): VaultCryptoProvider {
  let key: CryptoKey | null = null;

  return {
    async setup(masterPassword, recoveryKey) {
      const rawVaultKey = randomBytes(AES_KEY_BYTES);
      const envelope: VaultEnvelope = {
        version: CRYPTO_VERSION,
        password: await wrapBytes(masterPassword, rawVaultKey),
        recovery: await wrapBytes(recoveryKey, rawVaultKey),
      };
      key = await webCrypto().subtle.importKey('raw', rawVaultKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
      rawVaultKey.fill(0);
      return envelope;
    },
    async unlock(secret, envelope) {
      const wrapped = await unwrapBytes(secret, envelope.password).catch(() => unwrapBytes(secret, envelope.recovery));
      key = await webCrypto().subtle.importKey('raw', wrapped, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
      wrapped.fill(0);
    },
    lock() {
      key = null;
    },
    isUnlocked() {
      return key !== null;
    },
    async encrypt(plaintext) {
      if (!key) throw new Error('Vault is locked');
      const nonce = randomBytes(GCM_NONCE_BYTES);
      const ciphertext = await webCrypto().subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        key,
        new TextEncoder().encode(plaintext),
      );
      return {
        version: CRYPTO_VERSION,
        algorithm: 'AES-256-GCM',
        nonce: toBase64(nonce),
        ciphertext: toBase64(new Uint8Array(ciphertext)),
      };
    },
    async decrypt(payload) {
      if (!key) throw new Error('Vault is locked');
      if (payload.version !== CRYPTO_VERSION || payload.algorithm !== 'AES-256-GCM') {
        throw new Error('Unsupported encrypted payload');
      }
      const plaintext = await webCrypto().subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(payload.nonce) },
        key,
        fromBase64(payload.ciphertext),
      );
      return new TextDecoder().decode(plaintext);
    },
  };
}

