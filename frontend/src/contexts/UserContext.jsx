import React, { createContext, useContext, useState } from 'react';
import api from '../services/api.js';

export const DEFAULT_AVATAR = '/sld-logo.jpeg';

export const sanitizeUserAvatar = (userObj) => {
  if (!userObj) return null;
  const avatar = (!userObj.avatarUrl || userObj.avatarUrl.includes('pravatar.cc'))
    ? DEFAULT_AVATAR
    : userObj.avatarUrl;
  return { ...userObj, avatarUrl: avatar };
};

const DEFAULT_USER = {
  fullName: 'Adam Admin',
  username: 'adam_admin',
  email: 'adam.admin@sldsystem.com',
  role: 'Administrator',
  contactNumber: '+92 300 1234567',
  city: 'Karachi',
  companyName: 'SLD Law Firm',
  address: '123 Legal Street, Phase 4, Clifton',
  avatarUrl: DEFAULT_AVATAR
};

const UserContext = createContext();

const isJwtExpiredLocally = (token) => {
  if (!token) return true;
  try {
    const part = token.split('.')[1];
    if (!part) return true;
    const decoded = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' && Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
};

const clearStoredAuthSession = () => {
  try {
    localStorage.removeItem('sld_auth_session');
    localStorage.removeItem('sld_access_token');
    localStorage.removeItem('sld_refresh_token');
    localStorage.removeItem('sld_user_profile');
  } catch (e) {
    console.error('Failed to clear auth session', e);
  }
};

export const UserProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const hasSession = localStorage.getItem('sld_auth_session') === 'true';
      const accessToken = localStorage.getItem('sld_access_token');
      if (!hasSession || !accessToken || isJwtExpiredLocally(accessToken)) {
        if (hasSession) {
          clearStoredAuthSession();
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sld_user_profile');
      if (stored) {
        return sanitizeUserAvatar(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load user profile from storage', e);
    }
    return DEFAULT_USER;
  });

  const logoutUser = (reason, { skipApi = false } = {}) => {
    let activeToken = null;
    try {
      activeToken = localStorage.getItem('sld_access_token');
    } catch {}
    setIsAuthenticated(false);
    clearStoredAuthSession();
    // Signal logout to backend only when explicitly logging out an active token
    if (!skipApi && activeToken) {
      api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      }).catch(() => {});
    }
    if (reason) {
      alert(reason);
      window.location.href = '/login';
    }
  };

  const verifiedOnceRef = React.useRef(false);

  // Sync in-memory auth state whenever API interceptor clears an invalid/expired session
  React.useEffect(() => {
    const handleAuthCleared = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('sld:auth-cleared', handleAuthCleared);
    return () => window.removeEventListener('sld:auth-cleared', handleAuthCleared);
  }, []);

  // Keep user permissions & status synced from backend; immediately terminate session if admin logs user out
  React.useEffect(() => {
    if (!isAuthenticated) {
      verifiedOnceRef.current = false;
      return;
    }

    let isMounted = true;

    const verifySession = async () => {
      const wasVerified = verifiedOnceRef.current;
      try {
        const res = await api.get('/api/auth/me');
        if (res?.data?.data && isMounted) {
          verifiedOnceRef.current = true;
          const sanitized = sanitizeUserAvatar(res.data.data);
          setUser(sanitized);
          try {
            localStorage.setItem('sld_user_profile', JSON.stringify(sanitized));
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          if (!wasVerified) {
            // Stale stored session from prior visit: clear silently and return to public dashboard
            logoutUser(undefined, { skipApi: true });
            return;
          }
          const msg = err.response?.data?.message || 'Access Denied: Your session has been closed by an administrator. Please log in again.';
          logoutUser(msg, { skipApi: true });
        }
      }
    };

    // 1. Initial check on mount/auth
    verifySession();

    // 2. Check whenever user switches back to this window/tab
    const handleFocus = () => {
      verifySession();
    };
    window.addEventListener('focus', handleFocus);

    // 3. Heartbeat check every 25 seconds
    const interval = setInterval(verifySession, 25000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const loginUser = (userProfile) => {
    setIsAuthenticated(true);
    const sanitized = sanitizeUserAvatar(userProfile);
    if (sanitized) {
      setUser(sanitized);
    }
    try {
      localStorage.setItem('sld_auth_session', 'true');
      localStorage.setItem('sld_user_profile', JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to persist auth session', e);
    }
  };

  const updateAvatar = async (newAvatarUrl) => {
    try {
      setUser(prev => {
        const updated = { ...prev, avatarUrl: newAvatarUrl || DEFAULT_AVATAR };
        localStorage.setItem('sld_user_profile', JSON.stringify(updated));
        return updated;
      });
      await api.put('/api/auth/avatar', { avatar: newAvatarUrl || '' });
    } catch (e) {
      console.error('Failed to persist avatar to database', e);
    }
  };

  const updateProfile = async (updatedFields) => {
    try {
      setUser(prev => {
        const updated = { ...prev, ...updatedFields };
        localStorage.setItem('sld_user_profile', JSON.stringify(updated));
        return updated;
      });
      await api.put('/api/auth/profile', updatedFields);
    } catch (e) {
      console.error('Failed to persist profile updates to database', e);
    }
  };

  const resetAvatar = async () => {
    try {
      setUser(prev => {
        const updated = { ...prev, avatarUrl: DEFAULT_AVATAR };
        localStorage.setItem('sld_user_profile', JSON.stringify(updated));
        return updated;
      });
      await api.delete('/api/auth/avatar');
    } catch (e) {
      console.error('Failed to reset avatar in database', e);
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loginUser, 
      logoutUser, 
      updateAvatar, 
      updateProfile, 
      resetAvatar, 
      DEFAULT_AVATAR 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    return {
      user: DEFAULT_USER,
      updateAvatar: () => {},
      updateProfile: () => {},
      resetAvatar: () => {},
      DEFAULT_AVATAR
    };
  }
  return context;
};

export default UserContext;
