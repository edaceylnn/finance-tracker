import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, fetchMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      if (!savedToken) {
        return;
      }
      setAuthToken(savedToken);
      try {
        const me = await fetchMe();
        const userData = { id: me.id, name: me.name, email: me.email };
        setToken(savedToken);
        setUser(userData);
        await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
      } catch {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('auth_user');
        setAuthToken(null);
        setToken(null);
        setUser(null);
      }
    } catch {
      // AsyncStorage error
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (tokenValue, userData) => {
    await AsyncStorage.setItem('auth_token', tokenValue);
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    setAuthToken(tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
