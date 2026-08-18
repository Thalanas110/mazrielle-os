import { FormEvent, useState } from 'react';
import { ArrowRight, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { resetPassword, signIn, signUp } from '@/lib/supabase';

type AuthMode = 'sign_in' | 'sign_up' | 'reset';

export default function AuthPage({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setMessage('Check your email for a password reset link.');
      } else if (mode === 'sign_up') {
        const { session } = await signUp(email, password);
        setMessage(session ? 'Account created.' : 'Account created. Verify your email before signing in.');
      } else {
        await signIn(email, password);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1018] px-4 py-10 text-white">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 shadow-lg shadow-blue-950/40">
                <ShieldCheck className="h-6 w-6 text-[#07111d]" />
              </div>
              <div>
                <div className="font-semibold tracking-tight">Mazrielle OS</div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Private workspace</div>
              </div>
            </div>
            <div className="mt-24 max-w-md">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Your data, your keys</p>
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">A quieter place for the things that matter.</h1>
              <p className="mt-6 max-w-sm text-sm leading-6 text-white/55">Sign in to your Mazrielle account, then unlock your local vault with a separate master password.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40"><Sparkles className="h-4 w-4 text-cyan-300" /> AES-256-GCM encrypted local storage</div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-600"><ShieldCheck className="h-5 w-5 text-[#07111d]" /></div>
            <span className="font-semibold">Mazrielle OS</span>
          </div>
          <div className="mx-auto max-w-sm">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{mode === 'reset' ? 'Account recovery' : 'Secure sign-in'}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">{mode === 'sign_up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">{mode === 'reset' ? 'We will send a reset link to your Supabase account email.' : 'Authentication is required before a local vault can be created.'}</p>
            </div>

            {!configured && <div className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to continue.</div>}
            {error && <div className="mb-5 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</div>}
            {message && <div className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">{message}</div>}

            <form className="space-y-4" onSubmit={submit}>
              <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Email</span><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input className="input border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/25" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!configured || busy} /></div></label>
              {mode !== 'reset' && <label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Password</span><input className="input border-white/10 bg-black/20 text-white placeholder:text-white/25" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required disabled={!configured || busy} /></label>}
              <button className="group flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07111d] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40" disabled={!configured || busy}>
                {busy ? 'Working...' : mode === 'sign_up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/45">
              {mode !== 'sign_in' && <button onClick={() => { setMode('sign_in'); setMessage(null); setError(null); }}>Sign in</button>}
              {mode !== 'sign_up' && <button onClick={() => { setMode('sign_up'); setMessage(null); setError(null); }}>Create account</button>}
              {mode !== 'reset' && <button onClick={() => { setMode('reset'); setMessage(null); setError(null); }}>Forgot password?</button>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
