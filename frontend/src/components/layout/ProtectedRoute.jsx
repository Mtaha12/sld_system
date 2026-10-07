import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

// List of backend / management route prefixes restricted to Admins and users with allowAllForms
const ADMIN_ROUTE_PREFIXES = [
  '/manage-',
  '/setting',
  '/activity',
  '/replacement',
  '/tax-cards',
  '/dictionary',
  '/newsletters',
  '/custom-tariffs',
  '/custom-tariff',
  '/invoices',
  '/other-caselaws',
  '/news',
  '/whatsapp-updates',
  '/updates',
  '/downloads',
  '/youtube-updates',
  '/admins',
  '/users'
];

/**
 * ProtectedRoute Component
 * Guards all administrative and management routes against unauthenticated and unauthorized access.
 * If user lacks permission for a specific page or backend forms, seamlessly redirects to /dashboard.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, user } = useUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user?.role === 'Administrator' || Boolean(user?.allowAllForms);
  const curPath = location.pathname.toLowerCase();

  // 1. Guard Backend Management pages: only Admins and users with allowAllForms
  const isBackendRoute = ADMIN_ROUTE_PREFIXES.some(prefix => 
    curPath === prefix || curPath.startsWith(prefix)
  );

  if (isBackendRoute && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2. Specific feature permission checks for users without allowAllForms
  if (!isAdmin) {
    // Check Notification Search
    if ((curPath.startsWith('/notification-search') || curPath.startsWith('/search-notification')) && user?.displayNotification === false) {
      return <Navigate to="/dashboard" replace />;
    }

    // Check Statute Search
    if ((curPath.startsWith('/statute-search') || curPath.startsWith('/search-statute')) && user?.displayStatute === false) {
      return <Navigate to="/dashboard" replace />;
    }

    // Check Case Law Search
    if ((curPath.startsWith('/search-case-law') || curPath.startsWith('/cases/view')) && user?.displayCase === false) {
      return <Navigate to="/dashboard" replace />;
    }

    // Check AI Assistant
    if ((curPath.startsWith('/ai-assistant') || curPath.startsWith('/ai-chat')) && user?.aiAssistant === false) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
