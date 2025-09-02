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
            <div className="text-white text-center mb-4">Supabase Auth Component:</div>
            <Auth
              supabaseClient={supabase}
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#8b5cf6',
                      brandAccent: '#a78bfa',
                      brandButtonText: 'white',
                      defaultButtonBackground: '#374151',
                      defaultButtonBackgroundHover: '#4b5563',
                      defaultButtonBorder: '#6b7280',
                      defaultButtonText: 'white',
                      dividerBackground: '#374151',
                      inputBackground: '#374151',
                      inputBorder: '#6b7280',
                      inputBorderHover: '#9ca3af',
                      inputBorderFocus: '#8b5cf6',
                      inputText: 'white',
                      inputLabelText: '#d1d5db',
                      inputPlaceholder: '#9ca3af',
                      messageText: '#d1d5db',
                      messageTextDanger: '#fca5a5',
                      anchorTextColor: '#a78bfa',
                      anchorTextHoverColor: '#c4b5fd',
                    }
                  }
                }
              }}
              providers={[]}
              redirectTo="https://chatbotcode.netlify.app/#/auth"
              localization={{
                variables: {
                  sign_in: { email_label: 'Email', password_label: 'Password' },
                }
              }}
              theme="dark"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

