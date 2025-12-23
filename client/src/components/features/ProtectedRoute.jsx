import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// =============================================
// LOADING SPINNER COMPONENT
// =============================================

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    <p className="text-gray-500 text-sm">{message}</p>
  </div>
);

LoadingSpinner.propTypes = {
  message: PropTypes.string,
};

// =============================================
// UNAUTHORIZED COMPONENT
// =============================================

const UnauthorizedMessage = ({ 
  title = 'Access Denied', 
  message = 'You do not have permission to view this page.',
  showHomeLink = true,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
    <div className="text-6xl">🔒</div>
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="text-gray-600 text-center max-w-md">{message}</p>
    {showHomeLink && (
      <a 
        href="/" 
        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Go to Home
      </a>
    )}
  </div>
);

UnauthorizedMessage.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  showHomeLink: PropTypes.bool,
};

// =============================================
// PROTECTED ROUTE COMPONENT
// =============================================

/**
 * ProtectedRoute - Route wrapper for authentication and authorization
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string|string[]} props.requiredRole - Required role(s) to access route
 * @param {string} props.requiredPermission - Required permission to access route
 * @param {string} props.minRole - Minimum role level required (uses role hierarchy)
 * @param {boolean} props.requireEmailVerified - Require email to be verified
 * @param {boolean} props.requireAdmin - Shortcut for requiring admin role
 * @param {boolean} props.requireModerator - Shortcut for requiring moderator+ role
 * @param {boolean} props.requireCreator - Shortcut for requiring creator+ role
 * @param {boolean} props.canCreateSession - Require session creation permission
 * @param {string} props.redirectTo - Custom redirect path for unauthorized users
 * @param {string} props.unauthorizedRedirect - Custom redirect for authenticated but unauthorized users
 * @param {React.ReactNode} props.fallback - Custom fallback component while loading
 * @param {React.ReactNode} props.unauthorizedFallback - Custom component for unauthorized state
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole = null,
  requiredPermission = null,
  minRole = null,
  requireEmailVerified = false,
  requireAdmin = false,
  requireModerator = false,
  requireCreator = false,
  canCreateSession: requireCanCreateSession = false,
  redirectTo = '/login',
  unauthorizedRedirect = null,
  fallback = null,
  unauthorizedFallback = null,
}) => {
  const { 
    isAuthenticated, 
    user, 
    loading,
    initialized,
    isAdmin,
    isModerator,
    isCreator,
    canCreateSession,
    hasRole,
    hasMinRole,
    hasPermission,
  } = useAuth();
  
  const location = useLocation();

  // =============================================
  // LOADING STATE
  // =============================================

  if (loading || !initialized) {
    if (fallback) {
      return fallback;
    }
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // =============================================
  // AUTHENTICATION CHECK
  // =============================================

  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location, message: 'Please log in to continue.' }} 
        replace 
      />
    );
  }

  // =============================================
  // EMAIL VERIFICATION CHECK
  // =============================================

  if (requireEmailVerified && !user?.emailVerified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ from: location, message: 'Please verify your email to continue.' }} 
        replace 
      />
    );
  }

  // =============================================
  // ROLE CHECKS
  // =============================================

  // Admin shortcut check
  if (requireAdmin && !isAdmin) {
    if (unauthorizedRedirect) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
    if (unauthorizedFallback) {
      return unauthorizedFallback;
    }
    return (
      <UnauthorizedMessage 
        title="Admin Access Required"
        message="This page is only accessible to administrators."
      />
    );
  }

  // Moderator shortcut check (moderator or admin)
  if (requireModerator && !isModerator) {
    if (unauthorizedRedirect) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
    if (unauthorizedFallback) {
      return unauthorizedFallback;
    }
    return (
      <UnauthorizedMessage 
        title="Moderator Access Required"
        message="This page is only accessible to moderators and administrators."
      />
    );
  }

  // Creator shortcut check (creator, moderator, or admin)
  if (requireCreator && !isCreator) {
    if (unauthorizedRedirect) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
    if (unauthorizedFallback) {
      return unauthorizedFallback;
    }
    return (
      <UnauthorizedMessage 
        title="Creator Access Required"
        message="This page is only accessible to creators, moderators, and administrators."
      />
    );
  }

  // Session creation permission check
  if (requireCanCreateSession && !canCreateSession) {
    if (unauthorizedRedirect) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
    if (unauthorizedFallback) {
      return unauthorizedFallback;
    }
    return (
      <UnauthorizedMessage 
        title="Permission Required"
        message="You do not have permission to create sessions. Please contact an administrator if you believe this is an error."
      />
    );
  }

  // Specific role(s) check
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = hasRole(allowedRoles);
    
    if (!hasRequiredRole) {
      if (unauthorizedRedirect) {
        return <Navigate to={unauthorizedRedirect} replace />;
      }
      if (unauthorizedFallback) {
        return unauthorizedFallback;
      }
      return (
        <UnauthorizedMessage 
          title="Access Restricted"
          message={`This page requires one of the following roles: ${allowedRoles.join(', ')}.`}
        />
      );
    }
  }

  // Minimum role level check
  if (minRole) {
    const hasMinimumRole = hasMinRole(minRole);
    
    if (!hasMinimumRole) {
      if (unauthorizedRedirect) {
        return <Navigate to={unauthorizedRedirect} replace />;
      }
      if (unauthorizedFallback) {
        return unauthorizedFallback;
      }
      return (
        <UnauthorizedMessage 
          title="Insufficient Permissions"
          message={`This page requires at least ${minRole} level access.`}
        />
      );
    }
  }

  // =============================================
  // PERMISSION CHECK
  // =============================================

  if (requiredPermission) {
    const hasRequiredPermission = hasPermission(requiredPermission);
    
    if (!hasRequiredPermission) {
      if (unauthorizedRedirect) {
        return <Navigate to={unauthorizedRedirect} replace />;
      }
      if (unauthorizedFallback) {
        return unauthorizedFallback;
      }
      return (
        <UnauthorizedMessage 
          title="Permission Required"
          message="You do not have the required permission to access this page."
        />
      );
    }
  }

  // =============================================
  // ALL CHECKS PASSED - RENDER CHILDREN
  // =============================================

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  requiredPermission: PropTypes.string,
  minRole: PropTypes.oneOf(['user', 'creator', 'moderator', 'admin']),
  requireEmailVerified: PropTypes.bool,
  requireAdmin: PropTypes.bool,
  requireModerator: PropTypes.bool,
  requireCreator: PropTypes.bool,
  canCreateSession: PropTypes.bool,
  redirectTo: PropTypes.string,
  unauthorizedRedirect: PropTypes.string,
  fallback: PropTypes.node,
  unauthorizedFallback: PropTypes.node,
};

// =============================================
// SPECIALIZED ROUTE COMPONENTS
// =============================================

/**
 * AdminRoute - Route that requires admin role
 */
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute requireAdmin {...props}>
    {children}
  </ProtectedRoute>
);

AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * ModeratorRoute - Route that requires moderator or admin role
 */
export const ModeratorRoute = ({ children, ...props }) => (
  <ProtectedRoute requireModerator {...props}>
    {children}
  </ProtectedRoute>
);

ModeratorRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * CreatorRoute - Route that requires creator, moderator, or admin role
 */
export const CreatorRoute = ({ children, ...props }) => (
  <ProtectedRoute requireCreator {...props}>
    {children}
  </ProtectedRoute>
);

CreatorRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * SessionCreatorRoute - Route that requires session creation permission
 */
export const SessionCreatorRoute = ({ children, ...props }) => (
  <ProtectedRoute canCreateSession {...props}>
    {children}
  </ProtectedRoute>
);

SessionCreatorRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * VerifiedRoute - Route that requires email verification
 */
export const VerifiedRoute = ({ children, ...props }) => (
  <ProtectedRoute requireEmailVerified {...props}>
    {children}
  </ProtectedRoute>
);

VerifiedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// =============================================
// GUEST ROUTE COMPONENT
// =============================================

/**
 * GuestRoute - Route only accessible to unauthenticated users
 * Redirects authenticated users to specified path
 */
export const GuestRoute = ({ 
  children, 
  redirectTo = '/',
  fallback = null,
}) => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const location = useLocation();

  if (loading || !initialized) {
    if (fallback) {
      return fallback;
    }
    return <LoadingSpinner message="Loading..." />;
  }

  if (isAuthenticated) {
    // Redirect to the page they came from, or default path
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return children;
};

GuestRoute.propTypes = {
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
  fallback: PropTypes.node,
};

// =============================================
// CONDITIONAL RENDER COMPONENT
// =============================================

/**
 * RoleBasedRender - Conditionally render based on user role
 */
export const RoleBasedRender = ({
  children,
  roles,
  minRole,
  permission,
  fallback = null,
}) => {
  const { 
    isAuthenticated, 
    hasRole, 
    hasMinRole, 
    hasPermission,
    loading,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  // Check specific roles
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!hasRole(allowedRoles)) {
      return fallback;
    }
  }

  // Check minimum role
  if (minRole && !hasMinRole(minRole)) {
    return fallback;
  }

  // Check permission
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  return children;
};

RoleBasedRender.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  minRole: PropTypes.oneOf(['user', 'creator', 'moderator', 'admin']),
  permission: PropTypes.string,
  fallback: PropTypes.node,
};

/**
 * AdminOnly - Render only for admins
 */
export const AdminOnly = ({ children, fallback = null }) => (
  <RoleBasedRender roles="admin" fallback={fallback}>
    {children}
  </RoleBasedRender>
);

AdminOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * ModeratorOnly - Render only for moderators and admins
 */
export const ModeratorOnly = ({ children, fallback = null }) => (
  <RoleBasedRender roles={['admin', 'moderator']} fallback={fallback}>
    {children}
  </RoleBasedRender>
);

ModeratorOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * CreatorOnly - Render only for creators, moderators, and admins
 */
export const CreatorOnly = ({ children, fallback = null }) => (
  <RoleBasedRender roles={['admin', 'moderator', 'creator']} fallback={fallback}>
    {children}
  </RoleBasedRender>
);

CreatorOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * AuthenticatedOnly - Render only for authenticated users
 */
export const AuthenticatedOnly = ({ children, fallback = null }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return isAuthenticated ? children : fallback;
};

AuthenticatedOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * UnauthenticatedOnly - Render only for unauthenticated users
 */
export const UnauthenticatedOnly = ({ children, fallback = null }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return !isAuthenticated ? children : fallback;
};

UnauthenticatedOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

// =============================================
// DEFAULT EXPORT
// =============================================

export default ProtectedRoute;