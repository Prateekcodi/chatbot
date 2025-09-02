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
    supabase.auth.getSession().then(({ data }) => {
      if (canceled) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setInitialized(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (canceled) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      setInitialized(true);
    });
    return () => { canceled = true; sub.subscription.unsubscribe(); };
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
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // ignore
    } finally {
      // Eagerly clear local auth state to update UI immediately
      setSession(null);
      setUser(null);
      try {
        if (typeof window !== 'undefined') {
          // Clear Supabase cached tokens in localStorage/sessionStorage
          for (const store of [window.localStorage, window.sessionStorage]) {
            const keys = Object.keys(store);
            for (const key of keys) {
              if (key.startsWith('sb-')) {
                store.removeItem(key);
              }
            }
          }
          // Also clear our own app cache if any
          storeSafeRemove('persist:root');
        }
      } catch (_) {}
    }
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

