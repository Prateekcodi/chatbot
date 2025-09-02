import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpWithEmail: (email: string, password: string, meta?: { full_name?: string }) => Promise<{ error?: string }>
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let canceled = false;
    let timeoutId: NodeJS.Timeout;
    
    // Add timeout to prevent infinite loading on mobile
    timeoutId = setTimeout(() => {
      if (!canceled) {
        console.log('Auth initialization timeout - setting initialized to true');
        setInitialized(true);
      }
    }, 5000); // 5 second timeout
    
    supabase.auth.getSession().then(({ data, error }) => {
      if (canceled) return;
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Session fetch error:', error);
      }
      
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setInitialized(true);
    }).catch((error) => {
      if (canceled) return;
      clearTimeout(timeoutId);
      console.error('Session fetch failed:', error);
      setInitialized(true); // Still set initialized to prevent infinite loading
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (canceled) return;
      clearTimeout(timeoutId);
      console.log('Auth state change:', event, sess?.user?.email);
      
      // Handle token refresh failures
      if (event === 'TOKEN_REFRESHED' && !sess) {
        console.warn('Token refresh failed - clearing session');
        setSession(null);
        setUser(null);
      } else {
        setSession(sess);
        setUser(sess?.user ?? null);
      }
      setInitialized(true);
    });
    
    // Add periodic session validation to detect stale sessions
    const sessionCheckInterval = setInterval(async () => {
      if (canceled) return;
      
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && currentSession.expires_at) {
          const expiresAt = new Date(currentSession.expires_at * 1000);
          const now = new Date();
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();
          
          // If session expires in less than 5 minutes, try to refresh
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            console.log('Session expiring soon, attempting refresh...');
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.warn('Session refresh failed:', error);
              // Clear stale session
              setSession(null);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.warn('Session validation failed:', error);
      }
    }, 60000); // Check every minute
    
    return () => { 
      canceled = true; 
      clearTimeout(timeoutId);
      clearInterval(sessionCheckInterval);
      sub.subscription.unsubscribe(); 
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, meta?: { full_name?: string }) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta } });
    if (!error && data.user) {
      // Ensure profile row exists
      await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: meta?.full_name || null });
    }
    return { error: error?.message };
  }, []);

  const signOut = useCallback(async () => {
    console.log('Starting signOut process...');
    
    // First, eagerly clear local auth state to update UI immediately
    setSession(null);
    setUser(null);
    
    try {
      // Try to sign out from Supabase with timeout
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout')), 5000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      console.log('Supabase signOut successful');
    } catch (error) {
      console.warn('Supabase signOut failed or timed out:', error);
      // Continue with local cleanup even if Supabase signOut fails
    }
    
    try {
      if (typeof window !== 'undefined') {
        console.log('Clearing local storage...');
        
        // Clear Supabase cached tokens in localStorage/sessionStorage
        for (const store of [window.localStorage, window.sessionStorage]) {
          const keys = Object.keys(store);
          for (const key of keys) {
            if (key.startsWith('sb-')) {
              store.removeItem(key);
            }
          }
        }
        
        // Clear any other auth-related keys
        const authKeys = ['supabase.auth.token', 'supabase.auth.refresh_token', 'sb-auth-token'];
        for (const key of authKeys) {
          storeSafeRemove(key);
        }
        
        // Also clear our own app cache if any
        storeSafeRemove('persist:root');
        
        console.log('Local storage cleared successfully');
      }
    } catch (error) {
      console.warn('Error clearing local storage:', error);
    }
    
    console.log('SignOut process completed');
  }, []);

function storeSafeRemove(key: string) {
  try { window.localStorage.removeItem(key); } catch (_) {}
  try { window.sessionStorage.removeItem(key); } catch (_) {}
}

  const value: AuthContextValue = { session, user, initialized, signInWithEmail, signUpWithEmail, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

