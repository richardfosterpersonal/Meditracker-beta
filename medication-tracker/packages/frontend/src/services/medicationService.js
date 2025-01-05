import axios from './axiosConfig';

const MEDICATIONS_URL = '/medications';

export const medicationService = {
    getAllMedications: async () => {
        try {
            const response = await axios.get(MEDICATIONS_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching medications:', error);
            throw error;
        }
    },

    getMedicationById: async (id) => {
        try {
            const response = await axios.get(`${MEDICATIONS_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching medication ${id}:`, error);
            throw error;
        }
    },

    createMedication: async (medicationData) => {
        try {
            const response = await axios.post(MEDICATIONS_URL, medicationData);
            return response.data;
        } catch (error) {
            console.error('Error creating medication:', error);
            throw error;
        }
    },

    updateMedication: async (id, medicationData) => {
        try {
            const response = await axios.put(`${MEDICATIONS_URL}/${id}`, medicationData);
            return response.data;
        } catch (error) {
            console.error(`Error updating medication ${id}:`, error);
            throw error;
        }
    },

    deleteMedication: async (id) => {
        try {
            await axios.delete(`${MEDICATIONS_URL}/${id}`);
            return true;
        } catch (error) {
            console.error(`Error deleting medication ${id}:`, error);
            throw error;
        }
    },

    getMedicationsByFamilyMember: async (familyMemberId) => {
        try {
            const response = await axios.get(`${MEDICATIONS_URL}/family-member/${familyMemberId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching medications for family member ${familyMemberId}:`, error);
            throw error;
        }
    }
};
