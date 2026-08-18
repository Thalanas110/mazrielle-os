import { createWebCryptoProvider, type VaultCryptoProvider } from './crypto.ts';

let provider: VaultCryptoProvider | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getVaultCryptoProvider(): Promise<VaultCryptoProvider> {
  if (provider) return provider;
  if (isTauriRuntime()) {
    const module = await import('./tauriCrypto.ts');
    provider = module.createTauriCryptoProvider();
  } else {
    provider = createWebCryptoProvider();
  }
  return provider;
}

export function resetVaultCryptoProvider(): void {
  provider?.lock();
  provider = null;
}
