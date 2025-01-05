import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectNotifications,
  selectNotificationLoading,
  selectNotificationError,
  selectUnreadCount
} from '../store/notification/selectors';
import {
  fetchNotifications,
  sendNotification as sendNotificationAction,
  markAsRead as markAsReadAction,
  updatePreferences as updatePreferencesAction
} from '../store/notification/slice';
import { useAuth } from './useAuth';
import { 
  Notification,
  NotificationPreferences,
  ValidationError 
} from '../../../shared/types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: ValidationError | null;
  showNotification: (notification: { type: 'success' | 'error' | 'info' | 'warning'; message: string }) => void;
  sendNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationLoading);
  const error = useSelector(selectNotificationError);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, user]);

  const showNotification = (notification: { type: 'success' | 'error' | 'info' | 'warning'; message: string }) => {
    const priority = notification.type === 'error' ? 'HIGH' : 
                    notification.type === 'warning' ? 'MEDIUM' : 'LOW';

    dispatch(sendNotificationAction({
      type: 'SYSTEM',
      priority,
      message: notification.message,
      data: { uiNotification: true }
    }));
  };

  const sendNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      await dispatch(sendNotificationAction(notification)).unwrap();
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to send notification: ${err.message}`
      });
      throw err;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await dispatch(markAsReadAction(id)).unwrap();
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to mark notification as read: ${err.message}`
      });
      throw err;
    }
  };

  const updatePreferences = async (preferences: Partial<NotificationPreferences>) => {
    try {
      await dispatch(updatePreferencesAction(preferences)).unwrap();
      showNotification({
        type: 'success',
        message: 'Notification preferences updated successfully'
      });
    } catch (err) {
      showNotification({
        type: 'error',
        message: `Failed to update notification preferences: ${err.message}`
      });
      throw err;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    showNotification,
    sendNotification,
    markAsRead,
    updatePreferences,
  };
}
