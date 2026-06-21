import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    api.get('/me').then(setUser).catch(() => setUser(null));
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = async (displayName, passphrase) => {
    const u = await api.post('/auth/login', { displayName, passphrase });
    setUser(u);
    return u;
  };

  const register = async (displayName, passphrase, email) => {
    const u = await api.post('/auth/register', { displayName, passphrase, email: email || undefined });
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.delete('/auth/session');
    setUser(null);
  };

  const refreshUser = async () => {
    const u = await api.get('/me');
    setUser(u);
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
