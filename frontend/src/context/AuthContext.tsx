import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { authService } from '@/services/api';
import { getAuthToken, setAuthToken } from '@/services/apiClient';
import type { User, LoginCredentials, SignupCredentials } from '@/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  signup: (credentials: SignupCredentials) => Promise<User>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication on app launch
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await authService.me();
        if (isMounted) {
          setUser(currentUser);
          setTokenState(storedToken);
        }
      } catch (err) {
        // Token was invalid, expired, or backend was reset
        console.warn('Session verification failed, logging out:', err);
        setAuthToken(null);
        if (isMounted) {
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    const res = await authService.login(credentials);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials): Promise<User> => {
    const res = await authService.signup(credentials);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
