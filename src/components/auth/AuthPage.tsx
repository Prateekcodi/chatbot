import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabaseClient';

const AuthPage: React.FC = () => {
  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
          <h1 className="text-2xl font-black text-white mb-6 text-center">Sign in or create an account</h1>
          <div className="bg-white/5 rounded-2xl p-4">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
              redirectTo="https://chatbotcode.netlify.app/#/auth"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

