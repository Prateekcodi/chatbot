// API service for chatbot integration
// This file contains placeholder functions for Gemini Pro API integration

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

// Configuration for API
export const API_CONFIG = {
  // Replace with your actual Gemini Pro API endpoint and key
  GEMINI_API_URL: process.env.REACT_APP_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  GEMINI_API_KEY: process.env.REACT_APP_GEMINI_API_KEY || 'your-api-key-here',
};

// Function for sending message to Gemini Pro
export const sendMessageToGemini = async (message: string): Promise<ChatResponse> => {
  try {
    // Check if API key is configured
    if (!API_CONFIG.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY === 'your-api-key-here' || API_CONFIG.GEMINI_API_KEY.length < 10) {
      return {
        message: 'Please configure your Gemini Pro API key in the .env file. For now, this is a placeholder response.',
        success: true
      };
    }

    console.log('Using API key:', API_CONFIG.GEMINI_API_KEY.substring(0, 10) + '...');

    // Make actual API call to Gemini Pro
    const response = await fetch(`${API_CONFIG.GEMINI_API_URL}?key=${API_CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data);
      throw new Error(data.error?.message || 'Failed to get response from Gemini Pro');
    }

    // Extract the response text from Gemini Pro
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      console.error('No response text in data:', data);
      throw new Error('No response text received from Gemini Pro');
    }

    return {
      message: responseText,
      success: true
    };
    
  } catch (error) {
    console.error('Error calling Gemini Pro API:', error);
    return {
      message: 'Sorry, I encountered an error. Please try again later.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
