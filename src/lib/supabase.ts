import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { getAuthRedirectUrl } from './supabaseConfig.ts';
import type { Database } from './supabase.types';

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const supabaseUrl = runtimeEnv?.VITE_SUPABASE_URL;
const supabaseAnonKey = runtimeEnv?.VITE_SUPABASE_ANON_KEY;
const configuredRedirectUrl = runtimeEnv?.VITE_SUPABASE_REDIRECT_URL;

let client: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function authRedirectUrl(): string | undefined {
  return getAuthRedirectUrl(configuredRedirectUrl, typeof window === 'undefined' ? undefined : window.location.origin);
}

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
  if (!client) {
    client = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: false,
      },
    });
  }
  return client;
}

export async function signIn(email: string, password: string): Promise<{ session: Session | null }> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { session: data.session };
}

export async function signUp(email: string, password: string): Promise<{ session: Session | null }> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
  });
  if (error) throw error;
  return { session: data.session };
}

export async function resetPassword(email: string): Promise<void> {
  const redirectTo = authRedirectUrl();
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export function subscribeToAuth(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
