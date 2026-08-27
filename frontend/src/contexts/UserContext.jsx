import React, { createContext, useContext, useState } from 'react';
import api from '../services/api.js';

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
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load user profile from storage', e);
    }
    return DEFAULT_USER;
  });

  const loginUser = (userProfile) => {
    setIsAuthenticated(true);
    if (userProfile) {
      setUser(userProfile);
    }
    try {
      localStorage.setItem('sld_auth_session', 'true');
      localStorage.setItem('sld_user_profile', JSON.stringify(userProfile));
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
