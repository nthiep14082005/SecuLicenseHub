import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import {
  clearAdminSecretSegment,
  getOrCreateAdminSecretSegment,
  resetAdminSecretSegmentForEmail
} from '../utils/adminRoute.util';

export const SESSION_FLAG_KEY = 'slh_session_active';
export const REMINDER_UNTIL_KEY = 'slh_2fa_reminder_until';
export const CHALLENGE_STORAGE_KEY = 'slh_2fa_challenge';
const REMINDER_DURATION_MS = 15 * 60 * 1000;

const AuthContext = createContext(null);

function syncReminderWindowForUser(userObj) {
  try {
    if (!userObj || userObj.hasAny2FA) {
      sessionStorage.removeItem(REMINDER_UNTIL_KEY);
      return;
    }
    if (!sessionStorage.getItem(REMINDER_UNTIL_KEY)) {
      sessionStorage.setItem(REMINDER_UNTIL_KEY, String(Date.now() + REMINDER_DURATION_MS));
    }
  } catch {
    // Bỏ qua lỗi storage
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    let hasSessionFlag = false;
    try {
      hasSessionFlag = sessionStorage.getItem(SESSION_FLAG_KEY) === '1';
    } catch {
      hasSessionFlag = false;
    }

    if (!hasSessionFlag) {
      clearAdminSecretSegment();
      try {
        sessionStorage.removeItem(REMINDER_UNTIL_KEY);
      } catch {
        // Bỏ qua lỗi storage
      }
      try {
        await axiosClient.post('/auth/logout');
      } catch {
        // Bỏ qua lỗi mạng nếu server chưa sẵn sàng
      } finally {
        setUser(null);
        setLoading(false);
      }
      return;
    }

    try {
      const response = await axiosClient.get('/auth/me');
      const fetchedUser = response.data?.data?.user || null;
      if (!fetchedUser) {
        sessionStorage.removeItem(SESSION_FLAG_KEY);
        sessionStorage.removeItem(REMINDER_UNTIL_KEY);
        clearAdminSecretSegment();
      } else {
        if (fetchedUser.role === 'ADMIN') {
          getOrCreateAdminSecretSegment(fetchedUser.email);
        } else {
          clearAdminSecretSegment();
        }
        syncReminderWindowForUser(fetchedUser);
      }
      setUser(fetchedUser);
    } catch {
      try {
        sessionStorage.removeItem(SESSION_FLAG_KEY);
        sessionStorage.removeItem(REMINDER_UNTIL_KEY);
      } catch {
        // Bỏ qua lỗi storage
      }
      clearAdminSecretSegment();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const applyAuthenticatedSession = (loggedInUser) => {
    if (!loggedInUser) return;
    try {
      sessionStorage.setItem(SESSION_FLAG_KEY, '1');
      sessionStorage.removeItem(CHALLENGE_STORAGE_KEY);
    } catch {
      // Bỏ qua lỗi storage
    }
    if (loggedInUser.role === 'ADMIN') {
      getOrCreateAdminSecretSegment(loggedInUser.email);
    } else {
      clearAdminSecretSegment();
    }
    if (loggedInUser.hasAny2FA) {
      try {
        sessionStorage.removeItem(REMINDER_UNTIL_KEY);
      } catch {
        // ignore
      }
    } else {
      try {
        sessionStorage.setItem(REMINDER_UNTIL_KEY, String(Date.now() + REMINDER_DURATION_MS));
      } catch {
        // ignore
      }
    }
    setUser(loggedInUser);
  };

  const login = async ({ email, password }) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    const data = response.data?.data;

    // Nếu tài khoản đã bật ít nhất 1 cách 2FA -> chưa cấp phiên, chuyển sang /verify-2fa
    if (data?.requires2fa) {
      return response.data;
    }

    applyAuthenticatedSession(data?.user || null);
    return response.data;
  };

  const verifyLogin2fa = async ({ challengeToken, code }) => {
    const response = await axiosClient.post('/auth/login/verify-2fa', {
      challengeToken,
      code: String(code || '').trim()
    });
    applyAuthenticatedSession(response.data?.data?.user || null);
    return response.data;
  };

  const resendLogin2fa = async (challengeToken) => {
    const response = await axiosClient.post('/auth/login/resend-2fa', { challengeToken });
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
    try {
      sessionStorage.removeItem(REMINDER_UNTIL_KEY);
    } catch {
      // ignore
    }
    const methods = response.data?.data?.twoFactorMethods;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            is2faEnabled: true,
            hasAny2FA: true,
            twoFactorMethods: methods || { ...(prev.twoFactorMethods || {}), totp: true }
          }
        : prev
    );
    return response.data;
  };

  const updateProfile = async (fullName) => {
    const response = await axiosClient.patch('/auth/profile', { fullName });
    const updatedUser = response.data?.data?.user || null;
    if (updatedUser) {
      setUser(updatedUser);
    }
    return response.data;
  };

  const updateEmail = async (email) => {
    const response = await axiosClient.patch('/auth/email', { email });
    const updatedUser = response.data?.data?.user || null;
    let newAdminBasePath = null;
    if (updatedUser) {
      if (updatedUser.role === 'ADMIN') {
        newAdminBasePath = resetAdminSecretSegmentForEmail(updatedUser.email);
      }
      setUser(updatedUser);
    }
    return { response: response.data, user: updatedUser, newAdminBasePath };
  };

  const sendEmail2faOtp = async () => {
    const response = await axiosClient.post('/auth/2fa/email/send');
    return response.data;
  };

  const verifyEmail2faOtp = async (token) => {
    const response = await axiosClient.post('/auth/2fa/email/verify', {
      token: String(token || '').trim()
    });
    try {
      sessionStorage.removeItem(REMINDER_UNTIL_KEY);
    } catch {
      // ignore
    }
    const methods = response.data?.data?.twoFactorMethods;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            is2faEnabled: true,
            hasAny2FA: true,
            twoFactorMethods: methods || { ...(prev.twoFactorMethods || {}), gmail: true }
          }
        : prev
    );
    return response.data;
  };

  const sendWhatsapp2faOtp = async (phone) => {
    const response = await axiosClient.post('/auth/2fa/whatsapp/send', { phone });
    return response.data;
  };

  const verifyWhatsapp2faOtp = async (token) => {
    const response = await axiosClient.post('/auth/2fa/whatsapp/verify', {
      token: String(token || '').trim()
    });
    try {
      sessionStorage.removeItem(REMINDER_UNTIL_KEY);
    } catch {
      // ignore
    }
    const methods = response.data?.data?.twoFactorMethods;
    const verifiedPhone = response.data?.data?.phone;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            is2faEnabled: true,
            hasAny2FA: true,
            whatsappPhone: verifiedPhone || prev.whatsappPhone,
            twoFactorMethods: methods || { ...(prev.twoFactorMethods || {}), whatsapp: true }
          }
        : prev
    );
    return response.data;
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Luôn dọn phiên ở client kể cả khi request logout gặp lỗi mạng
    } finally {
      try {
        sessionStorage.removeItem(SESSION_FLAG_KEY);
        sessionStorage.removeItem(REMINDER_UNTIL_KEY);
        sessionStorage.removeItem(CHALLENGE_STORAGE_KEY);
      } catch {
        // Bỏ qua lỗi storage
      }
      clearAdminSecretSegment();
      setUser(null);
      navigate('/login', { replace: true });
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
        verifyLogin2fa,
        resendLogin2fa,
        register,
        setup2fa,
        verify2fa,
        updateProfile,
        updateEmail,
        sendEmail2faOtp,
        verifyEmail2faOtp,
        sendWhatsapp2faOtp,
        verifyWhatsapp2faOtp,
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
