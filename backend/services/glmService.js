const axios = require('axios');

class GLMService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    const keysEnv = process.env.OPENROUTER_API_KEYS;
    this.apiKeys = [];
    if (keysEnv && typeof keysEnv === 'string') {
      this.apiKeys = keysEnv.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (this.apiKey && this.apiKey.includes(',')) {
      const splitKeys = this.apiKey.split(',').map(k => k.trim()).filter(Boolean);
      this.apiKeys = [...splitKeys, ...this.apiKeys];
      this.apiKey = splitKeys[0];
    }
    if (this.apiKey && !this.apiKeys.includes(this.apiKey)) {
      this.apiKeys.unshift(this.apiKey);
    }
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.referer = process.env.FRONTEND_URL || process.env.PUBLIC_ORIGIN || 'https://chatbotcode.netlify.app';
    this.title = process.env.APP_TITLE || 'Multi-AI Comparison Tool';
  }

  async generateResponse(prompt) {
    try {
      const keysToTry = (this.apiKeys && this.apiKeys.length) ? this.apiKeys : (this.apiKey ? [this.apiKey] : []);
      if (!keysToTry.length || (keysToTry[0] === 'your-api-key-here')) {
        throw new Error('OpenRouter API key not configured');
      }

      console.log(`🤖 Calling GLM 4.5 API via OpenRouter`);
      const tryWithKey = async (key) => {
        return axios.post(this.apiUrl, {
          model: 'z-ai/glm-4.5-air:free',
          messages: [
            { role: 'user', content: `${prompt}\n\nPlease provide a concise answer in 400-1000 words. Be thorough but brief.` }
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
      for (const key of keysToTry) {
        try {
          const response = await tryWithKey(key);
          const responseText = response.data.choices[0].message.content;
          const tokenCount = response.data.usage?.total_tokens || responseText.split(' ').length;
          return {
            success: true,
            response: responseText,
            model: 'GLM 4.5 Air',
            tokens: tokenCount
          };
        } catch (error) {
          lastError = error;
          const status = error.response?.status;
          const message = error.response?.data?.error?.message || error.message || '';
          const isRateLimit = status === 429 || /rate limit|credits/i.test(message);
          const isAuth = status === 401;
          console.error('GLM via OpenRouter Error (key tail):', key?.slice(-6), status, message);
          if (isRateLimit || isAuth) continue;
          throw error;
        }
      }

      if (lastError) throw lastError;
      throw new Error('GLM via OpenRouter: all keys failed');

    } catch (error) {
      console.error('GLM 4.5 API Error:', error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'GLM 4.5 authentication failed. Please check your OpenRouter API key.',
          model: 'GLM 4.5 Air'
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'GLM 4.5 Air'
        };
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Invalid request. Please check your prompt.',
          model: 'GLM 4.5 Air'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from GLM 4.5',
        model: 'GLM 4.5 Air'
      };
    }
  }
}

module.exports = new GLMService();
