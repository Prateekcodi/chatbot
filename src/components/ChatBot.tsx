import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '../types';
import { streamChatbotMessage } from '../services/api';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your premium AI assistant. How can I help you today? 🚀✨',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Start with an empty bot message and stream in chunks
      const botMessageId = generateId();
      let accumulated = '';
      setMessages((prev: Message[]) => [
        ...prev,
        { id: botMessageId, text: '', sender: 'bot', timestamp: new Date() }
      ]);

      const updateBotMessage = (id: string, text: string) => {
        setMessages((prev: Message[]) => prev.map(m => (
          m.id === id ? { ...m, text } : m
        )));
      };

      for await (const chunk of streamChatbotMessage(userMessage.text)) {
        accumulated += chunk;
        updateBotMessage(botMessageId, accumulated);
      }
      setIsTyping(false);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage: Message = {
        id: generateId(),
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0A0A0F] overflow-hidden" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-purple-900/30 to-pink-900/30"></div>
      
      {/* Animated Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.01] opacity-60"></div>
      
      {/* Floating Orbs with Premium Gradients */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-emerald-400/20 via-teal-500/20 to-cyan-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-r from-violet-400/20 via-purple-500/20 to-indigo-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[120vw] h-[120vh] bg-gradient-to-r from-rose-400/20 via-pink-500/20 to-fuchsia-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '4s' }}></div>
      
      {/* Premium Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-black/[0.03] backdrop-blur-[0.5px]"></div>

      {/* Additional Bottom Coverage */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent"></div>

      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4 pt-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-4xl h-[85vh] relative overflow-hidden"
        >
          {/* Premium Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-2xl"></div>
          
          {/* Animated Border */}
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-r from-emerald-400/20 via-violet-400/20 to-rose-400/20 opacity-50 animate-pulse"></div>
          
          <div className="relative h-full flex flex-col">
            {/* Premium Header */}
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-slate-800/90 via-slate-700/90 to-slate-800/90 backdrop-blur-xl text-white p-4 flex items-center justify-between border-b border-white/20 rounded-t-[3rem]"
            >
              <div className="flex items-center space-x-4">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  className="relative"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-violet-500 to-rose-500 rounded-xl flex items-center justify-center shadow-xl border border-white/20">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <motion.div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  ></motion.div>
                </motion.div>
                
                <div className="space-y-0.5">
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight"
                  >
                    Premium AI Assistant
                  </motion.h1>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-emerald-400 text-xs font-semibold">Online</span>
                    </div>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="text-slate-300 text-xs font-medium">Ready to help</span>
                  </motion.div>
                </div>
              </div>
              
              {/* Status Indicators */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="hidden lg:flex flex-col items-end space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 text-xs font-semibold">AI Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
                  <span className="text-violet-400 text-xs font-semibold">Real-time</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></div>
                  <span className="text-rose-400 text-xs font-semibold">Premium</span>
                </div>
              </motion.div>
            </motion.header>

            {/* Messages Container */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-800/30 to-slate-900/30 rounded-b-[2rem]"
            >
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.1,
                      ease: [0.4, 0, 0.2, 1],
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-4`}>
                      {message.sender === 'bot' && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                          className="w-12 h-12 bg-gradient-to-br from-emerald-400 via-violet-500 to-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl border border-white/20"
                        >
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        </motion.div>
                      )}
                      
                      <motion.div 
                        className={`message-bubble px-6 py-4 rounded-[2rem] shadow-2xl backdrop-blur-xl ${
                          message.sender === 'user' 
                            ? 'bg-gradient-to-br from-emerald-500 via-violet-500 to-rose-500 text-white rounded-br-[1rem] border border-white/20' 
                            : 'bg-gradient-to-br from-slate-700/80 to-slate-600/80 text-slate-100 rounded-bl-[1rem] border border-white/20'
                        }`}
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: "0 25px 50px rgba(0,0,0,0.15)"
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-sm leading-relaxed font-medium">{message.text}</p>
                        <div className={`flex items-center justify-between mt-3 ${
                          message.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                        }`}>
                          <p className="text-xs font-medium">
                            {formatTime(message.timestamp)}
                          </p>
                          {message.sender === 'user' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 }}
                              className="flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-start"
                >
                  <div className="flex items-end space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 via-violet-500 to-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl border border-white/20">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="bg-gradient-to-br from-slate-700/80 to-slate-600/80 text-slate-100 rounded-[2rem] rounded-bl-[1rem] px-6 py-4 border border-white/20 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium mr-2">AI is typing</span>
                        <div className="flex space-x-1">
                          <motion.div 
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          ></motion.div>
                          <motion.div 
                            className="w-2 h-2 bg-violet-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          ></motion.div>
                          <motion.div 
                            className="w-2 h-2 bg-rose-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          ></motion.div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-start"
                >
                  <div className="flex items-end space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 via-violet-500 to-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl border border-white/20">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="bg-gradient-to-br from-slate-700/80 to-slate-600/80 text-slate-100 rounded-[2rem] rounded-bl-[1rem] px-6 py-4 border border-white/20 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-6 h-6 border-2 border-slate-300 border-t-emerald-400 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-violet-400 rounded-full animate-spin" style={{ animationDelay: '0.5s' }}></div>
                        </div>
                        <span className="text-sm font-medium">Processing...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </motion.div>

            {/* Premium Input Area */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="border-t border-white/20 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-xl rounded-b-[3rem]"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-rose-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything... (e.g., 'Write a story', 'Explain quantum physics', 'Help me code')"
                    disabled={isLoading}
                    className="relative w-full px-5 py-4 bg-gradient-to-r from-slate-700/80 to-slate-600/80 border border-white/20 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium placeholder-slate-400 transition-all duration-300 backdrop-blur-xl shadow-2xl text-white"
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                  className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 via-violet-500 to-rose-500 text-white rounded-[2rem] flex items-center justify-center hover:from-emerald-600 hover:via-violet-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 border border-white/20 backdrop-blur-xl overflow-hidden group"
                >
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <svg className="relative z-10 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </div>
              
              {/* Input Tips */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-2 text-center"
              >
                <p className="text-slate-400 text-xs">
                  💡 <span className="font-medium">Pro tip:</span> Try asking complex questions or request creative content!
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatBot;
