import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';

// =============================================
// CONSTANTS
// =============================================

const TOKEN_KEY = 'audiosync_token';
const USER_KEY = 'audiosync_user';
const PERMISSIONS_KEY = 'audiosync_permissions';

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = {
  user: 0,
  creator: 1,
  moderator: 2,
  admin: 3,
};

// Default permissions by role
const DEFAULT_PERMISSIONS = {
  user: {
    canCreateSession: false,
    canManageSessions: false,
    canModerate: false,
    canViewAdminDashboard: false,
    canManageUsers: false,
    canDeleteSessions: false,
    canBanUsers: false,
  },
  creator: {
    canCreateSession: true,
    canManageSessions: false,
    canModerate: false,
    canViewAdminDashboard: false,
    canManageUsers: false,
    canDeleteSessions: false,
    canBanUsers: false,
  },
  moderator: {
    canCreateSession: true,
    canManageSessions: true,
    canModerate: true,
    canViewAdminDashboard: false,
    canManageUsers: false,
    canDeleteSessions: false,
    canBanUsers: true,
  },
  admin: {
    canCreateSession: true,
    canManageSessions: true,
    canModerate: true,
    canViewAdminDashboard: true,
    canManageUsers: true,
    canDeleteSessions: true,
    canBanUsers: true,
  },
};

// =============================================
// CONTEXT CREATION
// =============================================

const AuthContext = createContext(null);

// =============================================
// AUTH PROVIDER COMPONENT
// =============================================

