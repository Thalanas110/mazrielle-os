import { FormEvent, useState } from 'react';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { unlockVault } from '@/lib/vault';

export default function VaultUnlock({ ownerId, onUnlocked }: { ownerId: string; onUnlocked: () => void }) {
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try { await unlockVault(ownerId, secret); onUnlocked(); }
    catch (unlockError) { setError(unlockError instanceof Error ? 'The unlock secret was rejected.' : 'Could not unlock vault'); }
    finally { setBusy(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1018] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-[#07111d]"><LockKeyhole className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Vault locked</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Unlock Mazrielle OS</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">The vault locks when the app closes or restarts. Your Supabase session does not replace this local unlock.</p>
        {error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</div>}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">{recoveryMode ? 'Recovery key' : 'Master password'}</span><input className="input border-white/10 bg-black/20 text-white" type={recoveryMode ? 'text' : 'password'} value={secret} onChange={e => setSecret(e.target.value)} required autoFocus /></label>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07111d] disabled:opacity-40" disabled={busy}>{busy ? 'Unlocking...' : 'Unlock vault'}<KeyRound className="h-4 w-4" /></button>
        </form>
        <button className="mt-5 w-full text-xs text-white/45 hover:text-white/75" onClick={() => { setRecoveryMode(!recoveryMode); setSecret(''); setError(null); }}>{recoveryMode ? 'Use master password instead' : 'Use recovery key instead'}</button>
      </section>
    </main>
  );
}
