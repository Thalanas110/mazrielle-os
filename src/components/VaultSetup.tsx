import { useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { createVault, validateMasterPassword } from '@/lib/vault';
import { copySensitiveText } from '@/lib/clipboard';

export default function VaultSetup({ ownerId, onReady }: { ownerId: string; onReady: () => void }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [stored, setStored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setup = async () => {
    const validationError = validateMasterPassword(masterPassword);
    if (validationError) { setError(validationError); return; }
    if (masterPassword !== confirmation) { setError('Master passwords do not match'); return; }
    setBusy(true); setError(null);
    try {
      setRecoveryKey(await createVault(ownerId, masterPassword));
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Could not create vault');
    } finally { setBusy(false); }
  };

  if (recoveryKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b1018] px-4 py-10 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300 text-[#07111d]"><KeyRound className="h-6 w-6" /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">One-time recovery setup</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Store this recovery key safely</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">Keep it outside Mazrielle OS, such as in your secured password document. It is the only alternate way to unlock this local vault.</p>
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><code className="break-all text-sm tracking-[0.15em] text-cyan-200">{recoveryKey}</code><button className="btn-icon shrink-0 text-white" title="Copy recovery key" onClick={() => void copySensitiveText(recoveryKey)}><Copy className="h-4 w-4" /></button></div>
          <label className="mt-6 flex items-start gap-3 text-sm text-white/70"><input type="checkbox" checked={stored} onChange={e => setStored(e.target.checked)} className="mt-0.5 rounded" /><span>I stored this recovery key somewhere secure.</span></label>
          <button className="mt-6 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07111d] disabled:opacity-40" disabled={!stored} onClick={onReady}><Check className="mr-2 inline h-4 w-4" />Open my vault</button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1018] px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 text-[#07111d]"><ShieldCheck className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Local vault setup</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your master password</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">This password is separate from your Supabase login and protects the local encrypted vault. Use a memorable passphrase of at least 14 characters.</p>
        {error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</div>}
        <div className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Master password</span><input className="input border-white/10 bg-black/20 text-white" type="password" minLength={14} value={masterPassword} onChange={e => setMasterPassword(e.target.value)} autoFocus /></label>
          <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Confirm master password</span><input className="input border-white/10 bg-black/20 text-white" type="password" minLength={14} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          <button className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07111d] disabled:opacity-40" disabled={busy} onClick={setup}>{busy ? 'Creating encrypted vault...' : 'Create encrypted vault'}</button>
        </div>
      </section>
    </main>
  );
}
