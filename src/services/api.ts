// API service for frontend to communicate with backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://chatbot-1-u7m0.onrender.com';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: unknown;
}

export const sendMessageToGemini = async (message: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if we have successful responses from any AI service
    if (data.responses) {
      // Find the first successful response (preferably Gemini)
      const geminiResponse = data.responses.gemini;
      const cohereResponse = data.responses.cohere;
      const openrouterResponse = data.responses.openrouter;
      const glmResponse = data.responses.glm;
      const deepseekResponse = data.responses.deepseek;
      
      // Prioritize Gemini, then Cohere, then OpenRouter, then GLM 4.5, then DeepSeek 3.1
      let aiResponse = null;
      if (geminiResponse && geminiResponse.success) {
        aiResponse = geminiResponse;
      } else if (cohereResponse && cohereResponse.success) {
        aiResponse = cohereResponse;
      } else if (openrouterResponse && openrouterResponse.success) {
        aiResponse = openrouterResponse;
      } else if (glmResponse && glmResponse.success) {
        aiResponse = glmResponse;
      } else if (deepseekResponse && deepseekResponse.success) {
        aiResponse = deepseekResponse;
      }
      
      if (aiResponse && aiResponse.response) {
        return {
          success: true,
          message: aiResponse.response,
          data: data
        };
      }
    }
    
    // If no successful response found
    return {
      success: false,
      message: 'No response from AI',
      data: data
    };
  } catch (error) {
    console.error('Error calling backend:', error);
    return {
      success: false,
      message: 'Failed to get response from AI. Please try again.',
      error: error
    };
  }
};

// Dedicated Chatbot function using the simpler endpoint
export const sendChatbotMessage = async (message: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if we have successful responses from any AI service
    if (data.responses) {
      // Find the first successful response (preferably Gemini)
      const geminiResponse = data.responses.gemini;
      const cohereResponse = data.responses.cohere;
      const openrouterResponse = data.responses.openrouter;
      const glmResponse = data.responses.glm;
      const deepseekResponse = data.responses.deepseek;
      
      // Prioritize Gemini, then Cohere, then OpenRouter, then GLM 4.5, then DeepSeek 3.1
      let aiResponse = null;
      if (geminiResponse && geminiResponse.success) {
        aiResponse = geminiResponse;
      } else if (cohereResponse && cohereResponse.success) {
        aiResponse = cohereResponse;
      } else if (openrouterResponse && openrouterResponse.success) {
        aiResponse = openrouterResponse;
      } else if (glmResponse && glmResponse.success) {
        aiResponse = glmResponse;
      } else if (deepseekResponse && deepseekResponse.success) {
        aiResponse = deepseekResponse;
      }
      
      if (aiResponse && aiResponse.response) {
        return {
          success: true,
          message: aiResponse.response,
          data: data
        };
      }
    }
    
    // If no successful response found
    return {
      success: false,
      message: 'No response from AI',
      data: data
    };
  } catch (error) {
    console.error('Error calling chatbot backend:', error);
    return {
      success: false,
      message: 'Failed to get response from AI. Please try again.',
      error: error
    };
  }
};

// Get token usage information for all AI services
export const getTokenUsage = async (): Promise<any> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/token-usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return {
      error: 'Failed to fetch token usage',
      tokenUsage: {}
    };
  }
};

// Get service status for all AI services
export const getServiceStatus = async (): Promise<any> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/service-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching service status:', error);
    return {
      error: 'Failed to fetch service status',
      services: {}
    };
  }
};
