export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface SendMessageFunction {
  (text: string): Promise<void>;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  model: string;
  tokens?: number;
}

export interface APIResponse {
  prompt: string;
  processingTime: string;
  timestamp: string;
  responses: {
    gemini: AIResponse;
    huggingface: AIResponse;
    cohere: AIResponse;
    openrouter: AIResponse;
    glm: AIResponse;
    deepseek: AIResponse;
  };
}
