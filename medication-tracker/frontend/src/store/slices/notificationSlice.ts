import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import type { Notification } from '../services/notificationApi';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isNotificationsPanelOpen: boolean;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isNotificationsPanelOpen: false,
  serviceWorkerRegistration: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(
        (n) => n.status === 'UNREAD'
      ).length;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (action.payload.status === 'UNREAD') {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification && notification.status === 'UNREAD') {
        notification.status = 'READ';
        state.unreadCount -= 1;
      }
    },
    dismissNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(
        (n) => n.id === action.payload
      );
      if (index !== -1) {
        const notification = state.notifications[index];
        if (notification.status === 'UNREAD') {
          state.unreadCount -= 1;
        }
        state.notifications.splice(index, 1);
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    toggleNotificationsPanel: (state) => {
      state.isNotificationsPanelOpen = !state.isNotificationsPanelOpen;
    },
    setServiceWorkerRegistration: (
      state,
      action: PayloadAction<ServiceWorkerRegistration>
    ) => {
      state.serviceWorkerRegistration = action.payload;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  dismissNotification,
  clearAllNotifications,
  toggleNotificationsPanel,
  setServiceWorkerRegistration,
} = notificationSlice.actions;

export const selectNotifications = (state: RootState) =>
  state.notification.notifications;
export const selectUnreadCount = (state: RootState) =>
  state.notification.unreadCount;
export const selectIsNotificationsPanelOpen = (state: RootState) =>
  state.notification.isNotificationsPanelOpen;
export const selectServiceWorkerRegistration = (state: RootState) =>
  state.notification.serviceWorkerRegistration;

export default notificationSlice.reducer;
