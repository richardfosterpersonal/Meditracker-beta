import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectAllMedications,
  selectMedicationById,
  selectMedicationLoading,
  selectMedicationError,
  selectSelectedMedication,
  selectMedication,
  clearSelectedMedication,
} from '../store/slices/medicationSlice';
import {
  useGetMedicationsQuery,
  useAddMedicationMutation,
  useUpdateMedicationMutation,
  useDeleteMedicationMutation,
  useUpdateMedicationComplianceMutation,
} from '../store/services/medicationApi';
import type { Medication } from '../store/slices/medicationSlice';

export const useMedication = () => {
  const dispatch = useDispatch();
  
  // RTK Query hooks
  const { data: medications = [], refetch } = useGetMedicationsQuery();
  const [addMedication] = useAddMedicationMutation();
  const [updateMedication] = useUpdateMedicationMutation();
  const [deleteMedication] = useDeleteMedicationMutation();
  const [updateCompliance] = useUpdateMedicationComplianceMutation();

  // Redux selectors
  const allMedications = useSelector(selectAllMedications);
  const loading = useSelector(selectMedicationLoading);
  const error = useSelector(selectMedicationError);
  const selectedMedication = useSelector(selectSelectedMedication);

  // Memoized selectors
  const getMedicationById = useCallback(
    (id: string) => useSelector((state) => selectMedicationById(state, id)),
    []
  );

  // Actions
  const selectMedicationById = useCallback(
    (id: string) => dispatch(selectMedication(id)),
    [dispatch]
  );

  const clearSelection = useCallback(
    () => dispatch(clearSelectedMedication()),
    [dispatch]
  );

  const handleAddMedication = async (medication: Partial<Medication>) => {
    try {
      await addMedication(medication).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to add medication:', error);
      return false;
    }
  };

  const handleUpdateMedication = async (id: string, medication: Partial<Medication>) => {
    try {
      await updateMedication({ id, medication }).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to update medication:', error);
      return false;
    }
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      await deleteMedication(id).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to delete medication:', error);
      return false;
    }
  };

  const handleUpdateCompliance = async (id: string, taken: boolean, timestamp?: string) => {
    try {
      await updateCompliance({ id, taken, timestamp }).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to update compliance:', error);
      return false;
    }
  };

  return {
    // Data
    medications,
    selectedMedication,
    loading,
    error,

    // Selectors
    getMedicationById,

    // Actions
    selectMedicationById,
    clearSelection,
    refetchMedications: refetch,

    // API Operations
    addMedication: handleAddMedication,
    updateMedication: handleUpdateMedication,
    deleteMedication: handleDeleteMedication,
    updateCompliance: handleUpdateCompliance,
  };
};

export default useMedication;
