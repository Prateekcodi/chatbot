const axios = require('axios');

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.apiUrl = process.env.HUGGINGFACE_API_URL;
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-huggingface-api-key-here') {
        throw new Error('Hugging Face API key not configured');
      }

      const response = await axios.post(
        this.apiUrl,
        {
          inputs: prompt,
          parameters: {
            max_length: 100,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      let responseText = '';
      
      // Handle different response formats from Hugging Face
      if (Array.isArray(response.data)) {
        responseText = response.data[0]?.generated_text || response.data[0]?.text || '';
      } else if (typeof response.data === 'object') {
        responseText = response.data.generated_text || response.data.text || '';
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      }

      // Clean up the response (remove the original prompt if it's included)
      if (responseText.startsWith(prompt)) {
        responseText = responseText.substring(prompt.length).trim();
      }

      if (!responseText) {
        throw new Error('No response text received from Hugging Face');
      }

      return {
        success: true,
        response: responseText,
        model: 'DialoGPT Medium',
        tokens: responseText.split(' ').length // Approximate token count
      };

    } catch (error) {
      console.error('Hugging Face API Error:', error.message);
      
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'DialoGPT Medium'
        };
      }

      if (error.response?.status === 503) {
        return {
          success: false,
          error: 'Model is currently loading. Please try again in a few seconds.',
          model: 'DialoGPT Medium'
        };
      }

      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'API key needs inference permissions. Please get a token from https://huggingface.co/settings/tokens with "Read" access.',
          model: 'DialoGPT Medium'
        };
      }

      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Model not found or not available. Please try again later.',
          model: 'DialoGPT Medium'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from Hugging Face',
        model: 'DialoGPT Medium'
      };
    }
  }
}

module.exports = new HuggingFaceService();
