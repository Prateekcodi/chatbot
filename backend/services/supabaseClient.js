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
      auth: { persistSession: false },
      db: { schema: 'public' }
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
      // Handle different error types safely
      let errorMessage = 'Unknown error';
      try {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } catch (e) {
        errorMessage = 'Error parsing error message';
      }
      
      console.error('Supabase fetch error:', errorMessage);
      return { data: [], total: 0, error: errorMessage };
    }
    return { data: data || [], total: count || 0 };
  } catch (err) {
    console.error('Supabase fetch exception:', err.message);
    return { data: [], total: 0, error: err.message };
  }
}

async function findConversationByPrompt({ prompt, type }) {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }
  try {
    // Normalize helper: trim, lowercase, collapse internal whitespace, repeated letters, and common variations
    const normalizePrompt = (s) => {
      let normalized = (s || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/(.)\1{1,}/g, '$1') // collapse repeated letters (e.g., hiii -> hi)
        .replace(/\b(the|a|an)\s+/g, '') // remove articles (the, a, an)
        .replace(/\s+/g, ' ') // collapse whitespace again after article removal
        .trim();
      
      // Remove duplicate words after normalization
      const words = normalized.split(' ').filter(word => word.length > 0);
      const uniqueWords = [...new Set(words)];
      normalized = uniqueWords.join(' ');
      
      return normalized;
    };

    // Simple similarity function to detect typos and similar words
    const calculateSimilarity = (str1, str2) => {
      if (!str1 || !str2) return 0;
      if (str1 === str2) return 1;
      
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1;
      
      // Calculate Levenshtein distance
      const distance = levenshteinDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    };

    // Levenshtein distance calculation
    const levenshteinDistance = (str1, str2) => {
      const matrix = [];
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[str2.length][str1.length];
    };

    const target = normalizePrompt(prompt);

    // Try a quick case-insensitive exact match via ilike
    let q = client
      .from('conversations')
      .select('prompt,responses,response,model,created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .ilike('prompt', prompt);
    if (type) q = q.eq('type', type);
    let { data, error } = await q;
    if (error) {
      console.error('Supabase find error (ilike):', error.message);
    }
    // If ilike didn't find or whitespace differs, fetch recent and compare normalized
    if (!data || data.length === 0 || normalizePrompt(data[0]?.prompt) !== target) {
      let q2 = client
        .from('conversations')
        .select('prompt,responses,response,model,created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (type) q2 = q2.eq('type', type);
      const { data: recent, error: err2 } = await q2;
      if (err2) {
        console.error('Supabase find error (recent):', err2.message);
        return { data: null, error: err2.message };
      }
      
      // First try exact normalized match
      let found = (recent || []).find(row => normalizePrompt(row.prompt) === target);
      
      // If no exact match, try similarity matching for typos
      if (!found) {
        let bestMatch = null;
        let bestSimilarity = 0;
        const SIMILARITY_THRESHOLD = 0.8; // 80% similarity threshold
        
        for (const row of recent || []) {
          const normalizedRow = normalizePrompt(row.prompt);
          const similarity = calculateSimilarity(target, normalizedRow);
          
          if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
            bestSimilarity = similarity;
            bestMatch = row;
          }
        }
        
        if (bestMatch) {
          console.log(`🎯 Found similar cached question: "${bestMatch.prompt}" (similarity: ${(bestSimilarity * 100).toFixed(1)}%)`);
          found = bestMatch;
        }
      }
      
      // If still no match, try AI-powered semantic similarity using Gemini
      if (!found) {
        try {
          const geminiService = require('./geminiService');
          
          // Get recent questions for AI comparison
          const recentQuestions = (recent || []).slice(0, 10).map(row => row.prompt);
          
          if (recentQuestions.length > 0) {
            // Use Gemini to check if the new question matches any existing question
            const aiCheckPrompt = `You are a cache system. Check if the NEW QUESTION is semantically similar to any of the EXISTING QUESTIONS.

NEW QUESTION: "${prompt}"

EXISTING QUESTIONS:
${recentQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Rules:
- If the NEW QUESTION is asking for the same information as any EXISTING QUESTION, respond with: MATCH: [number]
- If no match found, respond with: NO_MATCH
- Consider synonyms, paraphrases, typos, and different ways of asking the same thing
- Be strict - only match if they're asking for essentially the same information

Examples:
- "what is quantum physics" matches "explain quantum mechanics" → MATCH: 1
- "how does light work" matches "what is light" → MATCH: 2
- "tell me about cars" does NOT match "what is quantum physics" → NO_MATCH

Response:`;

            const aiResponse = await geminiService.generateResponse(aiCheckPrompt);
            console.log('🤖 AI Cache Check Response:', aiResponse);
            
            // Normalize response text from Gemini service
            const aiText = typeof aiResponse === 'string' 
              ? aiResponse 
              : (aiResponse && typeof aiResponse.response === 'string' ? aiResponse.response : '');
            
            // Parse AI response
            if (aiText && aiText.includes('MATCH:')) {
              const matchNumber = parseInt(aiText.match(/MATCH:\s*(\d+)/)?.[1]);
              if (matchNumber && matchNumber > 0 && matchNumber <= recentQuestions.length) {
                const matchedQuestion = recentQuestions[matchNumber - 1];
                const matchedRow = (recent || []).find(row => row.prompt === matchedQuestion);
                
                if (matchedRow) {
                  console.log(`🤖 AI found matching cached question: "${matchedRow.prompt}"`);
                  found = matchedRow;
                }
              }
            }
          }
        } catch (aiError) {
          console.error('AI cache check failed:', aiError.message);
          // Fallback to embedding-based matching if AI check fails
          try {
            const geminiService = require('./geminiService');
            const embedding = await geminiService.embed(target);
            
            const { data: semanticMatches } = await matchQuestions({ 
              queryEmbedding: embedding, 
              matchThreshold: 0.8, 
              matchCount: 1 
            });
            
            if (semanticMatches && semanticMatches.length > 0 && semanticMatches[0].similarity > 0.8) {
              const semanticMatch = (recent || []).find(row => 
                row.prompt === semanticMatches[0].question || 
                normalizePrompt(row.prompt) === normalizePrompt(semanticMatches[0].question)
              );
              
              if (semanticMatch) {
                console.log(`🧠 Fallback: Found semantically similar cached question: "${semanticMatch.prompt}" (similarity: ${(semanticMatches[0].similarity * 100).toFixed(1)}%)`);
                found = semanticMatch;
              }
            }
          } catch (embedError) {
            console.error('Fallback semantic matching also failed:', embedError.message);
          }
        }
      }
      
      return { data: found };
    }
    return { data: data[0] };
  } catch (err) {
    console.error('Supabase find exception:', err.message);
    return { data: null, error: err.message };
  }
}

module.exports = { getSupabase, saveConversation, fetchConversations, findConversationByPrompt };
 
// --- QA pairs helpers ---
async function matchQuestions({ queryEmbedding, matchThreshold = 0.85, matchCount = 1 }) {
  const client = getSupabase();
  if (!client) return { data: [], error: 'Supabase not configured' };
  try {
    const { data, error } = await client.rpc('match_questions', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });
    if (error) return { data: [], error: error.message };
    return { data: data || [] };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

async function insertQAPair({ question, embedding, answer }) {
  const client = getSupabase();
  if (!client) return { error: 'Supabase not configured' };
  try {
    const { error } = await client.from('qa_pairs').insert([{ question, embedding, answer }]);
    if (error) return { error: error.message };
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports.matchQuestions = matchQuestions;
module.exports.insertQAPair = insertQAPair;

