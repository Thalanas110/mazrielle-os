export type VaultState = 'signed_out' | 'setup_required' | 'locked' | 'unlocked';

export interface VaultStateInput {
  session: { userId: string } | null;
  hasVault: boolean;
  unlocked: boolean;
}

export function nextVaultState({ session, hasVault, unlocked }: VaultStateInput): VaultState {
  if (!session) return 'signed_out';
  if (!hasVault) return 'setup_required';
  return unlocked ? 'unlocked' : 'locked';
}
