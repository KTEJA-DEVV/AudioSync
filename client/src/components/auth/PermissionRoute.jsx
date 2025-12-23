import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * PermissionRoute - Restricts access based on specific permissions
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if user has permission
 * @param {string} props.permission - The permission required to access the route
 * @param {string} [props.redirectTo='/'] - Path to redirect if user doesn't have permission
 * @param {boolean} [props.requireAuth=true] - Whether to require authentication
 * @returns {JSX.Element} Permission-based route component
 */
const PermissionRoute = ({ 
  children, 
  permission, 
  redirectTo = '/',
  requireAuth = true
}) => {
  const { isAuthenticated, hasPermission, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAuth && !hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default PermissionRoute;
