import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { Medication } from '../../types/medication';

interface MedicationState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  selectedMedication: Medication | null;
}

const initialState: MedicationState = {
  medications: [],
  loading: false,
  error: null,
  selectedMedication: null,
};

export const medicationSlice = createSlice({
  name: 'medications',
  initialState,
  reducers: {
    setMedications: (state, action: PayloadAction<Medication[]>) => {
      state.medications = action.payload;
      state.loading = false;
      state.error = null;
    },
    addMedication: (state, action: PayloadAction<Medication>) => {
      state.medications.push(action.payload);
    },
    updateMedication: (state, action: PayloadAction<Medication>) => {
      const index = state.medications.findIndex(med => med.id === action.payload.id);
      if (index !== -1) {
        state.medications[index] = action.payload;
      }
    },
    deleteMedication: (state, action: PayloadAction<string>) => {
      state.medications = state.medications.filter(med => med.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    selectMedication: (state, action: PayloadAction<string>) => {
      state.selectedMedication = state.medications.find(med => med.id === action.payload) || null;
    },
    clearSelectedMedication: (state) => {
      state.selectedMedication = null;
    },
  },
});

export const {
  setMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  setLoading,
  setError,
  selectMedication,
  clearSelectedMedication,
} = medicationSlice.actions;

// Selectors
export const selectAllMedications = (state: RootState) => state.medications.medications;
export const selectMedicationById = (state: RootState, id: string) =>
  state.medications.medications.find(med => med.id === id);
export const selectMedicationLoading = (state: RootState) => state.medications.loading;
export const selectMedicationError = (state: RootState) => state.medications.error;
export const selectSelectedMedication = (state: RootState) => state.medications.selectedMedication;

export default medicationSlice.reducer;
