const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = 'gemini-2.5-flash-lite';
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        throw new Error('Gemini API key not configured');
      }
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });

      const contents = [
        {
          role: 'user',
          parts: [ { text: prompt } ]
        }
      ];

      const generationConfig = {
        temperature: 0.7,
        maxOutputTokens: 1000
      };

      const tools = [ { googleSearch: {} } ];

      const result = await model.generateContent({
        contents,
        tools,
        generationConfig
      });

      const responseText = result?.response?.text?.() || result?.response?.text || '';
      
      if (!responseText) {
        throw new Error('No response text received from Gemini');
      }

      return {
        success: true,
        response: responseText,
        model: 'gemini-2.5-flash-lite'
      };

    } catch (error) {
      console.error('Gemini API Error:', error.message);
      
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'gemini-2.5-flash-lite'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from Gemini',
        model: 'gemini-2.5-flash-lite'
      };
    }
  }
}

module.exports = new GeminiService();
