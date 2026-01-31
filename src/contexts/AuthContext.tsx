import { createContext, useContext, useEffect, useReducer, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Profile, PlayerStats, AuthState } from '@/types/multiplayer';

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SESSION'; session: Session | null; user: User | null }
  | { type: 'SET_PROFILE'; profile: Profile | null; stats: PlayerStats | null }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOGOUT' };

// Initial state
const initialState: AuthState = {
  user: null,
  stats: null,
  session: null,
  loading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_SESSION':
      return {
        ...state,
        session: action.session ? {
          accessToken: action.session.access_token,
          refreshToken: action.session.refresh_token,
          expiresAt: action.session.expires_at ?? 0,
        } : null,
        loading: false,
      };
    case 'SET_PROFILE':
      return {
        ...state,
        user: action.profile,
        stats: action.stats,
        loading: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

// Context type
interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { username?: string; display_name?: string }) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isConfigured = isSupabaseConfigured();

  // Fetch user profile and stats
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;

    try {
      const [profileResult, statsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('player_stats').select('*').eq('id', userId).single(),
      ]);

      if (profileResult.error) throw profileResult.error;

      dispatch({
        type: 'SET_PROFILE',
        profile: profileResult.data,
        stats: statsResult.data ?? null,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load profile' });
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADING', loading: false });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null });
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null });

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'LOGOUT' });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') as unknown as AuthError };

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }

    return { error };
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') as unknown as AuthError };

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }

    return { error };
  }, []);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase not configured') as unknown as AuthError };

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }

    return { error };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: { username?: string; display_name?: string }) => {
    if (!supabase || !state.user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates as Record<string, unknown>)
      .eq('id', state.user.id);

    if (!error) {
      await fetchProfile(state.user.id);
    }

    return { error };
  }, [state.user, fetchProfile]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await fetchProfile(state.user.id);
    }
  }, [state.user, fetchProfile]);

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
    isConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
