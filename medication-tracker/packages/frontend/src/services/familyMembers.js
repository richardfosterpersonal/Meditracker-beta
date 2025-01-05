import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Configure axios instance
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Add token to requests if it exists
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Add response interceptor to handle errors
api.interceptors.response.use(
    response => response,
    error => {
        console.error('API Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || { error: 'An error occurred' });
    }
);

const FamilyMemberService = {
    // Get all family members
    getFamilyMembers: async () => {
        try {
            const response = await api.get('/family-members/');
            return response.data;
        } catch (error) {
            console.error('Error fetching family members:', error);
            throw error;
        }
    },

    // Create a new family member
    createFamilyMember: async (memberData) => {
        try {
            const response = await api.post('/family-members/', memberData);
            return response.data;
        } catch (error) {
            console.error('Error creating family member:', error);
            throw error;
        }
    },

    // Delete a family member
    deleteFamilyMember: async (id) => {
        try {
            const response = await api.delete(`/family-members/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting family member:', error);
            throw error;
        }
    }
};

export default FamilyMemberService;
