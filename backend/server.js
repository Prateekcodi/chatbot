const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Don't import AI services at startup - import them only when needed
// const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (placed BEFORE helmet and rate limiter)
const allowedOrigins = [
  'https://chatbotcode.netlify.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 600
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middleware (relax CORP for API JSON responses)
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Explicit fallback CORS headers (defensive; some platforms strip defaults)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    const reqHeaders = req.headers['access-control-request-headers'];
    res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Rate limiting (after CORS so preflights include headers)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Debug endpoint to check environment variables
app.get('/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY_SET: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 
      `${process.env.OPENROUTER_API_KEY.substring(0, 10)}...` : 'NOT SET',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 
      `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET',
    COHERE_API_KEY: process.env.COHERE_API_KEY ? 
      `${process.env.COHERE_API_KEY.substring(0, 10)}...` : 'NOT SET',
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working',
    timestamp: new Date().toISOString()
  });
});

// Simple AI test endpoint (without importing heavy services)
app.post('/api/simple-test', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }
  
  res.json({
    prompt: prompt,
    message: 'Simple endpoint working - AI services not loaded yet',
    timestamp: new Date().toISOString()
  });
});

// Working AI endpoint with dynamic service loading
app.post('/api/ask', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid prompt. Please provide a non-empty string.' 
    });
  }

  const startTime = Date.now();
  console.log(`🤖 Processing prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

  try {
          // Cache lookup: enhanced matching for word order independence
      // Make cache lookup resilient to database errors
      let cacheLookupFailed = false;
      try {
        const { findConversationByPrompt } = require('./services/supabaseClient');

        // First try exact match
        let cached = await findConversationByPrompt({ prompt: prompt.trim(), type: 'multibot' });

        // If no exact match, try word-order-independent matching
        if (!cached || !cached.data) {
          // Create a word-set based matcher
          const normalizeForWordSet = (s) => s
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // remove punctuation
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(word => word.length > 0)
            .sort()
            .join(' ');

          const targetWordSet = normalizeForWordSet(prompt.trim());
          
          // Get recent conversations and check for word-set matches
          const { fetchConversations } = require('./services/supabaseClient');
          
          // Search multiple pages to find matches
          let found = false;
          for (let page = 1; page <= 3 && !found; page++) { // Reduced to 3 pages to minimize errors
            try {
              const { data: recent, error } = await fetchConversations({ page, limit: 50, type: 'multibot' }); // Reduced limit
              
              if (error) {
                console.error(`Supabase fetch error on page ${page}:`, error.message || error);
                cacheLookupFailed = true;
                break; // Stop searching if there's an error
              }
              
              if (recent && recent.length > 0) {
                for (const conv of recent) {
                  const convWordSet = normalizeForWordSet(conv.prompt);
                  if (convWordSet === targetWordSet) {
                    cached = { data: conv };
                    found = true;
                    break;
                  }
                }
              } else {
                break; // No more data
              }
            } catch (err) {
              console.error(`Error fetching conversations page ${page}:`, err.message);
              cacheLookupFailed = true;
              break; // Stop searching if there's an exception
            }
          }
        }

        if (cached && cached.data && cached.data.responses) {
          const r = cached.data.responses || {};
          const names = ['gemini','cohere','openrouter','glm','deepseek'];
          const allOk = names.every(n => r[n] && r[n].success === true);
          if (allOk) {
            console.log('⚡ Serving from cache (word-order-independent match, all providers succeeded)');
            return res.json({
              prompt: cached.data.prompt,
              processingTime: '0ms (cached)',
              timestamp: new Date().toISOString(),
              responses: cached.data.responses
            });
          }
        }
      } catch (err) {
        console.error('Cache lookup failed:', err.message);
        cacheLookupFailed = true;
      }

      if (cacheLookupFailed) {
        console.log('⚠️ Cache lookup failed, proceeding with AI calls...');
      }

    // Load services dynamically only when needed
    const geminiService = require('./services/geminiService');
    const cohereService = require('./services/cohereService');
    const openrouterService = require('./services/openrouterService');
    const glmService = require('./services/glmService');
    const deepseekService = require('./services/deepseekService');
    const { saveConversation } = require('./services/supabaseClient');

    // Call all AI services concurrently with individual timeouts
    const geminiPromise = Promise.race([
      geminiService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 300000))
    ]);

    const coherePromise = Promise.race([
      cohereService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cohere timeout')), 300000))
    ]);

    const openrouterPromise = Promise.race([
      openrouterService.generateResponse(prompt, 'openai/gpt-3.5-turbo'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OpenRouter timeout')), 300000))
    ]);

    const glmPromise = Promise.race([
      glmService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GLM 4.5 timeout')), 300000))
    ]);

    const deepseekPromise = Promise.race([
      deepseekService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DeepSeek 3.1 timeout')), 300000))
    ]);

    // Wait for all services with individual timeouts
    const [geminiResult, cohereResult, openrouterResult, glmResult, deepseekResult] = await Promise.allSettled([
      geminiPromise,
      coherePromise,
      openrouterPromise,
      glmPromise,
      deepseekPromise
    ]);

    const processingTime = Date.now() - startTime;
    const successfulResponses = [
      geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message || 'Failed', model: 'Gemini' },
      cohereResult.status === 'fulfilled' ? cohereResult.value : { success: false, error: cohereResult.reason?.message || 'Failed', model: 'Cohere' },
      openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message || 'Failed', model: 'OpenRouter' },
      glmResult.status === 'fulfilled' ? glmResult.value : { success: false, error: glmResult.reason?.message || 'Failed', model: 'GLM 4.5' },
      deepseekResult.status === 'fulfilled' ? deepseekResult.value : { success: false, error: deepseekResult.reason?.message || 'Failed', model: 'DeepSeek 3.1' }
    ].filter(response => response.success).length;

    console.log(`✅ Completed with ${successfulResponses}/5 successful responses in ${processingTime}ms`);

    const responsePayload = {
      prompt: prompt.trim(),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
      responses: {
        gemini: geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message || 'Failed', model: 'Gemini' },
        cohere: cohereResult.status === 'fulfilled' ? cohereResult.value : { success: false, error: cohereResult.reason?.message || 'Failed', model: 'Cohere' },
        openrouter: openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message || 'Failed', model: 'OpenRouter' },
        glm: glmResult.status === 'fulfilled' ? glmResult.value : { success: false, error: glmResult.reason?.message || 'Failed', model: 'GLM 4.5' },
        deepseek: deepseekResult.status === 'fulfilled' ? deepseekResult.value : { success: false, error: deepseekResult.reason?.message || 'Failed', model: 'DeepSeek 3.1' }
      }
    };

    // Save only if all providers succeeded, to avoid caching error runs
    const rps = responsePayload.responses || {};
    const allOkToSave = ['gemini','cohere','openrouter','glm','deepseek']
      .every(n => rps[n] && rps[n].success === true);
    if (allOkToSave) {
      saveConversation({
        type: 'multibot',
        prompt: responsePayload.prompt,
        responses: responsePayload.responses,
        processing_time_ms: processingTime,
        created_at: new Date().toISOString()
      }).then((r) => {
        if (!r?.saved) {
          console.error('Supabase save multibot failed:', r?.error);
        }
      }).catch((e) => {
        console.error('Supabase save multibot exception:', e?.message || e);
      });
    }

    res.json(responsePayload);

  } catch (error) {
    console.error('Error processing AI requests:', error);
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({ 
      error: 'Failed to process AI requests',
      message: error.message,
      processingTime: `${processingTime}ms`,
      responses: {
        gemini: { success: false, error: 'Request failed', model: 'Gemini' },
        cohere: { success: false, error: 'Request failed', model: 'Cohere' },
        openrouter: { success: false, error: 'Request failed', model: 'OpenRouter' },
        glm: { success: false, error: 'Request failed', model: 'GLM 4.5' },
        deepseek: { success: false, error: 'Request failed', model: 'DeepSeek 3.1' }
      }
    });
  }
});

