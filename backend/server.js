const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Don't import AI services at startup - import them only when needed
// const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Allow any Vercel domain for the chatbot project
    if (origin.includes('vercel.app') || origin.includes('yourdomain.com')) {
      return callback(null, true);
    }
    
    // Allow any Netlify domain
    if (origin.includes('netlify.app')) {
      return callback(null, true);
    }
    
    // Allow specific domains
    const allowedOrigins = [
      'https://chatbot-e6sq.vercel.app',
      'https://chatbot-kxqa.vercel.app',
      'https://yourdomain.com',
      'https://chatbotcode.netlify.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

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
    // Load services dynamically only when needed
    const geminiService = require('./services/geminiService');
    const cohereService = require('./services/cohereService');
    const openrouterService = require('./services/openrouterService');
    const glmService = require('./services/glmService');
    const deepseekService = require('./services/deepseekService');

    // Call all AI services concurrently with individual timeouts
    const geminiPromise = Promise.race([
      geminiService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 10000))
    ]);

    const coherePromise = Promise.race([
      cohereService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cohere timeout')), 10000))
    ]);

    const openrouterPromise = Promise.race([
      openrouterService.generateResponse(prompt, 'openai/gpt-3.5-turbo'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OpenRouter timeout')), 10000))
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

    res.json({
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
    });

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
    // Load Gemini service for chatbot (most reliable)
    const geminiService = require('./services/geminiService');
    
    const geminiResult = await Promise.race([
      geminiService.generateResponse(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 15000))
    ]);

    const processingTime = Date.now() - startTime;
    
    if (geminiResult.success) {
      console.log(`✅ Chatbot response generated in ${processingTime}ms`);
      res.json({
        success: true,
        message: geminiResult.response,
        model: geminiResult.model,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`❌ Chatbot Gemini failed: ${geminiResult.error}`);
      res.json({
        success: false,
        message: 'Sorry, I am having trouble responding right now. Please try again.',
        error: geminiResult.error,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
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

// API routes
// app.use('/api', aiRoutes);

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
