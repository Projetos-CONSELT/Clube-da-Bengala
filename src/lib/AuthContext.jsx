import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId, userEmail) => {
    if (!userId) {
      setProfile(null);
      setAuthError(null);
      return;
    }
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[auth] erro carregando perfil:', error.message);
      setAuthError({ type: 'profile_error', message: error.message });
      setProfile(null);
      return;
    }

    if (!data) {
      setProfile(null);
      setAuthError({ type: 'user_not_registered', email: userEmail });
      return;
    }

    setProfile(data);
    setAuthError(null);
  }, []);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    await loadProfile(s?.user?.id, s?.user?.email);
    if (mountedRef.current) {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    await loadProfile(session.user.id, session.user.email);
  }, [loadProfile, session]);

  useEffect(() => {
    mountedRef.current = true;

    checkUserAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s?.user?.id, s?.user?.email);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setAuthError(null);
  }, []);

  const navigateToLogin = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  const role = profile?.papel || null;

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        full_name: profile?.nome_completo || profile?.nome || session.user.email,
        role,
        ...profile,
      }
    : null;

  const value = {
    session,
    user,
    profile,
    role,
    isAuthenticated: !!session && !!profile,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authChecked,
    authError,
    appPublicSettings: null,
    logout,
    navigateToLogin,
    checkUserAuth,
    refreshProfile,
    checkAppState: () => {},
    setAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
