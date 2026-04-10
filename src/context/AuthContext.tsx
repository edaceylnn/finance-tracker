import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, fetchMe, setOnUnauthorized } from '../services/api';

export type AuthUser = { id: string; name: string; email: string };

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (tokenValue: string, userData: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const CHECK_TOKEN_TIMEOUT_MS = 10_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(signOut);
    return () => setOnUnauthorized(null);
  }, [signOut]);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('auth_token');
        if (!savedToken) return;

        setAuthToken(savedToken);

        const cachedUserStr = await AsyncStorage.getItem('auth_user');
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr) as AuthUser;
            setToken(savedToken);
            setUser(cachedUser);
          } catch {
            /* corrupted cache */
          }
        }

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error('timeout'), { isTimeout: true })), CHECK_TOKEN_TIMEOUT_MS),
        );

        try {
          const me = await Promise.race([fetchMe(), timeout]);
          const userData: AuthUser = { id: me.id, name: me.name, email: me.email };
          setToken(savedToken);
          setUser(userData);
          await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
        } catch (err: unknown) {
          const status = (err as { status?: number }).status;
          if (status === 401 || status === 403) {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('auth_user');
            setAuthToken(null);
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        /* storage read failed */
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  const signIn = async (tokenValue: string, userData: AuthUser) => {
    await AsyncStorage.setItem('auth_token', tokenValue);
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    setAuthToken(tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
