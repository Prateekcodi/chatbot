import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTokenUsage, getConversations, sendStreamingMessage } from '../services/api';
import { AIResponse, APIResponse } from '../types';

interface TokenUsage {
  [key: string]: {
    service: string;
    model: string;
    tokensUsed: number;
    estimatedLimit: number;
    remaining: number;
    percentage: number;
  };
}

interface ServiceStatus {
  [key: string]: {
    operational: boolean;
    responseTime?: number;
    model: string;
    error?: string;
  };
}

interface ServiceSummary {
  operational: number;
  total: number;
  status: string;
}

const MultiAI: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<{ aiName: string; response: AIResponse } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<APIResponse[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({});
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({});
  const [serviceSummary, setServiceSummary] = useState<ServiceSummary>({ operational: 0, total: 0, status: 'Checking...' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  // const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [streamingMode, setStreamingMode] = useState(true);
  const [streamingResponses, setStreamingResponses] = useState<{[key: string]: {text: string, isComplete: boolean, model: string}}>({});
  const [cacheHit, setCacheHit] = useState(false);
  const [truncatedElements, setTruncatedElements] = useState<Set<string>>(new Set());

  // Helper function to determine if we should show the "Click to read full response" button
  const shouldShowFullResponseButton = (response: AIResponse, aiName: string) => {
    if (!response.success || !response.response) return false;
    
    // Check if we've already determined this element is truncated
    if (truncatedElements.has(aiName)) return true;
    
    // Check if response is long enough to potentially be truncated
    const responseText = response.response;
    const lineCount = responseText.split('\n').length;
    const charCount = responseText.length;
    const wordCount = responseText.split(/\s+/).length;
    
    // More sophisticated check: show button if response is likely to exceed 6 lines
    // This accounts for markdown formatting, code blocks, and different content types
    return lineCount > 4 || charCount > 300 || wordCount > 50;
  };





  const loadHistory = useCallback(async (page = 1) => {
    try {
      setIsHistoryLoading(true);
      const { data/*, total*/ } = await getConversations(page, 20, 'multibot');
      setHistoryItems(data);
      // setHistoryTotal(total);
      setHistoryPage(page);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // Fetch token usage and service status
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchTokenUsage = useCallback(async () => {
    try {
      const data = await getTokenUsage();
      if (data.tokenUsage) {
        setTokenUsage(data.tokenUsage);
      }
    } catch (error) {
      console.error('Error fetching token usage:', error);
    }
  }, []);

  // Fetch token usage once on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getTokenUsage();
        if (data.tokenUsage) setTokenUsage(data.tokenUsage);
      } catch {}
    })();
  }, []);

  const fetchServiceStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const resp: Record<string, any> = (results && (results as any).responses) || {};
      const entries: Array<[string, any]> = Object.entries(resp);
      const computed: any = {};
      let operational = 0;
      for (const [name, r] of entries) {
        const success = !!(r && (r as any).success === true);
        const errText = typeof (r as any)?.error === 'string' ? (r as any).error as string : '';
        const rateLimited = /(429|rate limit)/i.test(errText);
        computed[name] = {
          operational: success,
          model: (r as any)?.model || '',
          error: success ? undefined : (errText || (rateLimited ? 'Rate limited' : 'Unavailable'))
        };
        if (success) operational += 1;
      }
      setServiceStatus(computed);
      setServiceSummary({
        operational,
        total: entries.length,
        status: entries.length > 0 ? (operational === entries.length ? 'All Operational' : `${operational}/${entries.length} Operational`) : 'No checks yet'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [results]);

  // Auto-compute status from latest results when they change
  useEffect(() => {
    if (results && (results as any).responses) {
      (async () => { await fetchServiceStatus(); })();
    }
  }, [results, fetchServiceStatus]);

  // Load data is now manual to avoid unintended token usage
  // Removed automatic fetch on mount and periodic refresh

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStreamingResponses({});
    setCacheHit(false);
    setResults(null); // Clear previous results for streaming display
    setTruncatedElements(new Set()); // Clear truncated elements for new results

    if (streamingMode) {
      // Use streaming API
      try {
        await sendStreamingMessage(
          prompt.trim(),
          (data) => {
            // Handle streaming chunks
            if (data.type === 'ai_start') {
              setStreamingResponses(prev => ({
                ...prev,
                [data.ai]: { text: '', isComplete: false, model: data.model }
              }));
            } else if (data.type === 'ai_chunk') {
              setStreamingResponses(prev => ({
                ...prev,
                [data.ai]: { 
                  text: data.text, 
                  isComplete: data.isComplete,
                  model: prev[data.ai]?.model || data.ai
                }
              }));
            } else if (data.type === 'cache_hit') {
              setCacheHit(true);
            } else if (data.type === 'ai_complete') {
              setStreamingResponses(prev => ({
                ...prev,
                [data.ai]: { 
                  ...prev[data.ai], 
                  isComplete: true 
                }
              }));
            }
          },
          (data) => {
            // Handle completion - convert streaming responses to normal results format
            console.log('Streaming complete:', data);
            
            // Get current streaming responses before clearing them
            setStreamingResponses(currentStreamingResponses => {
              // Convert streaming responses to the normal results format
              const finalResults: APIResponse = {
                prompt: prompt.trim(),
                processingTime: data.processingTime || '0ms',
                timestamp: data.timestamp || new Date().toISOString(),
                responses: {
                  gemini: { success: false, error: 'Not available', model: 'Gemini' },
                  cohere: { success: false, error: 'Not available', model: 'Cohere' },
                  openrouter: { success: false, error: 'Not available', model: 'OpenRouter' },
                  glm: { success: false, error: 'Not available', model: 'GLM' },
                  deepseek: { success: false, error: 'Not available', model: 'DeepSeek' }
                }
              };

              // Convert streaming responses to normal format
              Object.entries(currentStreamingResponses).forEach(([aiName, response]) => {
                if (response.text && finalResults.responses[aiName as keyof typeof finalResults.responses]) {
                  finalResults.responses[aiName as keyof typeof finalResults.responses] = {
                    success: true,
                    response: response.text,
                    model: response.model,
                    tokens: 0 // We don't have token count in streaming
                  };
                }
              });

              // Detect cache hit from processingTime
              try {
                const pt = (data?.processingTime || '') as string;
                if (typeof pt === 'string' && /cached/i.test(pt)) {
                  setCacheHit(true);
                }
              } catch {}

              // Save to conversation history and set as results
              setConversationHistory(prev => [...prev, finalResults]);
              setResults(finalResults);
              setPrompt('');
              
              return {}; // Clear streaming responses
            });
          },
          (error) => {
            setError(error);
            setIsLoading(false);
          }
        );
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    } else {
      // Use regular API
      try {
        console.log('Using non-streaming API...');
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://chatbot-1-u7m0.onrender.com';

        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const response = await fetch(`${backendUrl}/api/ask`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: prompt.trim() }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Non-streaming response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to get responses`);
        }

        const data = await response.json();
        console.log('Non-streaming response data:', data);

        // Detect cache hit from processingTime
        try {
          const pt = (data?.processingTime || '') as string;
          if (typeof pt === 'string' && /cached/i.test(pt)) {
            setCacheHit(true);
          }
        } catch {}

        setConversationHistory(prev => [...prev, data]);
        setResults(data);
        setPrompt('');
        setIsLoading(false);
      } catch (err) {
        console.error('Non-streaming API error:', err);
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out. The AI services are taking too long to respond. Please try again or use streaming mode for faster responses.');
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
        setIsLoading(false);
      }
    }
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setResults(null);
    setSelectedResponse(null);
    setModalOpen(false);
  };

  const renderMarkdown = (text: string) => {
    if (!text) return text;
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mb-4 mt-6 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mb-3 mt-5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold text-slate-900 mb-2 mt-4 first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold text-slate-900 mb-2 mt-3 first:mt-0">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-bold text-slate-900 mb-1 mt-2 first:mt-0">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-bold text-slate-900 mb-1 mt-2 first:mt-0">{children}</h6>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-800">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm font-mono">{children}</code>;
            }
            return (
              <pre className="bg-slate-100 text-slate-800 p-3 rounded-lg overflow-x-auto mb-3">
                <code className="text-sm font-mono">{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-700 mb-3">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
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
    
    // Add error handling for unknown AI names
    if (!configs[aiName as keyof typeof configs]) {
      console.warn(`Unknown AI service: ${aiName}. Available services:`, Object.keys(configs));
      // Return a default config to prevent crashes
      return {
        name: aiName || 'Unknown AI',
        color: 'from-gray-400 via-gray-500 to-gray-600',
        bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
        borderColor: 'border-gray-200/50',
        shadowColor: 'shadow-gray-500/20',
        icon: '❓',
        description: 'Unknown AI service',
        accent: 'gray'
      };
    }
    
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
    <div className="relative min-h-screen bg-[#0A0A0F] overflow-y-auto overflow-x-hidden">
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
        {/* Modern Premium Header */}
        <header className="w-full px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative overflow-hidden"
            >
              {/* Modern Glass Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl"></div>
              
              {/* Animated Gradient Border */}
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 via-violet-400/30 to-rose-400/30 rounded-2xl sm:rounded-3xl animate-pulse"></div>
                <div className="absolute inset-[1px] bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 rounded-2xl sm:rounded-3xl"></div>
              </div>
              
              {/* Floating Particles */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: `${30 + (i % 2) * 40}%`,
                    }}
                    animate={{
                      y: [-10, 10, -10],
                      opacity: [0.2, 0.8, 0.2],
                    }}
                    transition={{
                      duration: 3 + i * 0.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>
              
              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
                  <div className="space-y-4 lg:space-y-6">
                    <motion.h1 
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight leading-tight"
                    >
                      Multi-AI Studio
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.8 }}
                      className="text-slate-300/90 text-base sm:text-lg lg:text-xl font-medium max-w-2xl leading-relaxed"
                    >
                      Experience the future of AI with our cutting-edge multi-model comparison platform. 
                      Get insights from the world's most advanced AI models in real-time.
                    </motion.p>
                  </div>
                  
                  {/* Modern Status Grid */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4"
                  >
                    {/* Status Cards */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className={`w-3 h-3 rounded-full animate-pulse ${serviceSummary.operational === serviceSummary.total ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                      <span className={`text-sm font-semibold ${serviceSummary.operational === serviceSummary.total ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {serviceSummary.status}
                      </span>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="w-3 h-3 bg-violet-400 rounded-full animate-pulse"></div>
                      <span className="text-violet-400 text-sm font-semibold">Real-time Processing</span>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="w-3 h-3 bg-rose-400 rounded-full animate-pulse"></div>
                      <span className="text-rose-400 text-sm font-semibold">Premium Performance</span>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-400 text-sm font-semibold">
                        Tokens: {(() => {
                          const total = Object.values(tokenUsage || {}).reduce((sum, service) => sum + (service?.remaining || 0), 0);
                          return isFinite(total) && total > 0 ? total.toLocaleString() + '+' : '—';
                        })()} Available
                      </span>
                    </motion.div>
                    
                    {cacheHit && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center p-3 rounded-xl bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30"
                      >
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                          ⚡ Cache Hit
                        </span>
                      </motion.div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setShowHistory(true); loadHistory(1); }}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/10"
                      >
                        📚 View History
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchServiceStatus}
                        disabled={isRefreshing}
                        className={`px-4 py-2 text-sm rounded-xl transition-all duration-300 backdrop-blur-sm border ${
                          isRefreshing 
                            ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-600/50' 
                            : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border-blue-500/30'
                        }`}
                      >
                        {isRefreshing ? '🔄 Checking...' : '🔄 Refresh Status'}
                      </motion.button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="relative overflow-hidden"
            >
              {/* Modern Glass Content Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/70 via-slate-700/70 to-slate-800/70 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl"></div>
              
              {/* Subtle Animated Border */}
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-violet-400/10 to-rose-400/10 rounded-2xl sm:rounded-3xl animate-pulse"></div>
                <div className="absolute inset-[1px] bg-gradient-to-br from-slate-800/70 via-slate-700/70 to-slate-800/70 rounded-2xl sm:rounded-3xl"></div>
              </div>
              
              <div className="relative p-6 sm:p-8">
                {/* Conversation History Info */}
                {conversationHistory.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center text-slate-300 mb-8"
                  >
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 px-3 sm:px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                      <span className="text-emerald-400">📚</span>
                      <span className="text-sm font-medium">{conversationHistory.length} conversation{conversationHistory.length !== 1 ? 's' : ''} in history</span>
                    </div>
                    {(() => {
                      const total = Object.values(tokenUsage || {}).reduce((sum, service: any) => sum + (service?.remaining || 0), 0);
                      if (!isFinite(total) || total <= 0) return null;
                      return (
                        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-700/50 to-blue-600/50 px-3 sm:px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                          <span className="text-blue-400">🔢</span>
                          <span className="text-sm font-medium">{total.toLocaleString()}+ tokens available</span>
                        </div>
                      );
                    })()}
                    <button
                      onClick={() => {
                        setResults(null);
                        setSelectedResponse(null);
                        setModalOpen(false);
                      }}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-sm rounded-full hover:from-emerald-500/30 hover:to-teal-500/30 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                    >
                      🆕 New Conversation
                    </button>
                    <button
                      onClick={clearHistory}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-400/30 text-rose-300 text-sm rounded-full hover:from-rose-500/30 hover:to-teal-500/30 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                    >
                      🗑️ Clear History
                    </button>
                  </motion.div>
                )}

                {/* Modern Input Form */}
                <motion.form
                  onSubmit={handleSubmit}
                  className="w-full mb-6 sm:mb-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  <div className="relative group">
                    {/* Animated Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-violet-500/30 to-rose-500/30 rounded-2xl sm:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ask anything... (e.g., 'Write a story', 'Explain quantum physics', 'Give me a recipe')"
                          className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all duration-500 text-base sm:text-lg pr-12 sm:pr-16 shadow-2xl"
                          disabled={isLoading}
                        />
                        <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                          <motion.div 
                            whileHover={{ scale: 1.1 }}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </motion.div>
                        </div>
                      </div>
                      
                      <motion.button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-emerald-500 via-violet-500 to-rose-500 text-white font-bold rounded-2xl sm:rounded-3xl hover:from-emerald-600 hover:via-violet-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 shadow-2xl hover:shadow-emerald-500/25 min-w-[120px] sm:min-w-[140px] group overflow-hidden"
                      >
                        {/* Animated Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        <span className="relative z-10 flex items-center justify-center space-x-2 sm:space-x-3">
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span className="text-sm sm:text-lg">Processing...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              <span className="text-sm sm:text-lg">Send</span>
                            </>
                          )}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </motion.form>

                {/* Modern Streaming Mode Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="mb-6 sm:mb-8 flex justify-center"
                >
                  <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6">
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-300 font-semibold text-sm sm:text-base">Streaming Mode:</span>
                        <motion.button
                          onClick={() => setStreamingMode(!streamingMode)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative inline-flex h-9 w-16 sm:h-10 sm:w-18 items-center rounded-full transition-all duration-300 shadow-lg ${
                            streamingMode ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-slate-600 to-slate-700'
                          }`}
                        >
                          <motion.span
                            animate={{
                              x: streamingMode ? 32 : 4,
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="inline-block h-7 w-7 sm:h-8 sm:w-8 transform rounded-full bg-white shadow-lg"
                          />
                        </motion.button>
                        <span className={`text-sm sm:text-base font-semibold ${streamingMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {streamingMode ? 'Live Typing' : 'Batch Mode'}
                        </span>
                      </div>
                      
                      {/* Mode Description */}
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${streamingMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="text-xs sm:text-sm text-slate-400">
                          {streamingMode ? '⚡ Real-time responses' : '📦 Complete responses'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Streaming Responses Display */}
                {streamingMode && Object.keys(streamingResponses).length > 0 && !results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <h3 className="text-lg font-semibold text-slate-300 mb-4 text-center">Live AI Responses</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {Object.entries(streamingResponses).map(([aiName, response]) => {
                        const config = getAIConfig(aiName);
                        return (
                          <div key={aiName} className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 backdrop-blur-sm`}>
                            <div className="flex items-center space-x-3 mb-3">
                              <div className={`w-8 h-8 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                                {config.icon}
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800">{config.name}</h4>
                                <div className="text-xs text-slate-600">{response.model}</div>
                              </div>
                              <div className="ml-auto">
                                {response.isComplete ? (
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                ) : (
                                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                )}
                              </div>
                            </div>
                            <div className="text-slate-700 text-sm leading-relaxed [&_pre]:bg-slate-100 [&_pre]:text-slate-800 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-3 [&_code]:bg-slate-100 [&_code]:text-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono">
                              {response.text ? renderMarkdown(response.text) : 'Starting response...'}
                              {!response.isComplete && (
                                <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

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

                      {/* Service Status Summary */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-300 mb-4 text-center">System Health Status</h3>
                        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                          <div className="flex items-center justify-center space-x-8 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-emerald-400">{serviceSummary.operational}</div>
                              <div className="text-sm text-slate-400">Operational</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-slate-400">/</div>
                              <div className="text-sm text-slate-400">of</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-400">{serviceSummary.total}</div>
                              <div className="text-sm text-slate-400">Total Services</div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                              serviceSummary.operational === serviceSummary.total 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${serviceSummary.operational === serviceSummary.total ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                              <span className="font-semibold">{serviceSummary.status}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Token Usage Display - Compact on Mobile */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-300 mb-4 text-center">Token Usage Status</h3>
                        
                        {/* Mobile: Compact horizontal scroll */}
                        <div className="block md:hidden">
                          <div className="flex space-x-3 overflow-x-auto pb-2">
                            {['gemini', 'cohere', 'openrouter', 'glm', 'deepseek'].map((serviceName) => {
                              const config = getAIConfig(serviceName);
                              const serviceData = tokenUsage[serviceName];
                              const isOperational = serviceStatus[serviceName]?.operational;
                              
                              if (!serviceData) return null;
                              
                              return (
                                <div key={serviceName} className={`${config.bgColor} border ${config.borderColor} rounded-lg p-3 text-center relative flex-shrink-0 w-32`}>
                                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isOperational ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                  
                                  <div className={`w-6 h-6 bg-gradient-to-r ${config.color} rounded-md flex items-center justify-center text-white text-sm mx-auto mb-1`}>
                                    {config.icon}
                                  </div>
                                  <h4 className="font-semibold text-slate-800 text-xs mb-1">{config.name}</h4>
                                  <div className="space-y-1">
                                    <div className="text-xs text-slate-600">
                                      {serviceData.percentage}% left
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                      <div 
                                        className={`bg-gradient-to-r ${config.color} h-1.5 rounded-full transition-all duration-500`} 
                                        style={{ width: `${serviceData.percentage}%` }}
                                      ></div>
                                    </div>
                                    <div className={`text-xs font-medium ${isOperational ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {isOperational ? '🟢' : '🔴'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Desktop: Full grid layout */}
                        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
                          {['gemini', 'cohere', 'openrouter', 'glm', 'deepseek'].map((serviceName) => {
                            const config = getAIConfig(serviceName);
                            const serviceData = tokenUsage[serviceName];
                            const isOperational = serviceStatus[serviceName]?.operational;
                            
                            if (!serviceData) return null;
                            
                            return (
                              <div key={serviceName} className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 text-center relative`}>
                                {/* Service Status Indicator */}
                                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isOperational ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                
                                <div className={`w-8 h-8 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center text-white text-lg mx-auto mb-2`}>
                                  {config.icon}
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm mb-1">{config.name}</h4>
                                <div className="space-y-1">
                                  <div className="text-xs text-slate-600">
                                    <span className="font-medium">Used:</span> {serviceData.tokensUsed.toLocaleString()} tokens
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    <span className="font-medium">Remaining:</span> {serviceData.remaining.toLocaleString()}+
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div 
                                      className={`bg-gradient-to-r ${config.color} h-2 rounded-full transition-all duration-500`} 
                                      style={{ width: `${serviceData.percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs text-slate-500">{serviceData.percentage}% available</div>
                                  
                                  {/* Service Status Text */}
                                  <div className={`text-xs font-medium ${isOperational ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {isOperational ? '🟢 Operational' : '🔴 Offline'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Modern AI Response Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
                        {results && Object.entries(results.responses).map(([aiName, response], index) => {
                          const config = getAIConfig(aiName);
                          
                          return (
                            <motion.div
                              key={aiName}
                              initial={{ opacity: 0, scale: 0.8, y: 30 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ 
                                delay: index * 0.1,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                y: -5,
                                transition: { duration: 0.2 }
                              }}
                              className={`relative group overflow-hidden ${config.bgColor} border ${config.borderColor} rounded-2xl sm:rounded-3xl shadow-xl backdrop-blur-sm min-h-[400px] sm:min-h-[450px] flex flex-col transform transition-all duration-500 hover:shadow-2xl`}
                            >
                              {/* Animated Gradient Border */}
                              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl">
                                <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl sm:rounded-3xl`}></div>
                                <div className="absolute inset-[1px] bg-gradient-to-br from-white/90 to-white/80 rounded-2xl sm:rounded-3xl"></div>
                              </div>
                              
                              {/* Floating Particles */}
                              <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
                                {[...Array(3)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="absolute w-1 h-1 bg-white/30 rounded-full"
                                    style={{
                                      left: `${20 + i * 30}%`,
                                      top: `${20 + (i % 2) * 60}%`,
                                    }}
                                    animate={{
                                      y: [-5, 5, -5],
                                      opacity: [0.3, 0.8, 0.3],
                                    }}
                                    transition={{
                                      duration: 2 + i * 0.5,
                                      repeat: Infinity,
                                      delay: i * 0.3,
                                    }}
                                  />
                                ))}
                              </div>
                              
                              {/* Header */}
                              <div className="relative p-4 sm:p-6 pb-3 sm:pb-4">
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                  <motion.div 
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${config.color} rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-lg sm:text-2xl shadow-lg`}
                                  >
                                    {config.icon}
                                  </motion.div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-lg truncate">{config.name}</h3>
                                    <p className="text-xs sm:text-sm text-slate-600 truncate">{config.description}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Response Content */}
                              <div className="relative flex-1 px-6 pb-6 space-y-4 overflow-hidden">
                                {response.success ? (
                                  <>
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm flex-1 overflow-hidden">
                                      <div 
                                        ref={(el) => {
                                          if (el && aiName) {
                                            // Use setTimeout to ensure DOM is ready
                                            setTimeout(() => {
                                              if (el.scrollHeight > el.clientHeight) {
                                                setTruncatedElements(prev => new Set(prev).add(aiName));
                                              }
                                            }, 100);
                                          }
                                        }}
                                        className="text-slate-800 text-sm leading-relaxed break-words whitespace-pre-wrap max-w-full overflow-hidden [&_*]:max-w-full [&_*]:break-words [&_a]:text-blue-600 hover:[&_a]:text-blue-700 [&_strong]:text-slate-900 [&_em]:text-slate-700 [&_li]:text-slate-800 [&_p]:text-slate-800 [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:w-full [&_pre]:whitespace-pre-wrap [&_pre]:bg-slate-100 [&_pre]:text-slate-800 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-3 [&_code]:bg-slate-100 [&_code]:text-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono" 
                                        style={{
                                          maxHeight: '144px', // 6 lines * 24px line height
                                          overflow: 'hidden',
                                          position: 'relative'
                                        }}
                                      >
                                        {renderMarkdown((response as any).response)}
                                        {shouldShowFullResponseButton(response, aiName) && (
                                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>
                                        )}
                                      </div>
                                      {shouldShowFullResponseButton(response, aiName) && (
                                        <>
                                          <div className="mt-3 text-xs text-slate-500 text-center">
                                            Response truncated for display
                                          </div>
                                          <button
                                            onClick={() => openResponseModal(aiName, response)}
                                            className={`mt-4 w-full py-3 px-4 bg-gradient-to-r ${config.color} text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 shadow-md`}
                                          >
                                            Click to read full response
                                          </button>
                                        </>
                                      )}
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
                          <p className="text-xl font-semibold">
                            {streamingMode ? 'Processing with AI Services...' : 'Processing with AI Services (Non-Streaming)...'}
                          </p>
                          <p className="text-sm opacity-80">
                            {streamingMode ? 'This may take a few seconds' : 'This may take up to 2 minutes - all AI services are being called simultaneously'}
                          </p>
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

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white">Conversation History</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => loadHistory(Math.max(1, historyPage - 1))}
                    className="px-3 py-1 text-xs rounded-full bg-white/10 text-white hover:bg-white/20"
                    disabled={isHistoryLoading || historyPage <= 1}
                  >Prev</button>
                  <span className="text-slate-300 text-xs">Page {historyPage}</span>
                  <button
                    onClick={() => loadHistory(historyPage + 1)}
                    className="px-3 py-1 text-xs rounded-full bg-white/10 text-white hover:bg-white/20"
                    disabled={isHistoryLoading || historyItems.length < 20}
                  >Next</button>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="px-3 py-1 text-xs rounded-full bg-white/10 text-white hover:bg-white/20"
                  >Close</button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-3">
                {isHistoryLoading && <div className="text-slate-300 text-sm">Loading...</div>}
                {!isHistoryLoading && historyItems.length === 0 && (
                  <div className="text-slate-400 text-sm">No conversations yet</div>
                )}
                {!isHistoryLoading && historyItems.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="text-white text-sm font-semibold truncate">{item.prompt}</div>
                      <div className="text-slate-400 text-xs">{new Date(item.created_at || item.timestamp).toLocaleString()}</div>
                    </div>
                    {item.responses && (
                      <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {Object.entries(item.responses || {}).map(([k, v]: any) => (
                          <div key={k} className="text-xs text-slate-300 truncate bg-white/5 rounded p-2">{k}: {(v as any)?.success ? (v as any)?.response?.slice(0, 60) + '…' : (v as any)?.error?.slice(0,60) + '…'}</div>
                        ))}
                      </div>
                    )}
                    {item.response && (
                      <div className="mt-2 text-slate-300 text-sm truncate">{item.response}</div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-full sm:max-w-5xl w-full max-h-[90vh] overflow-y-auto overscroll-contain border border-white/20"
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
              <div className="p-8 max-h-[60vh] overflow-y-auto overscroll-contain">
                {selectedResponse && selectedResponse.response.success ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                      <h3 className="font-semibold text-white text-xl mb-4">Response:</h3>
                      <div className="text-slate-200 leading-relaxed text-lg break-words whitespace-pre-wrap max-w-full overflow-x-auto [&_*]:max-w-full [&_*]:break-words [&_*]:text-slate-200 [&_a]:text-sky-300 hover:[&_a]:text-sky-200 [&_img]:h-auto [&_table]:block [&_table]:w-full [&_pre]:bg-slate-800 [&_pre]:text-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4 [&_code]:bg-slate-800 [&_code]:text-slate-100 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono">
                        {renderMarkdown((selectedResponse.response as any).response)}
                      </div>
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
