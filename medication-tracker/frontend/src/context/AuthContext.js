import React, { createContext, useContext, useState } from 'react';
import { authService } from '../services/auth/authService';
import { MFAService } from '../services/security/MFAService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);
  
  const mfaService = MFAService.getInstance();

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.login(email, password);
      
      if (response.mfaRequired) {
        setMfaRequired(true);
        setTempCredentials({ email, userId: response.userId });
        return { mfaRequired: true };
      }
      
      if (response.access_token && response.user) {
        localStorage.setItem('token', response.access_token);
        setUser(response.user);
        setToken(response.access_token);
        return response;
      } else {
        throw new Error('Invalid login response');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async (code) => {
    try {
      setError(null);
      setLoading(true);

      if (!tempCredentials) {
        throw new Error('No temporary credentials found');
      }

      const verifyResult = await mfaService.verifyCode(tempCredentials.userId, code);
      
      if (verifyResult.valid) {
        const response = await authService.completeMFALogin(tempCredentials.email, code);
        
        if (response.access_token && response.user) {
          localStorage.setItem('token', response.access_token);
          setUser(response.user);
          setToken(response.access_token);
          setMfaRequired(false);
          setTempCredentials(null);
          return response;
        }
      }
      
      throw new Error(`Invalid MFA code. ${verifyResult.remainingAttempts} attempts remaining.`);
    } catch (err) {
      setError(err.message || 'MFA verification failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setupMFA = async () => {
    try {
      setError(null);
      setLoading(true);
      
      if (!user) {
        throw new Error('User must be logged in to set up MFA');
      }

      const mfaSetup = await mfaService.setupMFA(user.id);
      return mfaSetup;
    } catch (err) {
      setError(err.message || 'MFA setup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyBackupCode = async (backupCode) => {
    try {
      setError(null);
      setLoading(true);

      if (!tempCredentials) {
        throw new Error('No temporary credentials found');
      }

      const isValid = await mfaService.verifyBackupCode(tempCredentials.userId, backupCode);
      
      if (isValid) {
        const response = await authService.completeMFALogin(tempCredentials.email, backupCode, true);
        
        if (response.access_token && response.user) {
          localStorage.setItem('token', response.access_token);
          setUser(response.user);
          setToken(response.access_token);
          setMfaRequired(false);
          setTempCredentials(null);
          return response;
        }
      }
      
      throw new Error('Invalid backup code');
    } catch (err) {
      setError(err.message || 'Backup code verification failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      setMfaRequired(false);
      setTempCredentials(null);
      localStorage.removeItem('token');
    }
  };

  const isAuthenticated = () => {
    return !!token && !mfaRequired;
  };

  const value = {
    user,
    token,
    loading,
    error,
    mfaRequired,
    login,
    logout,
    verifyMFA,
    setupMFA,
    verifyBackupCode,
    isAuthenticated,
    clearError: () => setError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
