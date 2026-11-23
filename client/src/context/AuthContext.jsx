import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/auth/me');
      setUser(response.data?.data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async ({ email, password, totpCode }) => {
    const payload = { email, password };
    if (totpCode && String(totpCode).trim()) {
      payload.totpCode = String(totpCode).trim();
    }
    const response = await axiosClient.post('/auth/login', payload);
    const loggedInUser = response.data?.data?.user || null;
    setUser(loggedInUser);
    return response.data;
  };

  const register = async ({ fullName, email, password }) => {
    const response = await axiosClient.post('/auth/register', {
      fullName,
      email,
      password
    });
    return response.data;
  };

  const setup2fa = async () => {
    const response = await axiosClient.post('/auth/2fa/setup');
    return response.data?.data;
  };

  const verify2fa = async (token) => {
    const response = await axiosClient.post('/auth/2fa/verify', {
      token: String(token || '').trim()
    });
    setUser((prev) => (prev ? { ...prev, is2faEnabled: true } : prev));
    return response.data;
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Bỏ qua lỗi mạng khi đăng xuất để luôn dọn state client
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        refreshUser: fetchCurrentUser,
        login,
        register,
        setup2fa,
        verify2fa,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return ctx;
}
