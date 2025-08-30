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
