import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import useOfflineStatus from './useOfflineStatus';
import { offlineStorage } from '../utils/offlineStorage';
import { backgroundSync } from '../utils/backgroundSync';

interface RequestOptions extends AxiosRequestConfig {
  offlineSupport?: boolean;
  syncOperation?: 'MEDICATION_LOG' | 'MEDICATION_UPDATE' | 'DOSE_LOG';
}

interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useOfflineAwareRequest<T>() {
  const { isOffline } = useOfflineStatus();
  const [state, setState] = useState<RequestState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(
    async (url: string, options: RequestOptions = {}): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        if (isOffline && options.offlineSupport) {
          // Handle offline scenario
          const offlineId = uuidv4();
          const offlineData = {
            id: offlineId,
            ...options.data,
            status: 'pending',
          };

          // Store data offline
          if (options.syncOperation === 'DOSE_LOG') {
            await offlineStorage.saveDose(offlineData);
          } else {
            await offlineStorage.saveMedication(offlineData);
          }

          // Add to sync queue
          await backgroundSync.addToSyncQueue({
            type: options.syncOperation!,
            data: offlineData,
          });

          setState({
            data: offlineData as T,
            loading: false,
            error: null,
          });

          toast.success('Saved offline. Will sync when back online.');
          return offlineData as T;
        }

        // Online scenario
        const response = await axios(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        setState({
          data: response.data,
          loading: false,
          error: null,
        });

        return response.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setState({
          data: null,
          loading: false,
          error: new Error(errorMessage),
        });

        if (!isOffline) {
          toast.error(`Request failed: ${errorMessage}`);
        }

        throw error;
      }
    },
    [isOffline]
  );

  return {
    ...state,
    request,
  };
}

export default useOfflineAwareRequest;
