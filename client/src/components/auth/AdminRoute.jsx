import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * AdminRoute - Restricts access to admin users only
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if user is admin
 * @param {string} [props.redirectTo='/'] - Path to redirect if not admin
 * @returns {JSX.Element} Admin-only route component
 */
const AdminRoute = ({ children, redirectTo = '/' }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
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

  if (!isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default AdminRoute;
