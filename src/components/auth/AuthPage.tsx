import React, { useEffect } from 'react';
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
          Simple Login Form (Supabase Auth temporarily disabled):
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input 
            type="email" 
            placeholder="Email" 
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              marginBottom: '0.5rem', 
              backgroundColor: '#374151', 
              color: 'white', 
              border: '1px solid #6b7280',
              borderRadius: '0.25rem'
            }} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              marginBottom: '1rem', 
              backgroundColor: '#374151', 
              color: 'white', 
              border: '1px solid #6b7280',
              borderRadius: '0.25rem'
            }} 
          />
          <button 
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              backgroundColor: '#8b5cf6', 
              color: 'white', 
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

