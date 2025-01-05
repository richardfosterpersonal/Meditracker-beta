import axios from './axiosConfig';

const FAMILY_MEMBERS_URL = '/family-members';

export const familyMemberService = {
    getAllFamilyMembers: async () => {
        try {
            const response = await axios.get(FAMILY_MEMBERS_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching family members:', error);
            throw error;
        }
    },

    getFamilyMemberById: async (id) => {
        try {
            const response = await axios.get(`${FAMILY_MEMBERS_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching family member ${id}:`, error);
            throw error;
        }
    },

    createFamilyMember: async (familyMemberData) => {
        try {
            const response = await axios.post(FAMILY_MEMBERS_URL, familyMemberData);
            return response.data;
        } catch (error) {
            console.error('Error creating family member:', error);
            throw error;
        }
    },

    updateFamilyMember: async (id, familyMemberData) => {
        try {
            const response = await axios.put(`${FAMILY_MEMBERS_URL}/${id}`, familyMemberData);
            return response.data;
        } catch (error) {
            console.error(`Error updating family member ${id}:`, error);
            throw error;
        }
    },

    deleteFamilyMember: async (id) => {
        try {
            await axios.delete(`${FAMILY_MEMBERS_URL}/${id}`);
            return true;
        } catch (error) {
            console.error(`Error deleting family member ${id}:`, error);
            throw error;
        }
    },

    getFamilyMemberMedications: async (id) => {
        try {
            const response = await axios.get(`${FAMILY_MEMBERS_URL}/${id}/medications`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching medications for family member ${id}:`, error);
            throw error;
        }
    }
};
