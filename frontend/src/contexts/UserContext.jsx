import React, { createContext, useContext, useState } from 'react';

export const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=a042581f4e29026704d';

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

export const UserProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('sld_auth_session') === 'true';
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sld_user_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_USER, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load user profile from storage', e);
    }
    return DEFAULT_USER;
  });

  const loginUser = (credentials) => {
    setIsAuthenticated(true);
    if (credentials?.username || credentials?.fullName) {
      setUser(prev => ({
        ...prev,
        fullName: credentials.fullName || prev.fullName,
        username: credentials.username || prev.username,
      }));
    }
    try {
      localStorage.setItem('sld_auth_session', 'true');
    } catch (e) {
      console.error('Failed to persist auth session', e);
    }
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('sld_auth_session');
    } catch (e) {
      console.error('Failed to clear auth session', e);
    }
  };

  const updateAvatar = (newAvatarUrl) => {
    setUser(prev => {
      const updated = { ...prev, avatarUrl: newAvatarUrl || DEFAULT_AVATAR };
      try {
        localStorage.setItem('sld_user_profile', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist avatar', e);
      }
      return updated;
    });
  };

  const updateProfile = (updatedFields) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem('sld_user_profile', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist profile', e);
      }
      return updated;
    });
  };

  const resetAvatar = () => {
    updateAvatar(DEFAULT_AVATAR);
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
