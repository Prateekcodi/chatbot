const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini Service
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.model = 'gemini-2.5-flash-lite';
  }

  _cleanText(text) {
    if (!text) return text;
    return text
      .replace(/(^|\n)\s*\*\s+/g, '$1')
      .trim();
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        return { success: false, error: 'Gemini API key not configured' };
      }

      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: this._cleanText(text)
      };
    } catch (error) {
      console.error('Gemini error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }
}

// Cohere Service (simplified for demo)
class CohereService {
  constructor() {
    this.apiKey = process.env.COHERE_API_KEY;
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        return { success: false, error: 'Cohere API key not configured' };
      }

      const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'command',
          prompt: prompt,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        response: data.generations[0].text
      };
    } catch (error) {
      console.error('Cohere error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }
}

// OpenRouter Service (simplified for demo)
class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
  }

  async generateResponse(prompt, model = 'anthropic/claude-3-haiku') {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        return { success: false, error: 'OpenRouter API key not configured' };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        response: data.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenRouter error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }
}

// Initialize services
const geminiService = new GeminiService();
const cohereService = new CohereService();
const openrouterService = new OpenRouterService();

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { query } = JSON.parse(event.body);
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid query. Please provide a non-empty string.' 
        }),
      };
    }

    const startTime = Date.now();
    console.log(`🤖 MultiAI Processing query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    // Call all AI services concurrently with individual timeouts
    const geminiPromise = Promise.race([
      geminiService.generateResponse(query),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 15000))
    ]);

    const coherePromise = Promise.race([
      cohereService.generateResponse(query),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cohere timeout')), 15000))
    ]);

    const openrouterPromise = Promise.race([
      openrouterService.generateResponse(query, 'anthropic/claude-3-haiku'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OpenRouter timeout')), 15000))
    ]);

    // Wait for all services with individual timeouts
    const [geminiResult, cohereResult, openrouterResult] = await Promise.allSettled([
      geminiPromise,
      coherePromise,
      openrouterPromise
    ]);

    const processingTime = Date.now() - startTime;
    const successfulResponses = [
      geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message || 'Failed' },
      cohereResult.status === 'fulfilled' ? cohereResult.value : { success: false, error: cohereResult.reason?.message || 'Failed' },
      openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message || 'Failed' }
    ].filter(response => response.success).length;

    console.log(`✅ MultiAI Completed with ${successfulResponses}/3 successful responses in ${processingTime}ms`);

    // Format response for MultiAI component
    const responses = {
      'Gemini 1.5 Pro': geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message || 'Failed' },
      'Claude 3.5 Sonnet': cohereResult.status === 'fulfilled' ? cohereResult.value : { success: false, error: cohereResult.reason?.message || 'Failed' },
      'GPT-4o': openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message || 'Failed' }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        responses,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error processing MultiAI requests:', error);
    const processingTime = Date.now() - Date.now();
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process MultiAI requests',
        message: error.message,
        processingTime: `${processingTime}ms`,
        responses: {
          'Gemini 1.5 Pro': { success: false, error: 'Request failed' },
          'Claude 3.5 Sonnet': { success: false, error: 'Request failed' },
          'GPT-4o': { success: false, error: 'Request failed' }
        },
        timestamp: new Date().toISOString()
      }),
    };
  }
};