import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('cvcraft:logout', onLogout);
    return () => window.removeEventListener('cvcraft:logout', onLogout);
  }, []);

  const handleAuth = (d) => {
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  };

  const login = useCallback(async (email, password) => handleAuth(await api.post('/auth/login', { email, password })), []);
  const register = useCallback(async (form) => handleAuth(await api.post('/auth/register', form)), []);
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
