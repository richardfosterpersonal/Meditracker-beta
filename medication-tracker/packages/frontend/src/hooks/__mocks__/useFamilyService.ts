import { FamilyMember } from '../../types/family';

export const useFamilyService = () => {
  const mockFamilyMembers: FamilyMember[] = [
    {
      id: '1',
      name: 'John Doe',
      relationship: 'Parent',
      dateOfBirth: '1980-01-01',
      medications: [],
    },
  ];

  return {
    familyMembers: mockFamilyMembers,
    isLoading: false,
    error: null,
    addFamilyMember: jest.fn().mockResolvedValue({ success: true }),
    updateFamilyMember: jest.fn().mockResolvedValue({ success: true }),
    deleteFamilyMember: jest.fn().mockResolvedValue({ success: true }),
    refreshFamilyMembers: jest.fn(),
  };
};

export default useFamilyService;
