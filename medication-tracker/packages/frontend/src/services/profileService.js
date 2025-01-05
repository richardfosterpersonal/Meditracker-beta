import axios from './axiosConfig';

const PROFILE_URL = '/profile';

export const profileService = {
    getProfile: async () => {
        try {
            const response = await axios.get(PROFILE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    },

    updateProfile: async (profileData) => {
        try {
            const response = await axios.put(PROFILE_URL, profileData);
            return response.data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },

    updateEmergencyContact: async (emergencyContactData) => {
        try {
            const response = await axios.put(`${PROFILE_URL}/emergency-contact`, emergencyContactData);
            return response.data;
        } catch (error) {
            console.error('Error updating emergency contact:', error);
            throw error;
        }
    },

    changePassword: async (passwordData) => {
        try {
            const response = await axios.put(`${PROFILE_URL}/change-password`, passwordData);
            return response.data;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }
};
