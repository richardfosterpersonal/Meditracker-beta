import { useState, useEffect } from 'react';
import { offlineService } from '../services/OfflineService';
import { useSubscription } from 'use-subscription';

interface UseOfflineReturn {
  isOffline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  saveMedication: (medication: any) => Promise<void>;
  saveSchedule: (medicationId: string, schedule: any) => Promise<void>;
  saveAdherence: (medicationId: string, adherence: any) => Promise<void>;
  saveEmergencyNotification: (data: any) => Promise<void>;
  getCachedMedication: (id: string) => Promise<any>;
  getCachedMedications: () => Promise<any[]>;
  getCachedEmergencyContacts: () => Promise<any[]>;
}

export const useOffline = (): UseOfflineReturn => {
  // Subscribe to offline service observables
  const isOffline = useSubscription({
    getCurrentValue: () => !offlineService.isOnline$.value,
    subscribe: callback => {
      const subscription = offlineService.isOnline$.subscribe(
        online => callback(!online)
      );
      return () => subscription.unsubscribe();
    },
  });

  const isSyncing = useSubscription({
    getCurrentValue: () => offlineService.syncInProgress$.value,
    subscribe: callback => {
      const subscription = offlineService.syncInProgress$.subscribe(callback);
      return () => subscription.unsubscribe();
    },
  });

  const pendingChanges = useSubscription({
    getCurrentValue: () => offlineService.pendingChanges$.value,
    subscribe: callback => {
      const subscription = offlineService.pendingChanges$.subscribe(callback);
      return () => subscription.unsubscribe();
    },
  });

  const saveMedication = async (medication: any) => {
    await offlineService.cacheMedication(medication);
    await offlineService.queueChange('medication', medication);
  };

  const saveSchedule = async (medicationId: string, schedule: any) => {
    await offlineService.queueChange('schedule', {
      medicationId,
      schedule,
    });
  };

  const saveAdherence = async (medicationId: string, adherence: any) => {
    await offlineService.queueChange('adherence', {
      medicationId,
      adherence,
    });
  };

  const saveEmergencyNotification = async (data: any) => {
    await offlineService.queueChange('emergency', data);
  };

  const getCachedMedication = async (id: string) => {
    return await offlineService.getCachedMedication(id);
  };

  const getCachedMedications = async () => {
    return await offlineService.getAllCachedMedications();
  };

  const getCachedEmergencyContacts = async () => {
    return await offlineService.getCachedEmergencyContacts();
  };

  return {
    isOffline,
    isSyncing,
    pendingChanges,
    saveMedication,
    saveSchedule,
    saveAdherence,
    saveEmergencyNotification,
    getCachedMedication,
    getCachedMedications,
    getCachedEmergencyContacts,
  };
};
