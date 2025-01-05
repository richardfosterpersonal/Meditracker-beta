/**
 * Notification Slice
 * Handles notification state management
 * Last Updated: 2025-01-03T22:35:35+01:00
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

export interface NotificationState {
  fcmToken: string | null;
  deviceId: string | null;
  platform: string;
  isPermissionGranted: boolean;
  notifications: any[];
  error: string | null;
}

const initialState: NotificationState = {
  fcmToken: null,
  deviceId: null,
  platform: 'web',
  isPermissionGranted: false,
  notifications: [],
  error: null,
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setFcmToken: (state, action: PayloadAction<string>) => {
      state.fcmToken = action.payload;
    },
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },
    setPlatform: (state, action: PayloadAction<string>) => {
      state.platform = action.payload;
    },
    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.isPermissionGranted = action.payload;
    },
    addNotification: (state, action: PayloadAction<any>) => {
      state.notifications.unshift(action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setFcmToken,
  setDeviceId,
  setPlatform,
  setPermissionGranted,
  addNotification,
  clearNotifications,
  setError,
} = notificationSlice.actions;

export const selectFcmToken = (state: RootState) => state.notification.fcmToken;
export const selectDeviceId = (state: RootState) => state.notification.deviceId;
export const selectPlatform = (state: RootState) => state.notification.platform;
export const selectIsPermissionGranted = (state: RootState) => state.notification.isPermissionGranted;
export const selectNotifications = (state: RootState) => state.notification.notifications;
export const selectError = (state: RootState) => state.notification.error;

export default notificationSlice.reducer;
