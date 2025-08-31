import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';

const AuthPage: React.FC = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(error);
      } else {
        const { error } = await signUpWithEmail(email, password, { full_name: fullName });
        if (error) setError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
          <h1 className="text-2xl font-black text-white mb-6 text-center">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-slate-300 text-sm mb-1">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-700/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50" placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="block text-slate-300 text-sm mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-700/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-700/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50" placeholder="••••••••" required />
            </div>
            {error && <div className="text-rose-400 text-sm">{error}</div>}
            <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-violet-500 to-rose-500 text-white font-semibold shadow-lg hover:opacity-95 disabled:opacity-60">
              {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-slate-300 hover:text-white text-sm">
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

