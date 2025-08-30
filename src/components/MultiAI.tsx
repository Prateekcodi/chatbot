import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  model: string;
  tokens?: number;
}

interface APIResponse {
  prompt: string;
  processingTime: string;
  timestamp: string;
  responses: {
    gemini: AIResponse;
    huggingface: AIResponse;
    cohere: AIResponse;
    openrouter: AIResponse;
  };
}

const MultiAI: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<{ aiName: string; response: AIResponse } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<APIResponse[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://chatbot-1-u7m0.onrender.com';

      const response = await fetch(`${backendUrl}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get responses');
      }

      setConversationHistory(prev => [...prev, data]);
      setResults(data);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setResults(null);
    setSelectedResponse(null);
    setModalOpen(false);
  };

  const getAIConfig = (aiName: string) => {
    const configs = {
      gemini: {
        name: 'Gemini Pro',
        color: 'from-emerald-400 via-teal-500 to-cyan-600',
        bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-100',
        borderColor: 'border-emerald-200/50',
        shadowColor: 'shadow-emerald-500/20',
        icon: '🤖',
        description: 'Google\'s most advanced AI model',
        accent: 'emerald'
      },
      huggingface: {
        name: 'Hugging Face',
        color: 'from-amber-400 via-orange-500 to-red-600',
        bgColor: 'bg-gradient-to-br from-amber-50 to-orange-100',
        borderColor: 'border-amber-200/50',
        shadowColor: 'shadow-amber-500/20',
        icon: '🤗',
        description: 'Open-source AI powerhouse',
        accent: 'amber'
      },
      cohere: {
        name: 'Cohere',
        color: 'from-violet-400 via-purple-500 to-indigo-600',
        bgColor: 'bg-gradient-to-br from-violet-50 to-purple-100',
        borderColor: 'border-violet-200/50',
        shadowColor: 'shadow-violet-500/20',
        icon: '🧠',
        description: 'Advanced language understanding',
        accent: 'violet'
      },
      openrouter: {
        name: 'OpenRouter',
        color: 'from-rose-400 via-pink-500 to-fuchsia-600',
        bgColor: 'bg-gradient-to-br from-rose-50 to-pink-100',
        borderColor: 'border-rose-200/50',
        shadowColor: 'shadow-rose-500/20',
        icon: '🚀',
        description: 'Multi-model AI gateway',
        accent: 'rose'
      },
      glm: {
        name: 'GLM 4.5 Air',
        color: 'from-blue-400 via-indigo-500 to-purple-600',
        bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-100',
        borderColor: 'border-blue-200/50',
        shadowColor: 'shadow-blue-500/20',
        icon: '🌟',
        description: 'Advanced Chinese AI model',
        accent: 'blue'
      },
      deepseek: {
        name: 'DeepSeek 3.1',
        color: 'from-green-400 via-emerald-500 to-teal-600',
        bgColor: 'bg-gradient-to-br from-green-50 to-emerald-100',
        borderColor: 'border-green-200/50',
        shadowColor: 'shadow-green-500/20',
        icon: '🔍',
        description: 'Advanced reasoning AI model',
        accent: 'green'
      }
    };
    return configs[aiName as keyof typeof configs];
  };

  const openResponseModal = (aiName: string, response: AIResponse) => {
    setSelectedResponse({ aiName, response });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedResponse(null);
  };

  const navigateToResponse = useCallback((direction: 'next' | 'prev') => {
    if (!selectedResponse || !results) return;

    const aiNames = Object.keys(results.responses);
    const currentIndex = aiNames.indexOf(selectedResponse.aiName);
    let newIndex;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % aiNames.length;
    } else {
      newIndex = (currentIndex - 1 + aiNames.length) % aiNames.length;
    }

    const newAiName = aiNames[newIndex];
    const newResponse = results.responses[newAiName as keyof typeof results.responses];
    setSelectedResponse({ aiName: newAiName, response: newResponse });
  }, [selectedResponse, results]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalOpen) return;

      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        navigateToResponse('prev');
      } else if (e.key === 'ArrowRight') {
        navigateToResponse('next');
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [modalOpen, navigateToResponse]);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] overflow-y-auto">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.01] opacity-60"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-emerald-400/20 via-teal-500/20 to-cyan-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-violet-400/20 via-purple-500/20 to-indigo-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-gradient-to-r from-rose-400/20 via-pink-500/20 to-fuchsia-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '4s' }}></div>
      
      {/* Premium Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/30 to-slate-900/50 backdrop-blur-sm"></div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* Premium Header */}
        <header className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-auto-y"
            >
              {/* Premium Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl"></div>
              
              {/* Animated Border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-400/20 via-violet-400/20 to-rose-400/20 opacity-50 animate-pulse"></div>
              
              <div className="relative p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-4">
                    <motion.h1 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-5xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight"
                    >
                      Multi-AI Studio
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-slate-300/80 text-xl font-medium max-w-2xl leading-relaxed"
                    >
                      Experience the future of AI with our cutting-edge multi-model comparison platform. 
                      Get insights from the world's most advanced AI models in real-time.
                    </motion.p>
                  </div>
                  
                  {/* Status Indicators */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="hidden lg:flex flex-col items-end space-y-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-emerald-400 text-sm font-semibold">All Systems Operational</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-violet-400 rounded-full animate-pulse"></div>
                      <span className="text-violet-400 text-sm font-semibold">Real-time Processing</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-rose-400 rounded-full animate-pulse"></div>
                      <span className="text-rose-400 text-sm font-semibold">Premium Performance</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-auto-y"
            >
              {/* Premium Content Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 via-slate-700/60 to-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl"></div>
              
              <div className="relative p-8">
                {/* Conversation History Info */}
                {conversationHistory.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center space-x-4 text-slate-300 mb-8"
                  >
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                      <span className="text-emerald-400">📚</span>
                      <span className="text-sm font-medium">{conversationHistory.length} conversation{conversationHistory.length !== 1 ? 's' : ''} in history</span>
                    </div>
                    <button
                      onClick={() => {
                        setResults(null);
                        setSelectedResponse(null);
                        setModalOpen(false);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-sm rounded-full hover:from-emerald-500/30 hover:to-teal-500/30 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                    >
                      🆕 New Conversation
                    </button>
                    <button
                      onClick={clearHistory}
                      className="px-4 py-2 bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-400/30 text-rose-300 text-sm rounded-full hover:from-rose-500/30 hover:to-pink-500/30 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                    >
                      🗑️ Clear History
                    </button>
                  </motion.div>
                )}

                {/* Premium Input Form */}
                <motion.form
                  onSubmit={handleSubmit}
                  className="w-full mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-rose-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex space-x-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ask anything... (e.g., 'Write a story', 'Explain quantum physics', 'Give me a recipe')"
                          className="w-full px-6 py-5 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all duration-500 text-lg pr-16 shadow-2xl"
                          disabled={isLoading}
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="relative px-8 py-5 bg-gradient-to-r from-emerald-500 via-violet-500 to-rose-500 text-white font-bold rounded-2xl hover:from-emerald-600 hover:via-violet-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-emerald-500/25 min-w-[140px] overflow-auto-y group"
                      >
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        <span className="relative z-10">
                          {isLoading ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span className="text-lg">Processing...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              <span className="text-lg">Send</span>
                            </div>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.form>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mb-6 p-4 bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-400/30 rounded-2xl text-rose-200 backdrop-blur-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Results Section */}
                <AnimatePresence>
                  {results && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="space-y-6"
                    >
                      {/* Processing Info */}
                      <div className="text-center text-slate-300 mb-6">
                        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 px-4 py-2 rounded-full border border-white/10">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">
                            Processed in {results?.processingTime} • {results?.timestamp ? new Date(results.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      </div>

                      {/* AI Response Cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                        {results && Object.entries(results.responses).map(([aiName, response], index) => {
                          const config = getAIConfig(aiName);
                          
                          return (
                            <motion.div
                              key={aiName}
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`relative group overflow-auto-y ${config.bgColor} border ${config.borderColor} rounded-3xl shadow-2xl backdrop-blur-sm h-96 flex flex-col transform transition-all duration-500 hover:scale-105 hover:shadow-2xl`}
                            >
                              {/* Animated Border */}
                              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                              
                              {/* Header */}
                              <div className="relative p-6 pb-4">
                                <div className="flex items-center space-x-4">
                                  <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                    {config.icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-slate-800 text-lg truncate">{config.name}</h3>
                                    <p className="text-sm text-slate-600 truncate">{config.description}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Response Content */}
                              <div className="relative flex-1 px-6 pb-6 space-y-4 overflow-auto-y">
                                {response.success ? (
                                  <>
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm flex-1 overflow-auto-y">
                                      <p className="text-slate-800 text-sm leading-relaxed line-clamp-6">
                                        {response.response}
                                      </p>
                                      {response.response && response.response.length > 200 && (
                                        <div className="mt-3 text-xs text-slate-500 text-center">
                                          Response truncated for display
                                        </div>
                                      )}
                                      <button
                                        onClick={() => openResponseModal(aiName, response)}
                                        className={`mt-4 w-full py-3 px-4 bg-gradient-to-r ${config.color} text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 shadow-md`}
                                      >
                                        Click to read full response
                                      </button>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-600">
                                      <span className="truncate">Model: {response.model}</span>
                                      {response.tokens && <span>{response.tokens} tokens</span>}
                                    </div>
                                  </>
                                ) : (
                                  <div className="bg-red-50/80 border border-red-200/50 rounded-2xl p-4 flex-1">
                                    <div className="flex items-center space-x-3 text-red-600 mb-3">
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      <span className="font-semibold text-sm">Error</span>
                                    </div>
                                    <p className="text-red-600 text-sm leading-relaxed">{response.error}</p>
                                    <button
                                      onClick={() => openResponseModal(aiName, response)}
                                      className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 shadow-md"
                                    >
                                      Click to see error details
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading State */}
                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-16"
                    >
                      <div className="flex flex-col items-center space-y-6">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-violet-500 rounded-full animate-spin" style={{ animationDelay: '0.5s' }}></div>
                          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-rose-500 rounded-full animate-spin" style={{ animationDelay: '1s' }}></div>
                        </div>
                        <div className="text-slate-300">
                          <p className="text-xl font-semibold">Processing with AI Services...</p>
                          <p className="text-sm opacity-80">This may take a few seconds</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="conversation-history w-full space-y-6 max-h-[75vh] overflow-y-auto overflow-x-hidden px-4 pb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-700/40 backdrop-blur-xl rounded-3xl border border-white/10"></div>
              <div className="relative p-6">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  📚 Conversation History
                </h3>
                
                <div className="space-y-4">
                  {conversationHistory.map((conversation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:border-white/30 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-white">
                          <span className="font-semibold">Q: {conversation.prompt}</span>
                          <span className="text-slate-300 text-sm ml-3">
                            • {conversation.processingTime} • {new Date(conversation.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              setResults(conversation);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-400/30 text-violet-300 text-sm rounded-lg hover:from-violet-500/30 hover:to-purple-500/30 transition-all duration-300 backdrop-blur-sm"
                          >
                            🔍 View Details
                          </button>
                          <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-sm rounded-lg hover:from-emerald-500/30 hover:to-teal-500/30 transition-all duration-300 backdrop-blur-sm"
                          >
                            ⬆️ Top
                          </button>
                        </div>
                      </div>
                      
                      {/* Quick AI Response Preview */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(conversation.responses).map(([aiName, response]) => {
                          const config = getAIConfig(aiName);
                          return (
                            <div key={aiName} className={`${config.bgColor} border ${config.borderColor} rounded-xl p-3 text-xs backdrop-blur-sm`}>
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">{config.icon}</span>
                                <span className="font-semibold text-slate-800">{config.name}</span>
                              </div>
                              <div className="text-slate-600 truncate">
                                {response.success 
                                  ? response.response?.substring(0, 50) + '...'
                                  : response.error?.substring(0, 50) + '...'
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer with Credit */}
      <footer className="mt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-xl rounded-full px-6 py-3 border border-white/10">
              <span className="text-emerald-400">✨</span>
              <span className="text-slate-300 text-sm font-medium">Made with ❤️ by Prateek</span>
              <span className="text-violet-400">✨</span>
            </div>
            <p className="text-slate-400/60 text-xs mt-3">
              Multi-AI Studio • Cutting-edge AI comparison platform
            </p>
          </motion.div>
        </div>
      </footer>

      {/* Premium Modal */}
      <AnimatePresence>
        {modalOpen && selectedResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto-y border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-2xl flex items-center justify-center text-3xl shadow-xl">
                      {selectedResponse && getAIConfig(selectedResponse.aiName).icon}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">{selectedResponse && getAIConfig(selectedResponse.aiName).name}</h2>
                      <p className="text-slate-300 text-lg">{selectedResponse && getAIConfig(selectedResponse.aiName).description}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-12 h-12 bg-slate-700/50 hover:bg-slate-600/50 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 backdrop-blur-sm"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                {selectedResponse && selectedResponse.response.success ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                      <h3 className="font-semibold text-white text-xl mb-4">Response:</h3>
                      <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-lg">
                        {selectedResponse.response.response}
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-400">
                      <span>Model: {selectedResponse.response.model}</span>
                      {selectedResponse.response.tokens && <span>{selectedResponse.response.tokens} tokens</span>}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-red-900/50 to-pink-900/50 border border-red-400/30 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 text-red-300 mb-4">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-lg">Error</span>
                    </div>
                    <p className="text-red-200 text-lg leading-relaxed">{selectedResponse && selectedResponse.response.error}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Navigation */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateToResponse('prev')}
                    className="flex items-center space-x-3 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-white/20 text-white text-lg rounded-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous AI</span>
                  </button>
                  
                  <div className="text-slate-300 text-center">
                    <div className="text-lg font-semibold">{selectedResponse && getAIConfig(selectedResponse.aiName).name}</div>
                    <div className="text-sm opacity-80">
                      {results && selectedResponse ? `${Object.keys(results.responses).indexOf(selectedResponse.aiName) + 1} of ${Object.keys(results.responses).length}` : '1 of 1'}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigateToResponse('next')}
                    className="flex items-center space-x-3 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-white/20 text-white text-lg rounded-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  >
                    <span>Next AI</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiAI;
