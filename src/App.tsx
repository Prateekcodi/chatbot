import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import ChatBot from './components/ChatBot';
import MultiAI from './components/MultiAI';
import AuthPage from './components/auth/AuthPage';
import { AuthProvider, useAuth } from './lib/auth';
import { supabase } from './lib/supabaseClient';
import './index.css';

function LoadingSplash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0F] text-white z-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-slate-500 border-t-emerald-400 rounded-full animate-spin"></div>
        <div className="text-slate-300 text-sm">Loading…</div>
      </div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  
  // Debug logging for mobile issues
  useEffect(() => {
    console.log('Protected component - initialized:', initialized, 'session:', !!session);
  }, [initialized, session]);
  
  if (!initialized) return <LoadingSplash />;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function Nav() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll for navbar styling - must be called before conditional return
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Hide nav on auth page
  if (location.pathname === '/auth' || window.location.hash === '#/auth') {
    return null;
  }
  
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#201943] backdrop-blur-2xl border-b border-purple-500/30' : 'bg-[#201943] backdrop-blur-xl'
    }`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-white font-semibold text-lg">Multi-AI Studio</span>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            <Link 
              to="/multiai" 
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                location.pathname === '/multiai' 
                  ? 'bg-gradient-to-r from-purple-600/60 to-indigo-600/60 text-white border border-purple-400/50 shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-[#201943]/50 border border-transparent'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>🤖</span>
                <span>Multi-AI</span>
              </span>
            </Link>
            <Link 
              to="/chatbot" 
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                location.pathname === '/chatbot' 
                  ? 'bg-gradient-to-r from-purple-600/60 to-indigo-600/60 text-white border border-purple-400/50 shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-[#201943]/50 border border-transparent'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>💬</span>
                <span>Chatbot</span>
              </span>
            </Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {session ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-slate-300">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Online</span>
                </div>
                <LogoutButton onLogout={signOut} />
              </div>
            ) : (
              <Link 
                to="/auth" 
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/30 to-violet-500/30 text-white hover:from-emerald-500/40 hover:to-violet-500/40 border border-emerald-400/50 transition-all duration-300 shadow-lg"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xs">AI</span>
              </div>
              <span className="text-white font-semibold text-base">AI Studio</span>
            </div>
            
            {/* Mobile Menu Button */}
            <button 
              aria-label="Toggle menu" 
              onClick={() => setOpen(!open)} 
              className="p-2 rounded-xl bg-[#201943]/50 hover:bg-[#2a1f5c]/50 text-white transition-all duration-300 border border-purple-500/30"
            >
              <svg 
                className={`w-6 h-6 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                {open ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
          
          {/* Mobile Menu Dropdown - Fixed positioning to prevent overlap */}
          <div className={`absolute top-full left-0 right-0 bg-gradient-to-b from-[#201943]/98 via-[#2a1f5c]/98 to-[#201943]/98 backdrop-blur-2xl border-b border-purple-500/30 shadow-2xl transition-all duration-300 ${
            open ? 'max-h-96 opacity-100 visible' : 'max-h-0 opacity-0 invisible'
          }`}>
            <div className="px-4 py-4 space-y-2">
              <Link 
                onClick={() => setOpen(false)} 
                to="/multiai" 
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  location.pathname === '/multiai' 
                    ? 'bg-gradient-to-r from-purple-600/60 to-indigo-600/60 text-white border border-purple-400/50 shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-[#201943]/50 border border-transparent'
                }`}
              >
                <span className="text-lg">🤖</span>
                <span>Multi-AI Tool</span>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                to="/chatbot" 
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  location.pathname === '/chatbot' 
                    ? 'bg-gradient-to-r from-purple-600/60 to-indigo-600/60 text-white border border-purple-400/50 shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-[#201943]/50 border border-transparent'
                }`}
              >
                <span className="text-lg">💬</span>
                <span>Chatbot</span>
              </Link>
              
              {session ? (
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2 px-4 py-2 text-slate-300 text-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span>Online</span>
                  </div>
                  <button 
                    onClick={async () => { 
                      setOpen(false); 
                      console.log('Mobile logout button clicked - starting logout process...');
                      
                      try {
                        const logoutPromise = signOut();
                        const timeoutPromise = new Promise((_, reject) => 
                          setTimeout(() => reject(new Error('Mobile logout timeout')), 10000)
                        );
                        
                        await Promise.race([logoutPromise, timeoutPromise]);
                        console.log('Mobile logout successful, redirecting...');
                      } catch (error) {
                        console.error('Mobile logout error:', error);
                        try {
                          if (typeof window !== 'undefined') {
                            window.localStorage.clear();
                            window.sessionStorage.clear();
                          }
                        } catch (clearError) {
                          console.warn('Error clearing storage:', clearError);
                        }
                      } finally {
                        setTimeout(() => {
                          console.log('Mobile logout - forcing redirect to auth page');
                          window.location.href = '#/auth';
                        }, 100);
                      }
                    }} 
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-rose-500/20 to-pink-500/20 hover:from-rose-500/30 hover:to-pink-500/30 border border-rose-400/30 transition-all duration-300"
                  >
                    <span className="text-lg">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link 
                  onClick={() => setOpen(false)} 
                  to="/auth" 
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500/20 to-violet-500/20 hover:from-emerald-500/30 hover:to-violet-500/30 border border-emerald-400/30 transition-all duration-300"
                >
                  <span className="text-lg">🔑</span>
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoutButton({ onLogout }: { onLogout: () => Promise<void> }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handle = async () => {
    if (isLoggingOut) return; // Prevent double-click
    
    setIsLoggingOut(true);
    console.log('Desktop logout button clicked - starting logout process...');
    
    try {
      // Add timeout to prevent hanging
      const logoutPromise = onLogout();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 10000)
      );
      
      await Promise.race([logoutPromise, timeoutPromise]);
      console.log('Desktop logout successful, redirecting...');
    } catch (error) {
      console.error('Desktop logout error:', error);
      // Force clear any remaining auth state
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.clear();
          window.sessionStorage.clear();
        }
      } catch (clearError) {
        console.warn('Error clearing storage:', clearError);
      }
    } finally {
      // Always redirect, even if logout failed
      setTimeout(() => {
        console.log('Desktop logout - forcing redirect to auth page');
        window.location.href = '#/auth';
      }, 100);
    }
  };
  
  return (
    <button 
      id="logout-btn" 
      onClick={handle} 
      disabled={isLoggingOut}
      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500/30 to-pink-500/30 text-white hover:from-rose-500/40 hover:to-pink-500/40 border border-rose-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-lg"
    >
      <span className="text-sm">🚪</span>
      <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
    </button>
  );
}

