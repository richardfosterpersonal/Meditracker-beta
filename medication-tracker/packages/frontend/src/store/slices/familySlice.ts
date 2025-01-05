import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FamilyMember, FamilyPermissions } from '../../types/family';
import { api } from '../../services/api';
import { trackEvent } from '../../utils/analytics';

interface FamilyState {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  loading: boolean;
  error: string | null;
  inviteStatus: 'idle' | 'loading' | 'success' | 'error';
  canAddMembers: boolean;
}

const initialState: FamilyState = {
  members: [],
  selectedMember: null,
  loading: false,
  error: null,
  inviteStatus: 'idle',
  canAddMembers: false,
};

// Async thunks
export const fetchFamilyMembers = createAsyncThunk(
  'family/fetchMembers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/family/members');
      trackEvent('family_members_fetched', {
        memberCount: response.data.length,
      });
      return response.data;
    } catch (error: any) {
      trackEvent('family_members_fetch_error', {
        error: error.message,
      });
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch family members');
    }
  }
);

export const inviteFamilyMember = createAsyncThunk(
  'family/inviteMember',
  async (data: {
    email: string;
    name: string;
    relationship: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/family/invite', data);
      trackEvent('family_member_invited', {
        relationship: data.relationship,
      });
      return response.data;
    } catch (error: any) {
      trackEvent('family_member_invite_error', {
        error: error.message,
        email: data.email,
      });
      return rejectWithValue(error.response?.data?.message || 'Failed to invite family member');
    }
  }
);

export const updateFamilyMemberPermissions = createAsyncThunk(
  'family/updatePermissions',
  async (data: {
    memberId: string;
    permissions: FamilyPermissions;
  }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/family/members/${data.memberId}/permissions`, {
        permissions: data.permissions,
      });
      trackEvent('family_permissions_updated', {
        memberId: data.memberId,
        permissions: Object.keys(data.permissions).filter(key => data.permissions[key]),
      });
      return response.data;
    } catch (error: any) {
      trackEvent('family_permissions_update_error', {
        error: error.message,
        memberId: data.memberId,
      });
      return rejectWithValue(error.response?.data?.message || 'Failed to update permissions');
    }
  }
);

export const removeFamilyMember = createAsyncThunk(
  'family/removeMember',
  async (memberId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/family/members/${memberId}`);
      trackEvent('family_member_removed', {
        memberId,
      });
      return memberId;
    } catch (error: any) {
      trackEvent('family_member_remove_error', {
        error: error.message,
        memberId,
      });
      return rejectWithValue(error.response?.data?.message || 'Failed to remove family member');
    }
  }
);

export const validateFamilyAddition = createAsyncThunk(
  'family/validateAddition',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/family/validate-addition');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to validate family addition');
    }
  }
);

const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    selectMember: (state, action) => {
      state.selectedMember = action.payload;
    },
    clearInviteStatus: (state) => {
      state.inviteStatus = 'idle';
    },
    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch family members
      .addCase(fetchFamilyMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFamilyMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload;
      })
      .addCase(fetchFamilyMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Invite family member
      .addCase(inviteFamilyMember.pending, (state) => {
        state.inviteStatus = 'loading';
        state.error = null;
      })
      .addCase(inviteFamilyMember.fulfilled, (state, action) => {
        state.inviteStatus = 'success';
        state.members.push(action.payload);
      })
      .addCase(inviteFamilyMember.rejected, (state, action) => {
        state.inviteStatus = 'error';
        state.error = action.payload as string;
      })

      // Update permissions
      .addCase(updateFamilyMemberPermissions.fulfilled, (state, action) => {
        const index = state.members.findIndex(m => m.id === action.payload.familyMemberId);
        if (index !== -1) {
          state.members[index].permissions = action.payload;
        }
      })

      // Remove family member
      .addCase(removeFamilyMember.fulfilled, (state, action) => {
        state.members = state.members.filter(m => m.id !== action.payload);
        if (state.selectedMember?.id === action.payload) {
          state.selectedMember = null;
        }
      })

      // Validate addition
      .addCase(validateFamilyAddition.fulfilled, (state, action) => {
        state.canAddMembers = action.payload.canAdd;
      });
  },
});

export const { selectMember, clearInviteStatus, resetError } = familySlice.actions;

// Selectors
export const selectSelectedMember = (state: RootState) => state.family.selectedMember;
export const selectMembers = (state: RootState) => state.family.members;
export const selectFamilyLoading = (state: RootState) => state.family.loading;
export const selectFamilyError = (state: RootState) => state.family.error;

export default familySlice.reducer;