export const AuthProvider = ({ children }) => {
  // =============================================
  // STATE
  // =============================================
  
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  
  const [permissions, setPermissions] = useState(() => {
    try {
      const savedPermissions = localStorage.getItem(PERMISSIONS_KEY);
      return savedPermissions ? JSON.parse(savedPermissions) : null;
    } catch {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // =============================================
  // COMPUTED VALUES
  // =============================================
  
  // Check if user is authenticated
  const isAuthenticated = !!user;
  
  // Role checks
  const userRole = user?.role || 'user';
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator' || isAdmin;
  const isCreator = userRole === 'creator' || isModerator;
  const isUser = !!user;
  
  // Permission checks (use server permissions if available, fall back to defaults)
  const userPermissions = useMemo(() => {
    if (permissions) {
      return permissions;
    }
    return DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.user;
  }, [permissions, userRole]);
  
  // Session permissions
  const canCreateSession = useMemo(() => {
    return user?.permissions?.canCreateSession || 
           userPermissions.canCreateSession || 
           ['admin', 'moderator', 'creator'].includes(userRole);
  }, [user, userPermissions, userRole]);
  
  const canManageSessions = useMemo(() => {
    return user?.permissions?.canManageSessions || 
           userPermissions.canManageSessions || 
           isAdmin;
  }, [user, userPermissions, isAdmin]);
  
  const canModerate = useMemo(() => {
    return user?.permissions?.canModerate || 
           userPermissions.canModerate || 
           isModerator;
  }, [user, userPermissions, isModerator]);
  
  // Admin permissions
  const canViewAdminDashboard = useMemo(() => {
    return userPermissions.canViewAdminDashboard || isAdmin;
  }, [userPermissions, isAdmin]);
  
  const canManageUsers = useMemo(() => {
    return userPermissions.canManageUsers || isAdmin;
  }, [userPermissions, isAdmin]);
  
  const canDeleteSessions = useMemo(() => {
    return userPermissions.canDeleteSessions || isAdmin;
  }, [userPermissions, isAdmin]);
  
  const canBanUsers = useMemo(() => {
    return userPermissions.canBanUsers || isModerator;
  }, [userPermissions, isModerator]);

  // =============================================
  // HELPER FUNCTIONS
  // =============================================
  
  /**
   * Get stored token
   */
  const getToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  /**
   * Save auth data to localStorage and state
   */
  const saveAuthData = useCallback((userData, token, perms = null) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      if (perms) {
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
        setPermissions(perms);
      }
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Error saving auth data:', err);
    }
  }, []);

  /**
   * Clear auth data from localStorage and state
   */
  const clearAuthData = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PERMISSIONS_KEY);
      setUser(null);
      setPermissions(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing auth data:', err);
    }
  }, []);

  /**
   * Check if user has required role
   * @param {string|string[]} requiredRoles - Required role(s)
   * @returns {boolean}
   */
  const hasRole = useCallback((requiredRoles) => {
    if (!user) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(userRole);
  }, [user, userRole]);

  /**
   * Check if user's role is at least the specified role
   * @param {string} minRole - Minimum required role
   * @returns {boolean}
   */
  const hasMinRole = useCallback((minRole) => {
    if (!user) return false;
    
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    
    return userLevel >= requiredLevel;
  }, [user, userRole]);

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    
    // Check user's server-provided permissions first
    if (user.permissions && typeof user.permissions[permission] === 'boolean') {
      return user.permissions[permission];
    }
    
    // Check cached permissions
    if (userPermissions && typeof userPermissions[permission] === 'boolean') {
      return userPermissions[permission];
    }
    
    // Fall back to role-based check
    return DEFAULT_PERMISSIONS[userRole]?.[permission] || false;
  }, [user, userPermissions, userRole]);

  /**
   * Check if user can perform action on session
   * @param {string} action - Action to perform
   * @param {object} session - Session object
   * @returns {boolean}
   */
  const canPerformSessionAction = useCallback((action, session) => {
    if (!user || !session) return false;
    
    const isSessionHost = session.host === user.id || session.host?._id === user.id;
    
    switch (action) {
      case 'view':
        return true;
      case 'join':
      case 'leave':
      case 'vote':
      case 'feedback':
        return isAuthenticated;
      case 'create':
        return canCreateSession;
      case 'edit':
      case 'update':
        return isSessionHost || isModerator;
      case 'delete':
        return isSessionHost || isAdmin;
      case 'start':
      case 'end':
      case 'pause':
      case 'resume':
      case 'advance':
        return isSessionHost || isModerator;
      case 'kick':
      case 'mute':
        return isSessionHost || isModerator;
      case 'ban':
        return isSessionHost || canBanUsers;
      case 'promote':
      case 'demote':
        return isSessionHost || isAdmin;
      case 'addSong':
        return isSessionHost || isModerator || session.settings?.allowSongRequests;
      case 'removeSong':
        return isSessionHost || isModerator;
      default:
        return false;
    }
  }, [user, isAuthenticated, canCreateSession, isModerator, isAdmin, canBanUsers]);

  // =============================================
  // AUTH ACTIONS
  // =============================================

  /**
   * Register new user
   */
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { username, email, password, displayName, userType, role, adminSecretKey } = userData;
      
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        displayName,
        userType: userType || 'casual',
        role,
        adminSecretKey,
      });
      
      const { user: newUser, token } = response.data.data;
      const perms = newUser.permissions || null;
      
      saveAuthData(newUser, token, perms);
      
      return { success: true, user: newUser };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [saveAuthData]);

  /**
   * Login user
   */
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token } = response.data.data;
      const perms = userData.permissions || null;
      
      saveAuthData(userData, token, perms);
      
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [saveAuthData]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await api.post('/auth/logout');
    } catch {
      // Ignore logout API errors
    } finally {
      clearAuthData();
      setLoading(false);
    }
  }, [clearAuthData]);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setInitialized(true);
      return null;
    }

    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data.user;
      const perms = userData.permissions || null;
      
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      if (perms) {
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
        setPermissions(perms);
      }
      setUser(userData);
      setError(null);
      
      return userData;
    } catch (err) {
      // Token is invalid or expired
      clearAuthData();
      return null;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [getToken, clearAuthData]);

  /**
   * Refresh token
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem(TOKEN_KEY, token);
      if (userData) {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
      }
      
      return { success: true };
    } catch (err) {
      clearAuthData();
      throw new Error('Session expired. Please login again.');
    }
  }, [clearAuthData]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.put('/auth/me', profileData);
      const updatedUser = response.data.data.user;
      
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to update profile';
      throw new Error(message);
    }
  }, []);

  /**
   * Update password
   */
  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/update-password', {
        currentPassword,
        newPassword,
      });
      
      // Save new token if provided
      if (response.data.data?.token) {
        localStorage.setItem(TOKEN_KEY, response.data.data.token);
      }
      
      return { success: true, message: 'Password updated successfully' };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to update password';
      throw new Error(message);
    }
  }, []);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (preferences) => {
    try {
      const response = await api.put('/auth/me', { preferences });
      const updatedUser = response.data.data.user;
      
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true, preferences: updatedUser.preferences };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to update preferences';
      throw new Error(message);
    }
  }, []);

  /**
   * Forgot password
   */
  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return { success: true, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to send reset email';
      throw new Error(message);
    }
  }, []);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      
      // Auto-login if token provided
      if (response.data.data?.token && response.data.data?.user) {
        saveAuthData(response.data.data.user, response.data.data.token);
      }
      
      return { success: true, message: 'Password reset successfully' };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to reset password';
      throw new Error(message);
    }
  }, [saveAuthData]);

  /**
   * Verify email
   */
  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      
      // Update user if response includes updated user data
      if (response.data.data?.user) {
        const updatedUser = response.data.data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else if (user) {
        // Just update the emailVerified flag
        const updatedUser = { ...user, emailVerified: true };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      return { success: true, message: 'Email verified successfully' };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to verify email';
      throw new Error(message);
    }
  }, [user]);

  /**
   * Resend verification email
   */
  const resendVerification = useCallback(async () => {
    try {
      const response = await api.post('/auth/resend-verification');
      return { success: true, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 
                      err.response?.data?.error?.message || 
                      'Failed to resend verification email';
      throw new Error(message);
    }
  }, []);

  /**
   * Get user permissions from server
   */
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await api.get('/auth/permissions');
      const perms = response.data.data.permissions;
      
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
      setPermissions(perms);
      
      return perms;
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      return null;
    }
  }, []);

  /**
   * Check if current user is admin
   */
  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await api.get('/auth/check-admin');
      return response.data.data;
    } catch (err) {
      return { isAdmin: false };
    }
  }, []);

  // =============================================
  // ADMIN ACTIONS
  // =============================================

  /**
   * Get all users (admin only)
   */
  const getAllUsers = useCallback(async (params = {}) => {
    try {
      const response = await api.get('/auth/users', { params });
      return response.data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch users';
      throw new Error(message);
    }
  }, []);

  /**
   * Update user role (admin only)
   */
  const updateUserRole = useCallback(async (userId, role) => {
    try {
      const response = await api.put(`/auth/users/${userId}/role`, { role });
      return response.data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update user role';
      throw new Error(message);
    }
  }, []);

  /**
   * Deactivate user (admin only)
   */
  const deactivateUser = useCallback(async (userId) => {
    try {
      const response = await api.put(`/auth/users/${userId}/deactivate`);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to deactivate user';
      throw new Error(message);
    }
  }, []);

  /**
   * Reactivate user (admin only)
   */
  const reactivateUser = useCallback(async (userId) => {
    try {
      const response = await api.put(`/auth/users/${userId}/reactivate`);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reactivate user';
      throw new Error(message);
    }
  }, []);

  /**
   * Get admin stats (admin only)
   */
  const getAdminStats = useCallback(async () => {
    try {
      const response = await api.get('/auth/admin/stats');
      return response.data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch admin stats';
      throw new Error(message);
    }
  }, []);

  /**
   * Create user (admin only)
   */
  const createUser = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/admin/create-user', userData);
      return response.data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create user';
      throw new Error(message);
    }
  }, []);

  // =============================================
  // EFFECTS
  // =============================================

  // Check auth on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 25 minutes (assuming 30 min expiry)
    const refreshInterval = setInterval(() => {
      refreshToken().catch(() => {
        // Token refresh failed, user will be logged out on next API call
      });
    }, 25 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshToken]);

  // =============================================
  // CONTEXT VALUE
  // =============================================

  const value = useMemo(() => ({
    // State
    user,
    loading,
    error,
    initialized,
    
    // Auth status
    isAuthenticated,
    
    // Role checks
    userRole,
    isAdmin,
    isModerator,
    isCreator,
    isUser,
    
    // Permission checks
    permissions: userPermissions,
    canCreateSession,
    canManageSessions,
    canModerate,
    canViewAdminDashboard,
    canManageUsers,
    canDeleteSessions,
    canBanUsers,
    
    // Permission helpers
    hasRole,
    hasMinRole,
    hasPermission,
    canPerformSessionAction,
    
    // Auth actions
    login,
    register,
    logout,
    refreshUser,
    refreshToken,
    
    // Profile actions
    updateProfile,
    updatePassword,
    updatePreferences,
    
    // Password reset
    forgotPassword,
    resetPassword,
    
    // Email verification
    verifyEmail,
    resendVerification,
    
    // Permissions
    fetchPermissions,
    checkAdminStatus,
    
    // Admin actions
    getAllUsers,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    getAdminStats,
    createUser,
    
    // Utilities
    getToken,
    clearAuthData,
  }), [
    user,
    loading,
    error,
    initialized,
    isAuthenticated,
    userRole,
    isAdmin,
    isModerator,
    isCreator,
    isUser,
    userPermissions,
    canCreateSession,
    canManageSessions,
    canModerate,
    canViewAdminDashboard,
    canManageUsers,
    canDeleteSessions,
    canBanUsers,
    hasRole,
    hasMinRole,
    hasPermission,
    canPerformSessionAction,
    login,
    register,
    logout,
    refreshUser,
    refreshToken,
    updateProfile,
    updatePassword,
    updatePreferences,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    fetchPermissions,
    checkAdminStatus,
    getAllUsers,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    getAdminStats,
    createUser,
    getToken,
    clearAuthData,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// =============================================
// CUSTOM HOOK
// =============================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// =============================================
// HIGHER-ORDER COMPONENT FOR PROTECTED ROUTES
// =============================================

/**
 * HOC to protect components that require authentication
 */
export const withAuth = (Component, options = {}) => {
  const { requiredRole, redirectTo = '/login' } = options;
  
  const WrappedComponent = (props) => {
    const { isAuthenticated, loading, hasMinRole } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      window.location.href = redirectTo;
      return null;
    }
    
    if (requiredRole && !hasMinRole(requiredRole)) {
      window.location.href = '/unauthorized';
      return null;
    }
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
};

// =============================================
// UTILITY HOOKS
// =============================================

/**
 * Hook to check if user can perform specific session action
 */
export const useSessionPermission = (session, action) => {
  const { canPerformSessionAction } = useAuth();
  return canPerformSessionAction(action, session);
};

/**
 * Hook to get role display name
 */
export const useRoleDisplay = () => {
  const { user, userRole } = useAuth();
  
  const roleDisplayNames = {
    admin: 'Administrator',
    moderator: 'Moderator',
    creator: 'Creator',
    user: 'User',
  };
  
  return {
    role: userRole,
    displayName: user?.roleDisplayName || roleDisplayNames[userRole] || 'User',
    badge: userRole !== 'user' ? roleDisplayNames[userRole] : null,
  };
};

export default AuthContext;