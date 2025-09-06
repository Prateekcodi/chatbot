import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
}

interface Results {
  responses: Record<string, AIResponse>;
  timestamp: string;
}

const MultiAI: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<{ aiName: string; response: AIResponse } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(0);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const renderMarkdown = (text: string) => {
    if (!text) return text;
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded overflow-x-auto my-2">{children}</pre>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">{children}</blockquote>,
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  const getAIConfig = (aiName: string) => {
    const configs = {
      'Claude 3.5 Sonnet': {
        name: 'Claude 3.5 Sonnet',
        description: 'Anthropic\'s most capable AI model',
        icon: '🤖',
        color: 'from-blue-500 to-purple-600'
      },
      'GPT-4o': {
        name: 'GPT-4o',
        description: 'OpenAI\'s most advanced model',
        icon: '🧠',
        color: 'from-green-500 to-blue-600'
      },
      'Gemini 1.5 Pro': {
        name: 'Gemini 1.5 Pro',
        description: 'Google\'s most capable model',
        icon: '💎',
        color: 'from-yellow-500 to-orange-600'
      }
    };
    
    return configs[aiName as keyof typeof configs];
  };

  const openResponseModal = (aiName: string, response: AIResponse) => {
    setSelectedResponse({ aiName, response });
    setModalOpen(true);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.left = '0';
    document.body.style.right = '0';
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedResponse(null);
    // Restore body scroll
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
  };

  const navigateToResponse = useCallback((direction: 'next' | 'prev') => {
    if (!selectedResponse || !results) return;

    const aiNames = Object.keys(results.responses);
    const currentIndex = aiNames.indexOf(selectedResponse.aiName);
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentIndex + 1 >= aiNames.length ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex - 1 < 0 ? aiNames.length - 1 : currentIndex - 1;
    }
    
    const newAiName = aiNames[newIndex];
    const newResponse = results.responses[newAiName];
    setSelectedResponse({ aiName: newAiName, response: newResponse });
  }, [selectedResponse, results]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResults(null);
    setIsTyping(false);
    setCurrentTypingIndex(0);

    try {
      const response = await fetch('/api/multi-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI responses');
      }

      const data = await response.json();
      setResults(data);
      
      // Start typing animation
      setIsTyping(true);
      setCurrentTypingIndex(0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Typing animation effect
  useEffect(() => {
    if (!isTyping || !results) return;

    const aiNames = Object.keys(results.responses);
    if (currentTypingIndex >= aiNames.length) {
      setIsTyping(false);
      return;
    }

    const currentAi = aiNames[currentTypingIndex];
    const currentResponse = results.responses[currentAi];
    
    if (currentResponse.success) {
      const responseText = (currentResponse as any).response || '';
      let charIndex = 0;
      
      const typeChar = () => {
        if (charIndex < responseText.length) {
          charIndex++;
          typingTimeoutRef.current = setTimeout(typeChar, 20);
        } else {
          setTimeout(() => {
            setCurrentTypingIndex(prev => prev + 1);
          }, 1000);
        }
      };
      
      typeChar();
    } else {
      setTimeout(() => {
        setCurrentTypingIndex(prev => prev + 1);
      }, 500);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, currentTypingIndex, results]);

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
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [modalOpen, navigateToResponse]);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] overflow-y-auto overflow-x-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.01] opacity-60"></div>
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Multi-AI
            <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Response Center
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Get responses from multiple AI models simultaneously and compare their answers
          </p>
        </div>

        {/* Query Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto mb-12">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask your question to multiple AI models..."
              className="w-full h-32 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute bottom-4 right-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {isLoading ? 'Processing...' : 'Ask All AIs'}
            </button>
          </div>
        </form>

        {/* Results */}
        {results && (
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(results.responses).map(([aiName, response]) => (
                <motion.div
                  key={aiName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getAIConfig(aiName).color} flex items-center justify-center text-2xl mr-4`}>
                      {getAIConfig(aiName).icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{aiName}</h3>
                      <p className="text-gray-400 text-sm">{getAIConfig(aiName).description}</p>
                    </div>
                  </div>

                  {response.success ? (
                    <div className="text-gray-300 mb-4">
                      <div className="whitespace-pre-wrap">
                        {renderMarkdown((response as any).response)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-400 mb-4">
                      Error: {(response as any).error}
                    </div>
                  )}

                  <button
                    onClick={() => openResponseModal(aiName, response)}
                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    Read Full Response
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-white mb-2"
            >
              Debug Info {showDebugInfo ? '▼' : '▶'}
            </button>
            {showDebugInfo && (
              <div className="text-sm text-gray-300">
                <p>User: {user?.email}</p>
                <p>Location: {location.pathname}</p>
                <p>Hash: {window.location.hash}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simple Working Modal */}
      {modalOpen && selectedResponse && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              padding: '20px',
              position: 'relative',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Simple Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>{selectedResponse.aiName} Response</h2>
              <button
                onClick={closeModal}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Simple Content */}
            <div style={{ color: '#333', lineHeight: '1.6' }}>
              {selectedResponse && selectedResponse.response.success ? (
                <div>
                  <h3 style={{ marginBottom: '10px', color: '#333' }}>Response:</h3>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    {renderMarkdown((selectedResponse.response as any).response)}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '10px', color: '#dc3545' }}>Error:</h3>
                  <div style={{ 
                    background: '#f8d7da', 
                    padding: '15px', 
                    borderRadius: '8px',
                    border: '1px solid #f5c6cb',
                    color: '#721c24'
                  }}>
                    {selectedResponse && (selectedResponse.response as any).error}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAI;