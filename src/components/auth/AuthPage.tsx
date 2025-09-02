import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthPage mounted, session:', !!session);
    if (session) {
      navigate('/multiai', { replace: true });
    }
  }, [session, navigate]);
  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0A0A0F] flex items-center justify-center p-4 z-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
          <h1 className="text-2xl font-black text-white mb-6 text-center">Sign in or create an account</h1>
          <div className="text-white text-center mb-4">AuthPage is rendering!</div>
          <div className="bg-white/5 rounded-2xl p-4 [--input-bg:theme(colors.slate.800/0.7)] [--input-text:theme(colors.white)] [--input-border:theme(colors.white/0.2)] [--placeholder:theme(colors.slate.400)]">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
              redirectTo="https://chatbotcode.netlify.app/#/auth"
              localization={{
                variables: {
                  sign_in: { email_label: 'Email', password_label: 'Password' },
                }
              }}
              // Force visible text colors via style override
              theme="dark"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

