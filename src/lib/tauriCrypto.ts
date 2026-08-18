import { invoke } from '@tauri-apps/api/core';
import type { EncryptedPayload, VaultCryptoProvider, VaultEnvelope } from './crypto.ts';

export function createTauriCryptoProvider(): VaultCryptoProvider {
  let unlocked = false;

  return {
    setup(masterPassword, recoveryKey) {
      return invoke<VaultEnvelope>('vault_setup', { masterPassword, recoveryKey }).then(envelope => {
        unlocked = true;
        return envelope;
      });
    },
    unlock(secret, envelope) {
      return invoke<void>('vault_unlock', { secret, envelope }).then(() => { unlocked = true; });
    },
    lock() {
      unlocked = false;
      void invoke('vault_lock');
    },
    isUnlocked() {
      return unlocked;
    },
    encrypt(plaintext) {
      if (!unlocked) return Promise.reject(new Error('Vault is locked'));
      return invoke<EncryptedPayload>('vault_encrypt', { plaintext });
    },
    decrypt(payload) {
      if (!unlocked) return Promise.reject(new Error('Vault is locked'));
      return invoke<string>('vault_decrypt', { payload });
    },
  };
}
