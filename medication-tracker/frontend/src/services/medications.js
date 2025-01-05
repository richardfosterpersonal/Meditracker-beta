import axiosInstance from './axiosConfig';

const MedicationService = {
    // Get all medications for the current user
    getMedications: async () => {
        try {
            console.log('Fetching medications...');
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            const response = await axiosInstance.get('/medications/');
            console.log('Medications fetched:', response.data);
            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Create a new medication
    createMedication: async (medicationData) => {
        try {
            console.log('Creating medication:', medicationData);
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            const response = await axiosInstance.post('/medications/', medicationData);
            console.log('Medication created:', response.data);
            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Update an existing medication
    updateMedication: async (id, medicationData) => {
        try {
            console.log('Updating medication:', id, medicationData);
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            const response = await axiosInstance.put(`/medications/${id}/`, medicationData);
            console.log('Medication updated:', response.data);
            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Delete a medication
    deleteMedication: async (id) => {
        try {
            console.log('Deleting medication:', id);
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            const response = await axiosInstance.delete(`/medications/${id}/`);
            console.log('Medication deleted:', response.data);
            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

export default MedicationService;
