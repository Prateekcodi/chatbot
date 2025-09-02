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
  // Hide nav on auth page
  if (location.pathname === '/auth') return null;
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95vw] sm:w-auto">
      {/* Desktop nav */}
      <div className="hidden sm:block bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg">
        <div className="flex items-center space-x-2 whitespace-nowrap">
          <Link to="/multiai" className="px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-purple-100 hover:text-white hover:bg-white/10">Multi-AI Tool</Link>
          <Link to="/chatbot" className="px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-purple-100 hover:text-white hover:bg-white/10">Chatbot</Link>
          {session ? (
            <LogoutButton onLogout={signOut} />
          ) : (
            <Link to="/auth" className="ml-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20">Login</Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/20 shadow-lg">
          <div className="font-semibold text-white">Menu</div>
          <button aria-label="Open menu" onClick={() => setOpen(o => !o)} className="p-2 rounded-lg bg-white/10 text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
        {open && (
          <div className="mt-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg space-y-2">
            <Link onClick={() => setOpen(false)} to="/multiai" className="block w-full text-left px-4 py-3 rounded-xl font-medium text-white bg-white/5 hover:bg-white/15">Multi-AI Tool</Link>
            <Link onClick={() => setOpen(false)} to="/chatbot" className="block w-full text-left px-4 py-3 rounded-xl font-medium text-white bg-white/5 hover:bg-white/15">Chatbot</Link>
            {session ? (
              <button onClick={() => { setOpen(false); signOut().finally(() => window.location.replace('#/auth')); }} className="block w-full text-left px-4 py-3 rounded-xl font-medium text-white bg-rose-500/80 hover:bg-rose-500">Logout</button>
            ) : (
              <Link onClick={() => setOpen(false)} to="/auth" className="block w-full text-left px-4 py-3 rounded-xl font-medium text-white bg-white/5 hover:bg-white/15">Login</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LogoutButton({ onLogout }: { onLogout: () => Promise<void> }) {
  const handle = () => {
    // Fire sign-out, then force redirect regardless of result
    onLogout().finally(() => {
      // Use hard redirect to fully reset app state and hash route
      window.location.replace('#/auth');
    });
  };
  return <button id="logout-btn" onClick={handle} className="ml-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20">Logout</button>;
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="App w-screen h-screen overflow-auto-y">
          <Nav />
          <div className="w-full h-full">
            <ProfileUpsertOnAuth />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/chatbot" element={<Protected><ChatBot /></Protected>} />
              <Route path="/multiai" element={<Protected><MultiAI /></Protected>} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </div>
        </div>
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
