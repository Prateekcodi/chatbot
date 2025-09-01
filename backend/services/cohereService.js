const axios = require('axios');

class CohereService {
  constructor() {
    this.apiKey = process.env.COHERE_API_KEY;
    this.apiUrl = process.env.COHERE_API_URL;
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        throw new Error('Cohere API key not configured');
      }

      const response = await axios.post(this.apiUrl, {
        model: 'command',
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.7,
        k: 0,
        stop_sequences: [],
        return_likelihoods: 'NONE'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Multi-AI-Comparison-Tool'
        },
        timeout: 15000 // 15 seconds timeout
      });

      const responseText = response.data.generations?.[0]?.text?.trim();
      
      if (!responseText) {
        throw new Error('No response text received from Cohere');
      }

      return {
        success: true,
        response: responseText,
        model: 'Cohere Command',
        tokens: response.data.meta?.billed_units?.input_tokens || 0
      };

    } catch (error) {
      console.error('Cohere API Error:', error.message);
      
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'Cohere Command'
        };
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Invalid API key. Please check your Cohere API key.',
          model: 'Cohere Command'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from Cohere',
        model: 'Cohere Command'
      };
    }
  }
}

module.exports = new CohereService();