// Streaming API endpoint for real-time typing effect
app.post('/api/ask-stream', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid prompt. Please provide a non-empty string.' });
  }

  console.log(`🤖 Processing streaming prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const startTime = Date.now();
  const responses = {};

  try {
    // Cache lookup first
    let cacheLookupFailed = false;
    try {
      const { findConversationByPrompt } = require('./services/supabaseClient');
      let cached = await findConversationByPrompt({ prompt: prompt.trim(), type: 'multibot' });

      if (!cached || !cached.data) {
        const normalizeForWordSet = (s) => s
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .filter(word => word.length > 0)
          .sort()
          .join(' ');

        const targetWordSet = normalizeForWordSet(prompt.trim());
        const { fetchConversations } = require('./services/supabaseClient');

        let found = false;
        for (let page = 1; page <= 3 && !found; page++) {
          try {
            const { data: recent, error } = await fetchConversations({ page, limit: 50, type: 'multibot' });
            if (error) continue;
            
            if (recent && recent.length > 0) {
              for (const conv of recent) {
                const convWordSet = normalizeForWordSet(conv.prompt);
                if (convWordSet === targetWordSet) {
                  cached = { data: conv };
                  found = true;
                  break;
                }
              }
            } else {
              break;
            }
          } catch (pageError) {
            continue;
          }
        }
      }

      if (cached && cached.data && cached.data.responses) {
        const r = cached.data.responses || {};
        const names = ['gemini','cohere','openrouter','glm','deepseek'];
        const allOk = names.every(n => r[n] && r[n].success === true);
        if (allOk) {
          console.log('⚡ Serving from cache (streaming)');
          
          // Stream cached responses with typing effect
          for (const [name, response] of Object.entries(r)) {
            if (response.success && response.response) {
              res.write(`data: ${JSON.stringify({
                type: 'ai_start',
                ai: name,
                model: response.model
              })}\n\n`);
              
              // Simulate typing effect for cached response
              const text = response.response;
              const words = text.split(' ');
              let currentText = '';
              
              for (let i = 0; i < words.length; i++) {
                currentText += (i > 0 ? ' ' : '') + words[i];
                res.write(`data: ${JSON.stringify({
                  type: 'ai_chunk',
                  ai: name,
                  text: currentText,
                  isComplete: i === words.length - 1
                })}\n\n`);
                
                // Small delay to simulate typing
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              
              res.write(`data: ${JSON.stringify({
                type: 'ai_complete',
                ai: name,
                response: response
              })}\n\n`);
            }
          }
          
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            processingTime: '0ms (cached)',
            timestamp: new Date().toISOString()
          })}\n\n`);
          
          res.end();
          return;
        }
      }
    } catch (err) {
      console.error('Cache lookup failed:', err.message);
      cacheLookupFailed = true;
    }

    if (cacheLookupFailed) {
      console.log('⚠️ Cache lookup failed, proceeding with AI calls...');
    }

    // Load services dynamically
    const geminiService = require('./services/geminiService');
    const cohereService = require('./services/cohereService');
    const openrouterService = require('./services/openrouterService');
    const glmService = require('./services/glmService');
    const deepseekService = require('./services/deepseekService');
    const { saveConversation } = require('./services/supabaseClient');

    // Call all services in parallel with streaming
    const services = [
      { name: 'gemini', service: geminiService },
      { name: 'cohere', service: cohereService },
      { name: 'openrouter', service: openrouterService },
      { name: 'glm', service: glmService },
      { name: 'deepseek', service: deepseekService }
    ];

    const promises = services.map(async ({ name, service }) => {
      try {
        console.log(`🤖 Calling ${name} API (streaming)...`);
        res.write(`data: ${JSON.stringify({
          type: 'ai_start',
          ai: name,
          model: service.model || name
        })}\n\n`);
        
        const result = await service.generateResponse(prompt);
        
        // Stream the response with typing effect
        if (result && result.response) {
          const text = result.response;
          const words = text.split(' ');
          let currentText = '';
          
          for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            res.write(`data: ${JSON.stringify({
              type: 'ai_chunk',
              ai: name,
              text: currentText,
              isComplete: i === words.length - 1
            })}\n\n`);
            
            // Small delay to simulate typing
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }
        
        res.write(`data: ${JSON.stringify({
          type: 'ai_complete',
          ai: name,
          response: result
        })}\n\n`);
        
        return { name, result };
      } catch (error) {
        console.error(`${name} Error:`, error.message);
        res.write(`data: ${JSON.stringify({
          type: 'ai_error',
          ai: name,
          error: error.message
        })}\n\n`);
        return { name, error: error.message };
      }
    });

    await Promise.all(promises);

    const processingTime = Date.now() - startTime;
    
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    res.end();

  } catch (error) {
    console.error('Error processing streaming AI requests:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

// Dedicated Chatbot endpoint with simpler response format
app.post('/api/chatbot', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid prompt. Please provide a non-empty string.' 
    });
  }

  const startTime = Date.now();
  console.log(`💬 Chatbot request: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

  try {
    // Cache lookup first
    try {
      const { findConversationByPrompt } = require('./services/supabaseClient');
      const cached = await findConversationByPrompt({ prompt: prompt.trim(), type: 'chatbot' });
      if (cached && cached.data && cached.data.response) {
        console.log('⚡ Chatbot serving from cache');
        return res.json({
          success: true,
          message: cached.data.response,
          model: cached.data.model || 'Gemini',
          processingTime: '0ms (cached)',
          timestamp: new Date().toISOString()
        });
      }
    } catch (_) {}

    // Load Gemini service for chatbot (most reliable)
    const geminiService = require('./services/geminiService');
    const { saveConversation } = require('./services/supabaseClient');
    
    const geminiResult = await Promise.race([
      geminiService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 15000))
    ]);

    const processingTime = Date.now() - startTime;
    
    if (geminiResult.success) {
      console.log(`✅ Chatbot response generated in ${processingTime}ms`);
      const payload = {
        success: true,
        message: geminiResult.response,
        model: geminiResult.model,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      };
      // Save asynchronously
      saveConversation({
        type: 'chatbot',
        prompt: prompt.trim(),
        response: geminiResult.response,
        model: geminiResult.model,
        processing_time_ms: processingTime,
        created_at: new Date().toISOString()
      }).then((r) => {
        if (!r?.saved) {
          console.error('Supabase save chatbot success-case failed:', r?.error);
        }
      }).catch((e) => {
        console.error('Supabase save chatbot success-case exception:', e?.message || e);
      });
      res.json(payload);
    } else {
      console.log(`❌ Chatbot Gemini failed: ${geminiResult.error}`);
      const payload = {
        success: false,
        message: 'Sorry, I am having trouble responding right now. Please try again.',
        error: geminiResult.error,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      };
      // Do not save error runs into history
      res.json(payload);
    }

  } catch (error) {
    console.error('Chatbot Error:', error);
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({ 
      success: false,
      message: 'Sorry, I encountered an error. Please try again later.',
      error: error.message,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// Streaming Chatbot endpoint (chunked HTTP streaming)
app.post('/api/chatbot-stream', async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid prompt. Please provide a non-empty string.' 
      });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Prepare streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt.trim() }]
      }
    ];

    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 2048
      // Note: ThinkingConfig is currently a Python SDK feature. Not exposed in Node SDK yet.
    };

    const result = await model.generateContentStream({
      contents,
      generationConfig
    });

    const clean = (t) => t.replace(/(^|\n)\s*\*\s+/g, '$1');
    for await (const chunk of result.stream) {
      const raw = typeof chunk.text === 'function' ? chunk.text() : chunk.text;
      if (raw) {
        res.write(clean(raw));
      }
    }

    res.end();
  } catch (error) {
    console.error('Streaming Chatbot Error:', error);
    try {
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to stream response' });
      }
      res.end();
    } catch (_) {
      // ignore
    }
  }
});

// GET /api/status - Check API configuration status
app.get('/api/status', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const huggingfaceKey = process.env.HUGGINGFACE_API_KEY;
  const cohereKey = process.env.COHERE_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  res.json({
    gemini: {
      configured: geminiKey && geminiKey !== 'your-api-key-here' && geminiKey.length > 20,
      model: 'gemini-2.5-flash-lite'
    },
    huggingface: {
      configured: huggingfaceKey && huggingfaceKey !== 'your-api-key-here' && huggingfaceKey.length > 20,
      model: 'DialoGPT Medium'
    },
    cohere: {
      configured: cohereKey && cohereKey !== 'your-api-key-here' && cohereKey.length > 20,
      model: 'Cohere Command'
    },
    openrouter: {
      configured: openrouterKey && openrouterKey !== 'your-api-key-here' && openrouterKey.length > 20,
      model: 'OpenRouter (GPT-3.5 Turbo)'
    }
  });
});

// GET /api/token-usage - Get token usage for all AI services
app.get('/api/token-usage', async (req, res) => {
  try {
    // Track actual token usage (this would typically come from your billing system)
    // For now, we'll simulate usage based on API calls
    const tokenUsage = {
      gemini: {
        service: 'Gemini Pro',
        model: 'gemini-2.5-flash-lite',
        tokensUsed: Math.floor(Math.random() * 50000) + 1000, // Simulate usage
        estimatedLimit: 15000000, // 15M tokens per month (free tier)
        remaining: 0,
        percentage: 0
      },
      cohere: {
        service: 'Cohere',
        model: 'Cohere Command',
        tokensUsed: Math.floor(Math.random() * 30000) + 500, // Simulate usage
        estimatedLimit: 5000000, // 5M tokens per month (free tier)
        remaining: 0,
        percentage: 0
      },
      openrouter: {
        service: 'OpenRouter',
        model: 'Multiple Models',
        tokensUsed: Math.floor(Math.random() * 20000) + 200, // Simulate usage
        estimatedLimit: 1000000, // 1M tokens per month (free tier)
        remaining: 0,
        percentage: 0
      },
      glm: {
        service: 'GLM 4.5 Air',
        model: 'GLM 4.5 Air',
        tokensUsed: Math.floor(Math.random() * 15000) + 100, // Simulate usage
        estimatedLimit: 1000000, // 1M tokens per month (free tier)
        remaining: 0,
        percentage: 0
      },
      deepseek: {
        service: 'DeepSeek 3.1',
        model: 'DeepSeek Chat 3.1',
        tokensUsed: Math.floor(Math.random() * 12000) + 50, // Simulate usage
        estimatedLimit: 1000000, // 1M tokens per month (free tier)
        remaining: 0,
        percentage: 0
      }
    };

    // Calculate remaining tokens and percentage
    Object.keys(tokenUsage).forEach(service => {
      const serviceData = tokenUsage[service];
      serviceData.remaining = Math.max(0, serviceData.estimatedLimit - serviceData.tokensUsed);
      serviceData.percentage = Math.round((serviceData.remaining / serviceData.estimatedLimit) * 100);
    });

    res.json({
      timestamp: new Date().toISOString(),
      tokenUsage
    });

  } catch (error) {
    console.error('Error getting token usage:', error);
    res.status(500).json({ 
      error: 'Failed to get token usage',
      message: error.message
    });
  }
});

// GET /api/service-status - Check which AI services are operational
app.get('/api/service-status', async (req, res) => {
  try {
    const testPrompt = "Hello";
    
    // Dynamically load services to ensure availability in this scope
    const geminiService = require('./services/geminiService');
    const cohereService = require('./services/cohereService');
    const openrouterService = require('./services/openrouterService');
    const glmService = require('./services/glmService');
    const deepseekService = require('./services/deepseekService');

    // Helper to wrap a promise with a timeout
    const withTimeout = (promise, ms, name) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timeout`)), ms))
      ]);
    };

    // Test each service with a simple request and individual timeouts
    const serviceTests = {
      gemini: async () => {
        try {
          const start = Date.now();
          await withTimeout(geminiService.generateResponse(testPrompt), 300000, 'Gemini');
          return { operational: true, responseTime: Date.now() - start, model: 'gemini-2.5-flash-lite' };
        } catch (error) {
          return { operational: false, error: error.message, model: 'gemini-2.5-flash-lite' };
        }
      },
      cohere: async () => {
        try {
          const start = Date.now();
          await withTimeout(cohereService.generateResponse(testPrompt), 300000, 'Cohere');
          return { operational: true, responseTime: Date.now() - start, model: 'Cohere Command' };
        } catch (error) {
          return { operational: false, error: error.message, model: 'Cohere Command' };
        }
      },
      openrouter: async () => {
        try {
          const start = Date.now();
          await withTimeout(openrouterService.generateResponse(testPrompt, 'openai/gpt-3.5-turbo'), 300000, 'OpenRouter');
          return { operational: true, responseTime: Date.now() - start, model: 'GPT-3.5 Turbo' };
        } catch (error) {
          return { operational: false, error: error.message, model: 'GPT-3.5 Turbo' };
        }
      },
      glm: async () => {
        try {
          const start = Date.now();
          await withTimeout(glmService.generateResponse(testPrompt), 300000, 'GLM 4.5');
          return { operational: true, responseTime: Date.now() - start, model: 'GLM 4.5 Air' };
        } catch (error) {
          return { operational: false, error: error.message, model: 'GLM 4.5 Air' };
        }
      },
      deepseek: async () => {
        try {
          const start = Date.now();
          await withTimeout(deepseekService.generateResponse(testPrompt), 300000, 'DeepSeek 3.1');
          return { operational: true, responseTime: Date.now() - start, model: 'DeepSeek 3.1' };
        } catch (error) {
          return { operational: false, error: error.message, model: 'DeepSeek 3.1' };
        }
      }
    };

    // Test all services concurrently
    // Do not auto-trigger provider calls unless explicitly requested via query
    // If ?run=true is not provided, return cached-like placeholders
    if (req.query.run !== 'true') {
      return res.json({
        timestamp: new Date().toISOString(),
        services: {},
        summary: { operational: 0, total: 0, status: 'Not checked (set run=true to test)' }
      });
    }

    const results = {};
    for (const [serviceName, testFunction] of Object.entries(serviceTests)) {
      results[serviceName] = await testFunction();
    }

    // Count operational services
    const operationalCount = Object.values(results).filter(result => result.operational).length;
    const totalServices = Object.keys(results).length;

    res.json({
      timestamp: new Date().toISOString(),
      services: results,
      summary: {
        operational: operationalCount,
        total: totalServices,
        status: operationalCount === totalServices ? 'All Operational' : `${operationalCount}/${totalServices} Operational`
      }
    });

  } catch (error) {
    console.error('Error checking service status:', error);
    res.status(500).json({ 
      error: 'Failed to check service status',
      message: error.message
    });
  }
});

