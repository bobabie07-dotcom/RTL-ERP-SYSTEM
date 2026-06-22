import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('erp_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await authApi.login(email, password);
    localStorage.setItem('erp_token', data.access_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }

  function logout() {
    localStorage.removeItem('erp_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
