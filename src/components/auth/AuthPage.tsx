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
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: '#0A0A0F', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 10
    }}>
      <div style={{ 
        backgroundColor: '#1e293b', 
        padding: '2rem', 
        borderRadius: '1rem',
        color: 'white',
        textAlign: 'center',
        minWidth: '300px'
      }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>
          Sign in or create an account
        </h1>
        <div style={{ marginBottom: '1rem', color: 'white' }}>
          AuthPage is rendering!
        </div>
        <div style={{ marginBottom: '1rem', color: 'white' }}>
          Supabase Auth Component:
        </div>
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
  );
};

export default AuthPage;

