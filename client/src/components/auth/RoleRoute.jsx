import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * RoleRoute - Restricts access based on user roles
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if user has required role
 * @param {string|string[]} props.allowedRoles - Single role or array of roles that can access the route
 * @param {string} [props.redirectTo='/'] - Path to redirect if user doesn't have required role
 * @returns {JSX.Element} Role-based route component
 */
const RoleRoute = ({ children, allowedRoles, redirectTo = '/' }) => {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default RoleRoute;
