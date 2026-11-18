import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'COLE_SUA_ANON_KEY_AQUI' &&
    !supabaseAnonKey.includes('COLE_')
);

export const supabase = createClient(
  supabaseUrl || 'https://tuxvpzeciwxgxhmcrprt.supabase.co',
  isSupabaseConfigured
    ? supabaseAnonKey
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.anon.key'
);
