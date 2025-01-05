import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../utils/notifications';

interface NotificationSettings {
  medicationReminders: boolean;
  refillAlerts: boolean;
  appointmentReminders: boolean;
  dailySummary: boolean;
}

interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
  settings: NotificationSettings;
  loading: boolean;
  error: string | null;
}

export const useNotificationSettings = () => {
  const [state, setState] = useState<NotificationPermissionState>({
    permission: 'default',
    supported: 'Notification' in window,
    settings: {
      medicationReminders: true,
      refillAlerts: true,
      appointmentReminders: true,
      dailySummary: false,
    },
    loading: true,
    error: null,
  });

  const loadSettings = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Load settings from backend or local storage
      const storedSettings = localStorage.getItem('notificationSettings');
      const settings = storedSettings
        ? JSON.parse(storedSettings)
        : state.settings;

      setState(prev => ({
        ...prev,
        settings,
        permission: Notification.permission,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load notification settings',
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const requestPermission = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (!state.supported) {
        throw new Error('Notifications are not supported in this browser');
      }

      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission, loading: false }));
      
      return permission;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to request notification permission',
        loading: false,
      }));
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const updatedSettings = {
        ...state.settings,
        ...newSettings,
      };

      // Save to backend
      await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      // Update local storage
      localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));

      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update notification settings',
        loading: false,
      }));
      throw error;
    }
  };

  const scheduleNotification = async (
    title: string,
    body: string,
    scheduledTime: Date,
    data?: any
  ) => {
    try {
      if (state.permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      await notificationService.scheduleNotification(
        {
          title,
          body,
          data,
        },
        scheduledTime
      );
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  };

  return {
    ...state,
    requestPermission,
    updateSettings,
    scheduleNotification,
    reloadSettings: loadSettings,
  };
};

export default useNotificationSettings;
