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
    if (session) {
      navigate('/multiai', { replace: true });
    }
  }, [session, navigate]);
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#0A0A0F', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 9999,
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      <div style={{ 
        backgroundColor: '#1e293b', 
        padding: '2rem', 
        borderRadius: '1rem',
        color: 'white',
        textAlign: 'center',
        minWidth: '400px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1.5rem', 
          color: 'white',
          fontWeight: 'bold'
        }}>
          Sign in or create an account
        </h1>
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '0.75rem', 
          padding: '1rem'
        }}>
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
  );
};

export default AuthPage;

