import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

export interface Notification {
  id: string;
  type: 'MEDICATION_REMINDER' | 'REFILL_REMINDER' | 'FAMILY_UPDATE' | 'SYSTEM';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  metadata?: {
    medicationId?: string;
    familyMemberId?: string;
    actionUrl?: string;
  };
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  reminderTiming: {
    beforeMinutes: number;
    repeatInterval?: number;
  };
  notificationTypes: {
    medicationReminders: boolean;
    refillReminders: boolean;
    familyUpdates: boolean;
    systemNotifications: boolean;
  };
  quietHours: {
    enabled: boolean;
    start?: string;
    end?: string;
  };
  updatedAt: string;
}

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.REACT_APP_API_URL}/notifications`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Notification', 'NotificationPreferences'],
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => '/',
      providesTags: ['Notification'],
    }),

    getUnreadNotifications: builder.query<Notification[], void>({
      query: () => '/unread',
      providesTags: ['Notification'],
    }),

    markNotificationAsRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),

    dismissNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}/dismiss`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),

    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => '/preferences',
      providesTags: ['NotificationPreferences'],
    }),

    updateNotificationPreferences: builder.mutation<
      NotificationPreferences,
      Partial<NotificationPreferences>
    >({
      query: (preferences) => ({
        url: '/preferences',
        method: 'PATCH',
        body: preferences,
      }),
      invalidatesTags: ['NotificationPreferences'],
    }),

    registerPushNotifications: builder.mutation<
      { success: boolean },
      { subscription: PushSubscription }
    >({
      query: (data) => ({
        url: '/push/register',
        method: 'POST',
        body: data,
      }),
    }),

    unregisterPushNotifications: builder.mutation<void, void>({
      query: () => ({
        url: '/push/unregister',
        method: 'DELETE',
      }),
    }),

    scheduleNotification: builder.mutation<
      Notification,
      Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'status'>
    >({
      query: (notification) => ({
        url: '/schedule',
        method: 'POST',
        body: notification,
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useDismissNotificationMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useRegisterPushNotificationsMutation,
  useUnregisterPushNotificationsMutation,
  useScheduleNotificationMutation,
} = notificationApi;
