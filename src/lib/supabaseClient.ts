import { createClient } from '@supabase/supabase-js';

// Works in Vite and CRA safely
const getEnv = (viteKey: string, craKey: string) => {
  // Vite at build-time
  // @ts-ignore
  const viteVal = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey];
  // CRA at build-time
  // @ts-ignore
  const craVal = typeof process !== 'undefined' && process.env && process.env[craKey];
  return viteVal || craVal || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  // Helpful console message without leaking secrets
  console.error('Supabase env vars missing. Check Netlify env + rebuild.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

