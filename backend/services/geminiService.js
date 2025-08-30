const axios = require('axios');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = process.env.GEMINI_API_URL;
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        throw new Error('Gemini API key not configured');
      }

      const response = await axios.post(this.apiUrl, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          key: this.apiKey
        },
        timeout: 15000 // 15 seconds timeout
      });

      const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('No response text received from Gemini');
      }

      return {
        success: true,
        response: responseText,
        model: 'Gemini 1.5 Flash',
        tokens: response.data.usageMetadata?.totalTokenCount || 0
      };

    } catch (error) {
      console.error('Gemini API Error:', error.message);
      
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'Gemini 1.5 Flash'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from Gemini',
        model: 'Gemini 1.5 Flash'
      };
    }
  }
}

module.exports = new GeminiService();
