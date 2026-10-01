import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current user if token exists on initial load
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/users/me');
        if (response.data.success) {
          setUser(response.data.data);
        }
      } catch (err) {
        console.error('Failed to restore user session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  // Login handler
  const login = async (credentials) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', credentials);
      const { user: userData, token: jwtToken } = response.data.data;
      
      localStorage.setItem('token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Register handler
  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', userData);
      const { user: newUser, token: jwtToken } = response.data.data;

      localStorage.setItem('token', jwtToken);
      setToken(jwtToken);
      setUser(newUser);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update profile handler
  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const response = await api.put('/users/me', profileData);
      if (response.data.success) {
        setUser(response.data.data);
      }
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        updateProfile,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
