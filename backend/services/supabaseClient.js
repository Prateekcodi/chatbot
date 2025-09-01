const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
  }
  return supabase;
}

async function saveConversation(payload) {
  const client = getSupabase();
  if (!client) {
    return { saved: false, error: 'Supabase not configured' };
  }
  try {
    const { error } = await client
      .from('conversations')
      .insert([payload]);
    if (error) {
      return { saved: false, error: error.message };
    }
    return { saved: true };
  } catch (err) {
    return { saved: false, error: err.message };
  }
}

module.exports = { getSupabase, saveConversation };

