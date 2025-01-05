/**
 * Admin Authentication Hook
 * Last Updated: 2024-12-25T20:45:12+01:00
 * Status: INTERNAL
 * Reference: ../../../docs/validation/decisions/VALIDATION_VISIBILITY.md
 */

import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthToken {
  sub: string;
  roles: string[];
  exp: number;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = () => {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode<AuthToken>(token);
        const isValid = decoded.exp * 1000 > Date.now();
        const hasAdminRole = decoded.roles.includes('admin');

        setIsAuthenticated(isValid);
        setIsAdmin(isValid && hasAdminRole);
      } catch (error) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        localStorage.removeItem('admin_token');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
    const interval = setInterval(validateToken, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const login = async (username: string, password: string) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Admin login not available in production');
    }

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { token } = await response.json();
      localStorage.setItem('admin_token', token);

      const decoded = jwtDecode<AuthToken>(token);
      setIsAuthenticated(true);
      setIsAdmin(decoded.roles.includes('admin'));
    } catch (error) {
      throw new Error('Authentication failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return {
    isAuthenticated,
    isAdmin,
    loading,
    login,
    logout
  };
};
