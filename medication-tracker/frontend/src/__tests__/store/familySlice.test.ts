import { configureStore } from '@reduxjs/toolkit';
import familyReducer, {
  fetchFamilyMembers,
  inviteFamilyMember,
  updateFamilyMemberPermissions,
  removeFamilyMember,
} from '../../store/slices/familySlice';
import { api } from '../../services/api';
import { mockFamilyMembers } from '../__mocks__/familyData';

// Mock API calls
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Family Slice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        family: familyReducer,
      },
    });
  });

  describe('fetchFamilyMembers', () => {
    it('should fetch family members successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockFamilyMembers });

      await store.dispatch(fetchFamilyMembers());
      const state = store.getState().family;

      expect(state.members).toEqual(mockFamilyMembers);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch family members';
      mockedApi.get.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      await store.dispatch(fetchFamilyMembers());
      const state = store.getState().family;

      expect(state.members).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('inviteFamilyMember', () => {
    const newMember = {
      email: 'test@example.com',
      name: 'Test User',
      relationship: 'CHILD',
    };

    it('should invite family member successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ 
        data: { ...newMember, id: '123', status: 'PENDING' }
      });

      await store.dispatch(inviteFamilyMember(newMember));
      const state = store.getState().family;

      expect(state.inviteStatus).toBe('success');
      expect(state.members).toHaveLength(1);
      expect(state.members[0]).toMatchObject(newMember);
    });

    it('should handle invitation error', async () => {
      const errorMessage = 'Email already exists';
      mockedApi.post.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      await store.dispatch(inviteFamilyMember(newMember));
      const state = store.getState().family;

      expect(state.inviteStatus).toBe('error');
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('updateFamilyMemberPermissions', () => {
    const updateData = {
      memberId: '123',
      permissions: {
        canViewMedications: true,
        canEditMedications: false,
      },
    };

    it('should update permissions successfully', async () => {
      mockedApi.patch.mockResolvedValueOnce({ 
        data: { ...updateData.permissions, familyMemberId: updateData.memberId }
      });

      // First add a member to update
      store = configureStore({
        reducer: {
          family: familyReducer,
        },
        preloadedState: {
          family: {
            members: [{ id: '123', name: 'Test', permissions: {} }],
          },
        },
      });

      await store.dispatch(updateFamilyMemberPermissions(updateData));
      const state = store.getState().family;

      expect(state.members[0].permissions).toMatchObject(updateData.permissions);
      expect(state.error).toBeNull();
    });

    it('should handle update error', async () => {
      const errorMessage = 'Permission denied';
      mockedApi.patch.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      await store.dispatch(updateFamilyMemberPermissions(updateData));
      const state = store.getState().family;

      expect(state.error).toBe(errorMessage);
    });
  });

  describe('removeFamilyMember', () => {
    const memberId = '123';

    it('should remove family member successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({});

      // Add a member to remove
      store = configureStore({
        reducer: {
          family: familyReducer,
        },
        preloadedState: {
          family: {
            members: [{ id: memberId, name: 'Test' }],
          },
        },
      });

      await store.dispatch(removeFamilyMember(memberId));
      const state = store.getState().family;

      expect(state.members).toHaveLength(0);
      expect(state.error).toBeNull();
    });

    it('should handle removal error', async () => {
      const errorMessage = 'Cannot remove member';
      mockedApi.delete.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      await store.dispatch(removeFamilyMember(memberId));
      const state = store.getState().family;

      expect(state.error).toBe(errorMessage);
    });
  });
});
