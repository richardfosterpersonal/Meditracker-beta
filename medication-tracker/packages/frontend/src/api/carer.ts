import axiosInstance from '../services/axiosConfig';
import type { CarerAccess, UserProfile, Medication } from '../types';

export const carerApi = {
  getAssignedClients: async (): Promise<UserProfile[]> => {
    const response = await axiosInstance.get('/carer/clients');
    return response.data;
  },

  getClientAccess: async (clientId: string): Promise<CarerAccess> => {
    const response = await axiosInstance.get(`/carer/access/${clientId}`);
    return response.data;
  },

  requestAccess: async (clientId: string, permissions: CarerAccess['permissions']): Promise<CarerAccess> => {
    const response = await axiosInstance.post(`/carer/access/${clientId}/request`, { permissions });
    return response.data;
  },

  updateAccess: async (
    clientId: string,
    updates: Partial<CarerAccess['permissions']>
  ): Promise<CarerAccess> => {
    const response = await axiosInstance.put(`/carer/access/${clientId}`, updates);
    return response.data;
  },

  revokeAccess: async (clientId: string): Promise<void> => {
    await axiosInstance.delete(`/carer/access/${clientId}`);
  },

  getClientMedications: async (clientId: string): Promise<Medication[]> => {
    const response = await axiosInstance.get(`/carer/clients/${clientId}/medications`);
    return response.data;
  },
};
