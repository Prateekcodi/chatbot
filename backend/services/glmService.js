const { OpenAI } = require('openai');

class GLMService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: this.apiKey,
    });
    this.referer = process.env.FRONTEND_URL || process.env.PUBLIC_ORIGIN || 'https://chatbotcode.netlify.app';
    this.title = process.env.APP_TITLE || 'Multi-AI Comparison Tool';
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        throw new Error('OpenRouter API key not configured');
      }

      console.log(`🤖 Calling GLM 4.5 API via OpenRouter`);
      
      const completion = await this.client.chat.completions.create({
        extra_headers: {
          "HTTP-Referer": this.referer,
          "X-Title": this.title
        },
        extra_body: {},
        model: "z-ai/glm-4.5-air:free",
        messages: [
          {
            "role": "user",
            "content": prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const responseText = completion.choices[0].message.content;
      const tokenCount = completion.usage?.total_tokens || responseText.split(' ').length;

      return {
        success: true,
        response: responseText,
        model: 'GLM 4.5 Air',
        tokens: tokenCount
      };

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
