import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  familyMembers: [],
  selectedMember: null,
  loading: false,
  error: null
};

export const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    setFamilyMembers: (state, action) => {
      state.familyMembers = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelectedMember: (state, action) => {
      state.selectedMember = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    addFamilyMember: (state, action) => {
      state.familyMembers.push(action.payload);
    },
    updateFamilyMember: (state, action) => {
      const index = state.familyMembers.findIndex(member => member.id === action.payload.id);
      if (index !== -1) {
        state.familyMembers[index] = action.payload;
      }
    },
    removeFamilyMember: (state, action) => {
      state.familyMembers = state.familyMembers.filter(member => member.id !== action.payload);
      if (state.selectedMember?.id === action.payload) {
        state.selectedMember = null;
      }
    }
  }
});

export const {
  setFamilyMembers,
  setSelectedMember,
  setLoading,
  setError,
  addFamilyMember,
  updateFamilyMember,
  removeFamilyMember
} = familySlice.actions;

export default familySlice.reducer;
