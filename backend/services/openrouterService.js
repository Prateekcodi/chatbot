const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  }

  async generateResponse(prompt, model = 'openai/gpt-3.5-turbo') {
    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'your-api-key-here') {
      throw new Error('OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your .env file.');
    }

    try {
      console.log(`🤖 Calling OpenRouter API with model: ${model}`);
      
      const response = await axios.post(this.apiUrl, {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Multi-AI Comparison Tool'
        },
        timeout: 15000 // 15 seconds timeout
      });

      const responseText = response.data.choices[0].message.content;
      const tokenCount = response.data.usage?.total_tokens || responseText.split(' ').length;

      return {
        success: true,
        response: responseText,
        model: `OpenRouter (${model})`,
        tokens: tokenCount
      };

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
