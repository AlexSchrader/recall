import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [prefs, setPrefs] = useState(undefined); // undefined = loading

  useEffect(() => {
    api.get('/me')
      .then(u => {
        setUser(u);
        api.get('/preferences').then(setPrefs).catch(() => setPrefs({}));
      })
      .catch(() => { setUser(null); setPrefs(null); });
    const onExpired = () => { setUser(null); setPrefs(null); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = async (identifier, passphrase) => {
    const u = await api.post('/auth/login', { identifier, passphrase });
    setUser(u);
    return u;
  };

  const register = async (displayName, email, passphrase) => {
    const u = await api.post('/auth/register', { displayName, email, passphrase });
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
    <AuthContext.Provider value={{ user, setUser, prefs, setPrefs, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
