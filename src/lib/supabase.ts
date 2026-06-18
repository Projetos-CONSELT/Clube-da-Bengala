import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(url && anonKey);
const supabaseConfigError = new Error(
  '[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes.'
);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes.');
}

const createMissingQuery = () => ({
  select: async () => {
    throw supabaseConfigError;
  },
  insert: async () => {
    throw supabaseConfigError;
  },
  update: async () => {
    throw supabaseConfigError;
  },
  delete: async () => {
    throw supabaseConfigError;
  },
  upsert: async () => {
    throw supabaseConfigError;
  },
  eq: () => createMissingQuery(),
  match: () => createMissingQuery(),
  order: () => createMissingQuery(),
  limit: () => createMissingQuery(),
  maybeSingle: async () => {
    throw supabaseConfigError;
  },
  single: async () => {
    throw supabaseConfigError;
  },
});

const missingClient = {
  auth: {
    async getSession() {
      return { data: { session: null }, error: supabaseConfigError };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword() {
      throw supabaseConfigError;
    },
    async signUp() {
      throw supabaseConfigError;
    },
    async signOut() {
      return { error: supabaseConfigError };
    },
    async getUser() {
      return { data: { user: null }, error: supabaseConfigError };
    },
  },
  from() {
    return createMissingQuery();
  },
} as unknown as SupabaseClient<Database>;

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : missingClient;

export { isSupabaseConfigured, supabaseConfigError };

export default supabase;
