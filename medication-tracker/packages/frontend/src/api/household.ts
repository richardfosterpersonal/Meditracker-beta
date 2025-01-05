import { api } from './api';
import type { Household, FamilyMember, Medication } from '../types';

export const householdApi = {
  getHousehold: async (): Promise<Household> => {
    const response = await api.get('/household');
    return response.data;
  },

  addFamilyMember: async (member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> => {
    const response = await api.post('/household/members', member);
    return response.data;
  },

  updateFamilyMember: async (memberId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> => {
    const response = await api.patch(`/household/members/${memberId}`, updates);
    return response.data;
  },

  removeFamilyMember: async (memberId: string): Promise<void> => {
    await api.delete(`/household/members/${memberId}`);
  },

  getMemberMedications: async (memberId: string): Promise<Medication[]> => {
    const response = await api.get(`/household/members/${memberId}/medications`);
    return response.data;
  },

  addMemberMedication: async (memberId: string, medication: Omit<Medication, 'id' | 'userId'>): Promise<Medication> => {
    const response = await api.post(`/household/members/${memberId}/medications`, medication);
    return response.data;
  },

  updateMemberMedication: async (
    memberId: string,
    medicationId: string,
    updates: Partial<Medication>
  ): Promise<Medication> => {
    const response = await api.patch(
      `/household/members/${memberId}/medications/${medicationId}`,
      updates
    );
    return response.data;
  },

  removeMemberMedication: async (memberId: string, medicationId: string): Promise<void> => {
    await api.delete(`/household/members/${memberId}/medications/${medicationId}`);
  },
};
