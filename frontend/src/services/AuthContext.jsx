import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios to use token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // First try using the proxy
        let response;
        try {
          console.log('Verifying user with proxy endpoint /api/users/me');
          response = await axios.get('/api/users/me', {
            timeout: 5000 // Added timeout to prevent hanging
          });
        } catch (proxyError) {
          console.warn('Proxy verification failed, trying direct URL:', proxyError);
          
          // Fall back to direct URL if proxy fails
          const apiUrl = `${window.location.protocol}//${window.location.hostname}:5001/api/users/me`;
          console.log('Using direct API URL for verification:', apiUrl);
          
          response = await axios.get(apiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Access-Control-Allow-Origin': '*'
            },
            timeout: 5000 // Added timeout to prevent hanging
          });
        }
        
        setUser(response.data);
        setIsAuthenticated(true);
        setLoading(false);
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Provide more specific logging
        if (error.code === 'ECONNABORTED') {
          console.error('Verification timed out - server may be down');
        } else if (error.message && error.message.includes('Network Error')) {
          console.error('Network error during verification - check server status');
        }
        
        logout();
        setLoading(false);
      }
    };

    verifyUser();
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      console.log('AuthContext login called with:', email);
      
      // First try using the proxy (which should be preferred)
      let response;
      try {
        console.log('Trying to use proxy for login at /api/auth/login');
        response = await axios.post('/api/auth/login', { email, password }, {
          // Added timeout to prevent hanging
          timeout: 5000
        });
      } catch (proxyError) {
        console.warn('Proxy login failed, trying direct URL:', proxyError);
        
        // Fall back to direct URL if proxy fails
        const apiUrl = `${window.location.protocol}//${window.location.hostname}:5001/api/auth/login`;
        console.log('Using direct API URL:', apiUrl);
        
        response = await axios.post(apiUrl, { email, password }, {
          // Added configuration to handle CORS
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          // Added timeout to prevent hanging
          timeout: 5000
        });
      }
      
      console.log('Login response:', response.data);
      
      if (!response.data || !response.data.token) {
        console.error('Invalid response format - missing token:', response.data);
        return {
          success: false,
          message: 'Invalid response from server',
        };
      }
      
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login API error:', error);
      
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
      } else if (error.request) {
        console.log('No response received:', error.request);
      }
      
      // Provide more specific error messages for common network issues
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Connection timed out. The server may be down or unreachable.',
          error
        };
      } else if (error.message && error.message.includes('Network Error')) {
        return {
          success: false,
          message: 'Network error. Please check your connection and ensure the server is running.',
          error
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed: ' + (error.message || 'Unknown error'),
        error
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      // First try using the proxy
      let response;
      try {
        console.log('Registering user with proxy endpoint /api/auth/register');
        response = await axios.post('/api/auth/register', userData, {
          timeout: 5000 // Added timeout to prevent hanging
        });
      } catch (proxyError) {
        console.warn('Proxy registration failed, trying direct URL:', proxyError);
        
        // Fall back to direct URL if proxy fails
        const apiUrl = `${window.location.protocol}//${window.location.hostname}:5001/api/auth/register`;
        console.log('Using direct API URL for registration:', apiUrl);
        
        response = await axios.post(apiUrl, userData, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          timeout: 5000 // Added timeout to prevent hanging
        });
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Provide more specific error messages for common network issues
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Connection timed out. The server may be down or unreachable.',
        };
      } else if (error.message && error.message.includes('Network Error')) {
        return {
          success: false,
          message: 'Network error. Please check your connection and ensure the server is running.',
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;