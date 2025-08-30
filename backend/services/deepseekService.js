const { OpenAI } = require('openai');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: this.apiKey,
    });
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey || this.apiKey === 'your-api-key-here') {
        throw new Error('OpenRouter API key not configured');
      }

      console.log(`🤖 Calling DeepSeek 3.1 API via OpenRouter`);
      
      const completion = await this.client.chat.completions.create({
        extra_headers: {
          "HTTP-Referer": "https://chatbot-1-u7m0.onrender.com",
          "X-Title": "Multi-AI Comparison Tool"
        },
        extra_body: {},
        model: "deepseek/deepseek-chat-v3.1:free",
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
        model: 'DeepSeek Chat 3.1',
        tokens: tokenCount
      };

    } catch (error) {
      console.error('DeepSeek 3.1 API Error:', error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'DeepSeek 3.1 authentication failed. Please check your OpenRouter API key.',
          model: 'DeepSeek Chat 3.1'
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          model: 'DeepSeek Chat 3.1'
        };
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Invalid request. Please check your prompt.',
          model: 'DeepSeek Chat 3.1'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get response from DeepSeek 3.1',
        model: 'DeepSeek Chat 3.1'
      };
    }
  }
}

module.exports = new DeepSeekService();