// API routes
// app.use('/api', aiRoutes);
app.get('/api/conversations', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const type = req.query.type;
    const { fetchConversations } = require('./services/supabaseClient');
    const result = await fetchConversations({ page, limit, type });
    if (result.error) {
      return res.status(200).json({ data: [], total: 0 });
    }
    res.json(result);
  } catch (err) {
    res.status(200).json({ data: [], total: 0 });
  }
});

// Debug: inspect OpenRouter keys (masked) and referer header used
app.get('/api/debug-openrouter', (req, res) => {
  try {
    const single = process.env.OPENROUTER_API_KEY || '';
    const list = (process.env.OPENROUTER_API_KEYS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const keys = [];
    if (single) keys.push(single);
    for (const k of list) if (!keys.includes(k)) keys.push(k);
    const tails = keys.map(k => k.slice(-6));
    const referer = process.env.FRONTEND_URL || process.env.PUBLIC_ORIGIN || 'https://chatbotcode.netlify.app';
    res.json({
      count: keys.length,
      tails,
      referer
    });
  } catch (e) {
    res.status(200).json({ ok: false, exception: e?.message || String(e) });
  }
});

// Semantic QA endpoint with embedding cache
app.post('/api/qa/ask', async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Invalid question' });
    }
    const q = question.trim();
    const normalizeQuestion = (s) => s
      .toLowerCase()
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(.)\1{1,}/g, '$1'); // collapse repeated letters (e.g., hiii -> hi)
    const qNorm = normalizeQuestion(q);
    const geminiService = require('./services/geminiService');
    const { matchQuestions, insertQAPair } = require('./services/supabaseClient');

    // 1) Embed (normalized for semantic similarity)
    const embedding = await geminiService.embed(qNorm);
    // 2) Match
    const { data: matches } = await matchQuestions({ queryEmbedding: embedding, matchThreshold: 0.8, matchCount: 1 });
    if (Array.isArray(matches) && matches.length > 0 && matches[0].similarity > 0.8) {
      return res.json({ answer: matches[0].answer, cached: true });
    }
    // 3) Generate
    const ansRes = await geminiService.generateResponse(q);
    const answer = ansRes?.success ? ansRes.response : 'Sorry, no answer available.';
    // 4) Save
    insertQAPair({ question: q, embedding, answer }).catch(() => {});
    return res.json({ answer, cached: false });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed' });
  }
});

// Debug: test Supabase connectivity and simple select
app.get('/api/debug-supabase', async (req, res) => {
  try {
    const { getSupabase } = require('./services/supabaseClient');
    const client = getSupabase();
    if (!client) {
      return res.status(200).json({ ok: false, reason: 'Supabase not configured' });
    }
    const { data, error, count } = await client
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .limit(0);
    if (error) {
      return res.status(200).json({ ok: false, error: error.message });
    }
    res.json({ ok: true, reachable: true, table: 'conversations', count: count ?? null });
  } catch (e) {
    res.status(200).json({ ok: false, exception: e?.message || String(e) });
  }
});

// Debug: attempt an insert with minimal payload
app.post('/api/debug-supabase/insert', async (req, res) => {
  try {
    const { saveConversation } = require('./services/supabaseClient');
    const payload = {
      type: 'debug',
      prompt: 'debug-insert',
      processing_time_ms: 0,
      created_at: new Date().toISOString()
    };
    const result = await saveConversation(payload);
    res.json({ ok: !!result?.saved, result });
  } catch (e) {
    res.status(200).json({ ok: false, exception: e?.message || String(e) });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI API endpoint: http://localhost:${PORT}/api/ask`);
});
