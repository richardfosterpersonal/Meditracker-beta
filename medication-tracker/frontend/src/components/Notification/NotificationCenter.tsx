import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Badge,
  Chip,
  Divider,
  Button,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  urgency: 'normal' | 'urgent';
  action_required: boolean;
  action_type?: string;
  action_data?: any;
}

export const NotificationCenter: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Initialize WebSocket connection
  const { lastMessage } = useWebSocket(`/api/v1/ws/notifications/${user?.id}`);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/v1/notifications', {
        params: { limit: 50 }
      });
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle real-time notifications
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'notification') {
          setNotifications(prev => [data.data, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.post(`/api/v1/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleAction = async (notification: Notification) => {
    if (!notification.action_type) return;

    try {
      switch (notification.action_type) {
        case 'take_medication':
          await api.post(`/api/v1/medications/${notification.action_data.medication_id}/doses`, {
            taken_at: new Date().toISOString()
          });
          break;
        case 'refill_medication':
          // Navigate to refill form
          break;
        default:
          console.warn('Unknown action type:', notification.action_type);
      }
      await handleMarkAsRead(notification.id);
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'medication_reminder':
        return <TimeIcon color={notification.urgency === 'urgent' ? 'error' : 'primary'} />;
      case 'medication_taken':
        return <CheckIcon color="success" />;
      case 'refill_alert':
        return <ErrorIcon color="warning" />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Badge badgeContent={unreadCount} color="error">
          <Typography variant="h6">Notifications</Typography>
        </Badge>
        {unreadCount > 0 && (
          <Button
            size="small"
            onClick={() => api.post('/api/v1/notifications/read-all')}
          >
            Mark all as read
          </Button>
        )}
      </Box>

      <List sx={{ maxHeight: '600px', overflow: 'auto' }}>
        {notifications.map((notification) => (
          <React.Fragment key={notification.id}>
            <ListItem
              alignItems="flex-start"
              sx={{
                bgcolor: notification.read ? 'transparent' : 'action.hover',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ListItemIcon>
                {getNotificationIcon(notification)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" component="span">
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {notification.message}
                    </Typography>
                    {notification.action_required && !notification.read && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAction(notification)}
                        sx={{ mt: 1 }}
                      >
                        {notification.action_type === 'take_medication' ? 'Mark as Taken' : 'Take Action'}
                      </Button>
                    )}
                    {notification.urgency === 'urgent' && (
                      <Chip
                        size="small"
                        label="Urgent"
                        color="error"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
              />
              {!notification.read && (
                <IconButton
                  size="small"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};
