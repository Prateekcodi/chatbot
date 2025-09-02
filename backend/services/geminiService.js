const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.model = 'gemini-2.5-flash-lite';
    this.embeddingModel = 'models/embedding-001';
  }

  // Remove leading markdown bullet asterisks at line starts: "* "
  _cleanText(text) {
    if (!text) return text;
    return text
      .replace(/(^|\n)\s*\*\s+/g, '$1')
      .trim();
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
          parts: [ { text: `${prompt}\n\nPlease provide a concise answer in 400-1000 words. Be thorough but brief.` } ]
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
      const cleaned = this._cleanText(responseText);
      
      if (!cleaned) {
        throw new Error('No response text received from Gemini');
      }

      return {
        success: true,
        response: cleaned,
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

  async embed(text) {
    if (!this.apiKey || this.apiKey === 'your-api-key-here') {
      throw new Error('Gemini API key not configured');
    }
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.embeddingModel });
    const resp = await model.embedContent({ content: { parts: [{ text }] } });
    const vector = resp.embedding?.values || resp.embedding?.value || [];
    if (!Array.isArray(vector) || vector.length === 0) throw new Error('Failed to embed');
    return vector;
  }
}

module.exports = new GeminiService();
