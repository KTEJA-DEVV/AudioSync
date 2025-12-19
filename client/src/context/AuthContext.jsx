import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'crowdbeat_token';
const USER_KEY = 'crowdbeat_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Get stored token
  const getToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  // Save auth data
  const saveAuthData = useCallback((userData, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setError(null);
  }, []);

  // Clear auth data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Register
  const register = useCallback(async (username, email, password, userType = 'casual') => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        userType,
      });
      const { user: userData, token } = response.data.data;
      saveAuthData(userData, token);
      return userData;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [saveAuthData]);

  // Login
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token } = response.data.data;
      saveAuthData(userData, token);
      return userData;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [saveAuthData]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout API errors
    } finally {
      clearAuthData();
    }
  }, [clearAuthData]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      // Token is invalid or expired
      clearAuthData();
      return null;
    } finally {
      setLoading(false);
    }
  }, [getToken, clearAuthData]);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      const updatedUser = { ...user, ...response.data.data.user };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to update profile';
      throw new Error(message);
    }
  }, [user]);

  // Update preferences
  const updatePreferences = useCallback(async (preferences) => {
    try {
      const response = await api.put('/users/preferences', preferences);
      const updatedUser = { ...user, preferences: response.data.data.preferences };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to update preferences';
      throw new Error(message);
    }
  }, [user]);

  // Forgot password
  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to send reset email';
      throw new Error(message);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to reset password';
      throw new Error(message);
    }
  }, []);

  // Verify email
  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      if (user) {
        const updatedUser = { ...user, emailVerified: true };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to verify email';
      throw new Error(message);
    }
  }, [user]);

  // Check auth on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    updatePreferences,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
