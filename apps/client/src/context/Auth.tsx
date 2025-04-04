import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/user/me', {
          withCredentials: true
        });
       console.log('testing') 
        if (response.data.data.user) {
          setUser(response.data.data.user);
        }
      } catch (error) {
        // User is not logged in, that's okay
        setUser(null);
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post(
        'http://localhost:8000/api/user/login',
        { email, password },
        { withCredentials: true }
      );
      
      // Important: Make sure we properly set the user here
      if (response.data.data && response.data.data.user) {
        setUser(response.data.data.user);
        toast.success('Logged in successfully');
        return true;
      } else {
        // If response format doesn't contain user, make another call to /me endpoint
        const userResponse = await axios.get('http://localhost:8000/api/user/me', {
          withCredentials: true
        });
        setUser(userResponse.data.data.user);
        toast.success('Logged in successfully');
        return true;
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await axios.get('http://localhost:8000/api/user/logout', {
        withCredentials: true
      });
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    authChecked,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