function AppContent() {
  const location = useLocation();
  
  console.log('AppContent - current pathname:', location.pathname);
  console.log('AppContent - current hash:', window.location.hash);
  
  // If on auth page, render AuthPage outside of main container
  if (location.pathname === '/auth') {
    return <AuthPage />;
  }
  
  return (
    <div className="App w-screen min-h-screen overflow-hidden bg-[#0A0A0F]">
      <Nav />
      <div className="w-full min-h-full pt-16 overflow-y-auto overflow-x-hidden smooth-scroll">
        <ProfileUpsertOnAuth />
        <div style={{ color: 'white', padding: '1rem', backgroundColor: 'red' }}>
          Debug: Current path = {location.pathname}, Hash = {window.location.hash}
        </div>
        <Routes>
          <Route path="/chatbot" element={<Protected><ChatBot /></Protected>} />
          <Route path="/multiai" element={<Protected><MultiAI /></Protected>} />
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
}

function ProfileUpsertOnAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email || null,
          full_name: (session.user.user_metadata as any)?.full_name || null,
        }, { onConflict: 'id' });
        if (location.pathname === '/auth') {
          navigate('/multiai', { replace: true });
        }
      }
      // Do not auto-redirect on SIGNED_OUT to avoid reload issues on mobile/pc
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [location.pathname, navigate]);
  return null;
}

export default App;
