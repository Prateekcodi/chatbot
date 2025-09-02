const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    // Support multiple keys via comma-separated env OPENROUTER_API_KEYS
    const keysEnv = process.env.OPENROUTER_API_KEYS;
    this.apiKeys = [];
    if (keysEnv && typeof keysEnv === 'string') {
      this.apiKeys = keysEnv
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);
    }
    // If OPENROUTER_API_KEY contains commas, split it too
    if (this.apiKey && this.apiKey.includes(',')) {
      const splitKeys = this.apiKey.split(',').map(k => k.trim()).filter(Boolean);
      this.apiKeys = [...splitKeys, ...this.apiKeys];
      this.apiKey = splitKeys[0];
    }
    // Ensure primary key is first if present (and not already included)
    if (this.apiKey && !this.apiKeys.includes(this.apiKey)) this.apiKeys.unshift(this.apiKey);
    this.apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    this.referer = process.env.FRONTEND_URL || process.env.PUBLIC_ORIGIN || 'https://chatbotcode.netlify.app';
    this.title = process.env.APP_TITLE || 'Multi-AI Comparison Tool';
  }

  async generateResponse(prompt, model = 'openai/gpt-3.5-turbo') {
    // Check if API key(s) are configured
    if ((!this.apiKey && this.apiKeys.length === 0) || this.apiKey === 'your-api-key-here') {
      throw new Error('OpenRouter API key not configured. Please add OPENROUTER_API_KEY or OPENROUTER_API_KEYS to your backend env.');
    }

    try {
      console.log(`🤖 Calling OpenRouter API with model: ${model}`);
      
      const tryWithKey = async (key) => {
        return axios.post(this.apiUrl, {
          model: model,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nPlease provide a concise answer in exactly 200 words. Be thorough but brief.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        }, {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.referer,
            'X-Title': this.title
          },
          timeout: 15000
        });
      };

      let lastError = null;
      const keysToTry = this.apiKeys.length ? this.apiKeys : [this.apiKey];
      for (const key of keysToTry) {
        try {
          const response = await tryWithKey(key);
          const responseText = response.data.choices[0].message.content;
          const tokenCount = response.data.usage?.total_tokens || responseText.split(' ').length;

          return {
            success: true,
            response: responseText,
            model: `OpenRouter (${model})`,
            tokens: tokenCount
          };
        } catch (error) {
          // Save last error and decide whether to try next key
          lastError = error;
          const status = error.response?.status;
          const message = error.response?.data?.error?.message || error.message || '';
          const isRateLimit = status === 429 || /rate limit|credits/i.test(message);
          const isAuth = status === 401;
          console.error('OpenRouter API Error (key tail):', key?.slice(-6), status, message);
          if (isRateLimit || isAuth) {
            // try next key
            continue;
          }
          // Other errors: stop early
          throw error;
        }
      }

      // If we reach here, all keys failed
      if (lastError) throw lastError;

      throw new Error('OpenRouter: all keys failed');

    } catch (error) {
      console.error('OpenRouter API Error:', error.message);
      console.error('OpenRouter API Response:', error.response?.data);
      
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.error?.message || 'Authentication failed';
        if (errorMessage.includes('User not found')) {
          return {
            success: false,
            error: 'OpenRouter API key is invalid or expired. Please check your API key.',
            model: 'OpenRouter'
          };
        }
        return {
          success: false,
          error: `OpenRouter authentication failed: ${errorMessage}`,
          model: 'OpenRouter'
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'OpenRouter'
        };
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Invalid request. Please check your prompt.',
          model: 'OpenRouter'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from OpenRouter',
        model: 'OpenRouter'
      };
    }
  }

  // Get available models
  async getAvailableModels() {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error.message);
      return [];
    }
  }
}

module.exports = new OpenRouterService();
