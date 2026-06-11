import React, { createContext, useContext } from 'react';

const fakeUser = {
  id: 'demo-user',
  full_name: 'Usuário Demo',
  email: 'demo@conselt.local',
  role: 'admin',
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const value = {
    user: fakeUser,
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    logout: () => {},
    navigateToLogin: () => {},
    checkAppState: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
