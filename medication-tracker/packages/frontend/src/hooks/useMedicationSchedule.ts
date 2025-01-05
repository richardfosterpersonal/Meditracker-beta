import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectTodaysMedications,
  selectMedicationLoading,
  selectMedicationError
} from '../store/medication/selectors';
import {
  fetchMedications,
  updateMedication,
  createMedication,
  deleteMedication
} from '../store/medication/slice';
import { Medication, Schedule } from '../../../shared/types';
import { validateSchedule } from '../../../shared/validation/schemas';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';

interface UseMedicationScheduleReturn {
  medications: Medication[];
  loading: boolean;
  error: Error | null;
  markMedicationTaken: (id: string) => Promise<void>;
  addMedicationSchedule: (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeMedicationSchedule: (id: string) => Promise<void>;
  updateMedicationSchedule: (id: string, schedule: Schedule) => Promise<void>;
}

export function useMedicationSchedule(): UseMedicationScheduleReturn {
  const dispatch = useDispatch();
  const medications = useSelector(selectTodaysMedications);
  const loading = useSelector(selectMedicationLoading);
  const error = useSelector(selectMedicationError);
  const { showNotification } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    dispatch(fetchMedications());
  }, [dispatch]);

  const markMedicationTaken = async (id: string) => {
    try {
      const medication = medications.find(m => m.id === id);
      if (!medication) throw new Error('Medication not found');

      await dispatch(updateMedication({
        id,
        data: {
          lastTaken: new Date().toISOString()
        }
      })).unwrap();

      showNotification({
        type: 'success',
        message: `Marked ${medication.name} as taken`
      });
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to mark medication as taken: ${err.message}`
      });
      throw err;
    }
  };

  const addMedicationSchedule = async (medicationData: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Validate schedule data
      validateSchedule(medicationData.schedule);

      const result = await dispatch(createMedication({
        ...medicationData,
        userId: user?.id
      })).unwrap();

      showNotification({
        type: 'success',
        message: `Added schedule for ${result.name}`
      });

      return result;
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to add medication schedule: ${err.message}`
      });
      throw err;
    }
  };

  const removeMedicationSchedule = async (id: string) => {
    try {
      const medication = medications.find(m => m.id === id);
      if (!medication) throw new Error('Medication not found');

      await dispatch(deleteMedication(id)).unwrap();

      showNotification({
        type: 'success',
        message: `Removed schedule for ${medication.name}`
      });
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to remove medication schedule: ${err.message}`
      });
      throw err;
    }
  };

  const updateMedicationSchedule = async (id: string, schedule: Schedule) => {
    try {
      // Validate schedule data
      validateSchedule(schedule);

      const medication = medications.find(m => m.id === id);
      if (!medication) throw new Error('Medication not found');

      await dispatch(updateMedication({
        id,
        data: { schedule }
      })).unwrap();

      showNotification({
        type: 'success',
        message: `Updated schedule for ${medication.name}`
      });
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to update medication schedule: ${err.message}`
      });
      throw err;
    }
  };

  return {
    medications,
    loading,
    error,
    markMedicationTaken,
    addMedicationSchedule,
    removeMedicationSchedule,
    updateMedicationSchedule,
  };
}
