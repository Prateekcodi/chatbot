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
