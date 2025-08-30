// API service for frontend to communicate with backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://your-service-name.onrender.com';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
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
    return {
      success: true,
      message: data.responses?.[0]?.text || 'No response from AI',
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

// Function to format conversation history for context
export const formatConversationHistory = (messages: ChatMessage[]): string => {
  return messages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');
};

// Function to validate API configuration
export const validateApiConfig = (): boolean => {
  return !!(API_CONFIG.GEMINI_API_KEY && API_CONFIG.GEMINI_API_KEY !== 'your-api-key-here');
};

// Export default API service
export default {
  sendMessageToGemini,
  formatConversationHistory,
  validateApiConfig,
  API_CONFIG
};
