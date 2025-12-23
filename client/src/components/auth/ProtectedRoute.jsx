import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Local LoadingSpinner component
const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-b-2',
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size] || sizeClasses.md} border-indigo-600`}></div>
  );
};

/**
 * ProtectedRoute - A wrapper component that protects routes from unauthenticated users
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string} [props.redirectTo='/login'] - Path to redirect if not authenticated
 * @returns {JSX.Element} Protected route component
 */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Store the attempted URL for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

// Higher-order component for admin-only routes
const AdminRoute = ({ children, redirectTo = '/unauthorized' }) => {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Higher-order component for moderator-only routes
const ModeratorRoute = ({ children, redirectTo = '/unauthorized' }) => {
  const { user } = useAuth();
  
  if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Higher-order component for creator-only routes
const CreatorRoute = ({ children, redirectTo = '/unauthorized' }) => {
  const { user } = useAuth();
  
  if (!user || (user.role !== 'creator' && user.role !== 'admin')) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Higher-order component for session creator routes
const SessionCreatorRoute = ({ children, session, redirectTo = '/unauthorized' }) => {
  const { user } = useAuth();
  
  if (!user || (user.id !== session?.creatorId && user.role !== 'admin')) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Higher-order component for verified users only
const VerifiedRoute = ({ children, redirectTo = '/verify-email' }) => {
  const { user } = useAuth();
  
  if (!user?.emailVerified) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Higher-order component for guest-only routes
const GuestRoute = ({ children, redirectTo = '/' }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
export {
  AdminRoute,
  ModeratorRoute,
  CreatorRoute,
  SessionCreatorRoute,
  VerifiedRoute,
  GuestRoute
};
