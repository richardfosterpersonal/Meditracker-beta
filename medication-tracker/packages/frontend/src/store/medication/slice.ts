import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Medication, MedicationLog, ValidationError } from '../../../../shared/types';
import { MedicationApi } from '../../services/api/medication';

interface MedicationState {
  items: Record<string, Medication>;
  logs: Record<string, MedicationLog[]>;
  loading: {
    items: boolean;
    logs: boolean;
    operations: boolean;
  };
  error: ValidationError | null;
  selectedMedicationId: string | null;
}

const initialState: MedicationState = {
  items: {},
  logs: {},
  loading: {
    items: false,
    logs: false,
    operations: false,
  },
  error: null,
  selectedMedicationId: null,
};

const medicationApi = new MedicationApi();

// Async thunks
export const fetchMedications = createAsyncThunk(
  'medication/fetchMedications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await medicationApi.getMedications();
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchMedicationLogs = createAsyncThunk(
  'medication/fetchMedicationLogs',
  async (medicationId: string, { rejectWithValue }) => {
    try {
      const response = await medicationApi.getMedicationLogs(medicationId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { medicationId, logs: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createMedication = createAsyncThunk(
  'medication/createMedication',
  async (data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const response = await medicationApi.createMedication(data);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateMedication = createAsyncThunk(
  'medication/updateMedication',
  async ({ id, data }: { id: string; data: Partial<Omit<Medication, 'id'>> }, { rejectWithValue }) => {
    try {
      const response = await medicationApi.updateMedication(id, data);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteMedication = createAsyncThunk(
  'medication/deleteMedication',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await medicationApi.deleteMedication(id);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return id;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Slice
export const medicationSlice = createSlice({
  name: 'medication',
  initialState,
  reducers: {
    setSelectedMedication: (state, action: PayloadAction<string | null>) => {
      state.selectedMedicationId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch medications
      .addCase(fetchMedications.pending, (state) => {
        state.loading.items = true;
        state.error = null;
      })
      .addCase(fetchMedications.fulfilled, (state, action) => {
        state.loading.items = false;
        state.items = action.payload?.reduce((acc, medication) => {
          acc[medication.id] = medication;
          return acc;
        }, {} as Record<string, Medication>) ?? {};
      })
      .addCase(fetchMedications.rejected, (state, action) => {
        state.loading.items = false;
        state.error = action.payload as ValidationError;
      })
      // Fetch medication logs
      .addCase(fetchMedicationLogs.pending, (state) => {
        state.loading.logs = true;
      })
      .addCase(fetchMedicationLogs.fulfilled, (state, action) => {
        state.loading.logs = false;
        if (action.payload) {
          state.logs[action.payload.medicationId] = action.payload.logs ?? [];
        }
      })
      .addCase(fetchMedicationLogs.rejected, (state, action) => {
        state.loading.logs = false;
        state.error = action.payload as ValidationError;
      })
      // Create medication
      .addCase(createMedication.pending, (state) => {
        state.loading.operations = true;
      })
      .addCase(createMedication.fulfilled, (state, action) => {
        state.loading.operations = false;
        if (action.payload) {
          state.items[action.payload.id] = action.payload;
        }
      })
      .addCase(createMedication.rejected, (state, action) => {
        state.loading.operations = false;
        state.error = action.payload as ValidationError;
      })
      // Update medication
      .addCase(updateMedication.pending, (state) => {
        state.loading.operations = true;
      })
      .addCase(updateMedication.fulfilled, (state, action) => {
        state.loading.operations = false;
        if (action.payload) {
          state.items[action.payload.id] = action.payload;
        }
      })
      .addCase(updateMedication.rejected, (state, action) => {
        state.loading.operations = false;
        state.error = action.payload as ValidationError;
      })
      // Delete medication
      .addCase(deleteMedication.pending, (state) => {
        state.loading.operations = true;
      })
      .addCase(deleteMedication.fulfilled, (state, action) => {
        state.loading.operations = false;
        if (action.payload) {
          delete state.items[action.payload];
          delete state.logs[action.payload];
        }
      })
      .addCase(deleteMedication.rejected, (state, action) => {
        state.loading.operations = false;
        state.error = action.payload as ValidationError;
      });
  },
});

export const { setSelectedMedication, clearError } = medicationSlice.actions;
export default medicationSlice.reducer;
