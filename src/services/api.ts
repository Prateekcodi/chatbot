// API service for frontend to communicate with backend
// Support both Vite and CRA environment variables
const getEnv = (viteKey: string, craKey: string) => {
  // Vite at build-time
  // @ts-ignore
  const viteVal = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey];
  // CRA at build-time
  // @ts-ignore
  const craVal = typeof process !== 'undefined' && process.env && process.env[craKey];
  return (viteVal as string) || (craVal as string) || '';
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'REACT_APP_BACKEND_URL') || 'https://chatbot-1-u7m0.onrender.com';

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

// Streaming API function for real-time typing effect
export const sendStreamingMessage = async (
  message: string,
  onChunk: (data: any) => void,
  onComplete: (data: any) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ask-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onChunk(data);
            
            if (data.type === 'complete') {
              onComplete(data);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error');
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

// Stream chatbot response via chunked HTTP
export async function* streamChatbotMessage(message: string): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${BACKEND_URL}/api/chatbot-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: message })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

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
export const getServiceStatus = async (run: boolean = false): Promise<any> => {
  try {
    const url = `${BACKEND_URL}/api/service-status${run ? '?run=true' : ''}`;
    const response = await fetch(url, {
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
      services: {},
      summary: {
        operational: 0,
        total: 0,
        status: 'Service check unavailable'
      }
    };
  }
};

// Fetch saved conversations from backend (Supabase-backed)
export const getConversations = async (
  page: number = 1,
  limit: number = 20,
  type?: 'multibot' | 'chatbot'
): Promise<{ data: any[]; total: number }> => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) params.set('type', type);
    const response = await fetch(`${BACKEND_URL}/api/conversations?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { data: data.data || [], total: data.total || 0 };
  } catch (error) {
    return { data: [], total: 0 };
  }
};
