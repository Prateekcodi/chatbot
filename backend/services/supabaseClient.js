const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Prefer service role key for server-side inserts if available
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getSupabase() {
  if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Supabase not configured: missing URL or keys');
    return null;
  }
  if (!supabase) {
    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    supabase = createClient(SUPABASE_URL, key, {
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
      console.error('Supabase insert error:', error.message);
      return { saved: false, error: error.message };
    }
    return { saved: true };
  } catch (err) {
    console.error('Supabase insert exception:', err.message);
    return { saved: false, error: err.message };
  }
}

async function fetchConversations({ page = 1, limit = 20, type } = {}) {
  const client = getSupabase();
  if (!client) {
    return { data: [], total: 0, error: 'Supabase not configured' };
  }
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  try {
    let query = client
      .from('conversations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Supabase fetch error:', error.message);
      return { data: [], total: 0, error: error.message };
    }
    return { data: data || [], total: count || 0 };
  } catch (err) {
    console.error('Supabase fetch exception:', err.message);
    return { data: [], total: 0, error: err.message };
  }
}

module.exports = { getSupabase, saveConversation, fetchConversations };

