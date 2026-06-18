import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole, Usuario } from '@/types/database.types';

export type AuthError =
  | { type: 'profile_error'; message: string }
  | { type: 'user_not_registered'; email?: string | null }
  | null;

export interface AuthUser {
  id: string;
  email?: string;
  full_name: string;
  role: UserRole | null;
}

export interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  profile: Usuario | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authChecked: boolean;
  authError: AuthError;
  appPublicSettings: null;
  logout: () => Promise<void>;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkAppState: () => void;
  setAuthError: (error: AuthError) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<AuthError>(null);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId: string | undefined, userEmail?: string | null) => {
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
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setSession(currentSession);
    await loadProfile(currentSession?.user?.id, currentSession?.user?.email);
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

    void checkUserAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      void loadProfile(currentSession?.user?.id, currentSession?.user?.email);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
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

  const role = profile?.papel ?? null;

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        full_name: profile?.nome_completo || session.user.email || '',
        role,
      }
    : null;

  const value: AuthContextValue = {
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

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
