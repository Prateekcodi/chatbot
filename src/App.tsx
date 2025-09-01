import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import ChatBot from './components/ChatBot';
import MultiAI from './components/MultiAI';
import AuthPage from './components/auth/AuthPage';
import { AuthProvider, useAuth } from './lib/auth';
import { supabase } from './lib/supabaseClient';
import './index.css';

function Protected({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function Nav() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  // Hide nav on auth page
  if (location.pathname === '/auth') return null;
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95vw] sm:w-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg overflow-x-auto no-scrollbar">
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
  return <button onClick={handle} className="ml-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20">Logout</button>;
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
      if (event === 'SIGNED_OUT') {
        navigate('/auth', { replace: true });
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [location.pathname, navigate]);
  return null;
}

export default App;
