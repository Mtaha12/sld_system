import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

/**
 * ProtectedRoute Component
 * Guards all administrative routes against unauthenticated access.
 * Redirects unauthenticated requests to /login while preserving location state.
 */
const ProtectedRoute = () => {
  const { isAuthenticated } = useUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
