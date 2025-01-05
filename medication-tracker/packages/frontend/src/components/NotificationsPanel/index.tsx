import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  Button,
  Divider,
  useTheme,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import {
  selectNotifications,
  selectUnreadCount,
  selectIsNotificationsPanelOpen,
  toggleNotificationsPanel,
} from '../../store/slices/notificationSlice';
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useDismissNotificationMutation,
} from '../../store/services/notificationApi';
import { useNavigate } from 'react-router-dom';
import NotificationPreferencesDialog from './NotificationPreferencesDialog';

const NotificationsPanel: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const isOpen = useSelector(selectIsNotificationsPanelOpen);
  const [showPreferences, setShowPreferences] = React.useState(false);

  const { refetch } = useGetNotificationsQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [dismiss] = useDismissNotificationMutation();

  const handleClose = () => {
    dispatch(toggleNotificationsPanel());
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.status === 'UNREAD') {
      await markAsRead(notification.id);
    }

    if (notification.metadata?.actionUrl) {
      navigate(notification.metadata.actionUrl);
      handleClose();
    }
  };

  const handleDismiss = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await dismiss(id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return theme.palette.error.main;
      case 'MEDIUM':
        return theme.palette.warning.main;
      case 'LOW':
        return theme.palette.success.main;
      default:
        return theme.palette.text.primary;
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Notifications">
          <IconButton color="inherit" onClick={() => dispatch(toggleNotificationsPanel())}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: '100%',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            <IconButton onClick={() => setShowPreferences(true)}>
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">No notifications</Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor:
                      notification.status === 'UNREAD'
                        ? theme.palette.action.hover
                        : 'transparent',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        color={getPriorityColor(notification.priority)}
                        sx={{ fontWeight: notification.status === 'UNREAD' ? 600 : 400 }}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="textSecondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </Typography>
                      </>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {notification.status === 'UNREAD' && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => handleDismiss(notification.id, e)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>

        {notifications.length > 0 && (
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                navigate('/notifications');
                handleClose();
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Drawer>

      <NotificationPreferencesDialog
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </>
  );
};

export default NotificationsPanel;
