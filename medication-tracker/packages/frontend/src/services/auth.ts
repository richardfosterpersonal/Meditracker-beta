import axios from './axiosConfig';
import { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth';
import { handleSecurityError } from '../utils/errorHandling';

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
        const response = await axios.post<AuthResponse>('/auth/login', { 
            email, 
            password 
        });
        
        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            if (response.data.refresh_token) {
                localStorage.setItem('refreshToken', response.data.refresh_token);
            }
        }
        return response.data;
    } catch (error: any) {
        const securityError = handleSecurityError(error);
        throw securityError;
    }
};

export const register = async (userData: RegisterData): Promise<AuthResponse> => {
    try {
        const response = await axios.post<AuthResponse>('/auth/register', userData);
        return response.data;
    } catch (error: any) {
        const securityError = handleSecurityError(error);
        throw securityError;
    }
};

export const logout = async (): Promise<void> => {
    try {
        await axios.post('/auth/logout');
    } catch (error) {
        // Even if logout fails, we still want to clear local storage
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
    }
};

export const refreshToken = async (): Promise<string> => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await axios.post<{ access_token: string }>('/auth/refresh', {}, {
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            }
        });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            return response.data.access_token;
        }
        throw new Error('Invalid refresh token response');
    } catch (error: any) {
        const securityError = handleSecurityError(error);
        throw securityError;
    }
};

export const getCurrentUser = async (): Promise<User> => {
    try {
        const response = await axios.get<User>('/auth/user');
        return response.data;
    } catch (error: any) {
        const securityError = handleSecurityError(error);
        throw securityError;
    }
};

export default {
    login,
    register,
    logout,
    refreshToken,
    getCurrentUser
};
