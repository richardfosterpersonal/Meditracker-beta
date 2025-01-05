import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../types';
import { Medication, MedicationLog } from '../../../../shared/types';

// Basic selectors
export const selectMedicationState = (state: RootState) => state.medication;
export const selectMedicationItems = (state: RootState) => state.medication.items;
export const selectMedicationLogs = (state: RootState) => state.medication.logs;
export const selectMedicationLoading = (state: RootState) => state.medication.loading;
export const selectMedicationError = (state: RootState) => state.medication.error;
export const selectSelectedMedicationId = (state: RootState) => state.medication.selectedMedicationId;

// Derived selectors
export const selectAllMedications = createSelector(
  selectMedicationItems,
  (items): Medication[] => Object.values(items)
);

export const selectMedicationById = createSelector(
  [selectMedicationItems, (_state: RootState, id: string) => id],
  (items, id): Medication | undefined => items[id]
);

export const selectSelectedMedication = createSelector(
  [selectMedicationItems, selectSelectedMedicationId],
  (items, selectedId): Medication | undefined => 
    selectedId ? items[selectedId] : undefined
);

export const selectMedicationLogsByMedicationId = createSelector(
  [selectMedicationLogs, (_state: RootState, medicationId: string) => medicationId],
  (logs, medicationId): MedicationLog[] => logs[medicationId] || []
);

export const selectMedicationsNeedingRefill = createSelector(
  selectAllMedications,
  (medications): Medication[] =>
    medications.filter(med => {
      if (!med.supply) return false;
      return med.supply.currentQuantity <= med.supply.reorderPoint;
    })
);

export const selectMedicationsByScheduleType = createSelector(
  [selectAllMedications, (_state: RootState, scheduleType: string) => scheduleType],
  (medications, scheduleType): Medication[] =>
    medications.filter(med => med.schedule.type === scheduleType)
);

export const selectTodaysMedications = createSelector(
  selectAllMedications,
  (medications): Medication[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();

    return medications.filter(med => {
      const schedule = med.schedule;
      
      // Check if medication is active (within start/end dates)
      const startDate = new Date(schedule.startDate);
      if (startDate > today) return false;
      
      if (schedule.endDate) {
        const endDate = new Date(schedule.endDate);
        if (endDate < today) return false;
      }

      switch (schedule.type) {
        case 'daily':
          return true;
        case 'weekly':
          return schedule.days?.includes(dayOfWeek) ?? false;
        case 'monthly':
          return schedule.days?.includes(dayOfMonth) ?? false;
        case 'custom':
          if (!schedule.interval) return false;
          const startDate = new Date(schedule.startDate);
          const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays % schedule.interval === 0;
        default:
          return false;
      }
    });
  }
);

export const selectMedicationStats = createSelector(
  [selectAllMedications, selectMedicationLogs],
  (medications, logs): {
    total: number;
    active: number;
    adherenceRate: number;
    refillNeeded: number;
  } => {
    const today = new Date();
    const active = medications.filter(med => {
      const startDate = new Date(med.schedule.startDate);
      if (startDate > today) return false;
      if (med.schedule.endDate) {
        const endDate = new Date(med.schedule.endDate);
        if (endDate < today) return false;
      }
      return true;
    });

    const refillNeeded = medications.filter(med => 
      med.supply && med.supply.currentQuantity <= med.supply.reorderPoint
    );

    // Calculate adherence rate for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalScheduled = 0;
    let totalTaken = 0;

    Object.values(logs).forEach(medicationLogs => {
      medicationLogs.forEach(log => {
        const logDate = new Date(log.timestamp);
        if (logDate >= thirtyDaysAgo) {
          totalScheduled++;
          if (log.action === 'taken') {
            totalTaken++;
          }
        }
      });
    });

    const adherenceRate = totalScheduled > 0 
      ? (totalTaken / totalScheduled) * 100 
      : 100;

    return {
      total: medications.length,
      active: active.length,
      adherenceRate,
      refillNeeded: refillNeeded.length,
    };
  }
);
