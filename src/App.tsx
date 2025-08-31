import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import ChatBot from './components/ChatBot';
import MultiAI from './components/MultiAI';
import AuthPage from './components/auth/AuthPage';
import { AuthProvider, useAuth } from './lib/auth';
import './index.css';

function Protected({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function Nav() {
  const { session, signOut } = useAuth();
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg">
        <div className="flex space-x-2 items-center">
          <Link to="/multiai" className="px-4 py-2 rounded-xl font-medium transition-all duration-200 text-purple-100 hover:text-white hover:bg-white/10">Multi-AI Tool</Link>
          <Link to="/chatbot" className="px-4 py-2 rounded-xl font-medium transition-all duration-200 text-purple-100 hover:text-white hover:bg-white/10">Chatbot</Link>
          {session ? (
            <button onClick={signOut} className="ml-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20">Logout</button>
          ) : (
            <Link to="/auth" className="ml-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20">Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="App w-screen h-screen overflow-auto-y">
          <Nav />
          <div className="w-full h-full">
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/chatbot" element={<Protected><ChatBot /></Protected>} />
              <Route path="/multiai" element={<Protected><MultiAI /></Protected>} />
              <Route path="*" element={<Navigate to="/multiai" replace />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
