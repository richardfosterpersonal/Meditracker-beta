import axiosInstance from './axiosConfig';

const medicationHistoryApi = {
    // Get medication history
    getHistory: async (params = {}) => {
        try {
            const response = await axiosInstance.get('/medication-history/', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching medication history:', error);
            throw error;
        }
    },

    // Add medication history entry
    addHistory: async (historyData) => {
        try {
            const response = await axiosInstance.post('/medication-history/', historyData);
            return response.data;
        } catch (error) {
            console.error('Error adding medication history:', error);
            throw error;
        }
    },

    // Get medication statistics
    getStats: async (params = {}) => {
        try {
            const response = await axiosInstance.get('/medication-history/stats/summary', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching medication stats:', error);
            throw error;
        }
    },

    // Get medication specific statistics
    getSpecificStats: async (medicationId) => {
        try {
            const response = await axiosInstance.get(`/medications/${medicationId}/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching medication specific stats:', error);
            throw error;
        }
    }
};

export default medicationHistoryApi;
