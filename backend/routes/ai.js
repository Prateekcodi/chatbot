const express = require('express');
const router = express.Router();

const geminiService = require('../services/geminiService');
const huggingfaceService = require('../services/huggingfaceService');
const cohereService = require('../services/cohereService');
const openrouterService = require('../services/openrouterService');

// POST /api/ask - Send prompt to all AI services
router.post('/ask', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid prompt. Please provide a non-empty string.' 
    });
  }

  const startTime = Date.now();
  console.log(`🤖 Processing prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

  try {
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
      openrouterService.generateResponse(prompt, 'anthropic/claude-3-haiku'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OpenRouter timeout')), 10000))
    ]);

    // Wait for all services with individual timeouts
    const [geminiResult, cohereResult, openrouterResult] = await Promise.allSettled([
      geminiPromise,
      coherePromise,
      openrouterPromise
    ]);

    const processingTime = Date.now() - startTime;
    const successfulResponses = [
      geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message || 'Failed', model: 'Gemini' },
      cohereResult.status === 'fulfilled' ? cohereResult.value : { success: false, error: cohereResult.reason?.message || 'Failed', model: 'Cohere' },
      openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message || 'Failed', model: 'OpenRouter' }
    ].filter(response => response.success).length;

    console.log(`✅ Completed with ${successfulResponses}/3 successful responses in ${processingTime}ms`);

    res.json({
      prompt: prompt.trim(),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
      responses: {
        gemini: geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message || 'Failed', model: 'Gemini' },
        huggingface: { success: false, error: 'Service temporarily disabled', model: 'Hugging Face' },
        cohere: cohereResult.status === 'fulfilled' ? cohereResult.value : { success: false, error: cohereResult.reason?.message || 'Failed', model: 'Cohere' },
        openrouter: openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message || 'Failed', model: 'OpenRouter' }
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
        huggingface: { success: false, error: 'Service temporarily disabled', model: 'Hugging Face' },
        cohere: { success: false, error: 'Request failed', model: 'Cohere' },
        openrouter: { success: false, error: 'Request failed', model: 'OpenRouter' }
      }
    });
  }
});

// GET /api/status - Check API configuration status
router.get('/status', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
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

module.exports = router;
