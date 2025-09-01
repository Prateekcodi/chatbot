import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase env vars missing. Check Netlify env + rebuild.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

