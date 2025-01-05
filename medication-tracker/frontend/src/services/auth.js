import axios from './axiosConfig';

export const login = async (email, password) => {
    try {
        const response = await axios.post('/auth/login', { 
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
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('Network error. Please try again.');
    }
};

export const register = async (userData) => {
    try {
        const response = await axios.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        console.error('Registration error:', error.response?.data || error.message);
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('Network error. Please try again.');
    }
};

export const logout = async () => {
    try {
        await axios.post('/auth/logout');
    } catch (error) {
        console.error('Logout error:', error.response?.data || error.message);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
    }
};

export const refreshToken = async () => {
    try {
        const refresh_token = localStorage.getItem('refreshToken');
        if (!refresh_token) {
            throw new Error('No refresh token available');
        }

        const response = await axios.post('/auth/refresh', { refresh_token });
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        return access_token;
    } catch (error) {
        console.error('Token refresh error:', error.response?.data || error.message);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        throw error;
    }
};

export const getCurrentUser = async () => {
    try {
        const response = await axios.get('/auth/user');
        return response.data;
    } catch (error) {
        console.error('Get user error:', error.response?.data || error.message);
        throw error;
    }
};

export default {
    login,
    register,
    logout,
    refreshToken,
    getCurrentUser
};