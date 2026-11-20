import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skeletonMode, setSkeletonMode] = useState(false);

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/auth/me');
      setUser(response.data?.data || null);
      setSkeletonMode(false);
    } catch (err) {
      if (err.response?.status === 501) {
        setSkeletonMode(true);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Bỏ qua nếu backend Auth đang ở chế độ skeleton 501
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
        skeletonMode,
        refreshUser: fetchCurrentUser,
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
