import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Divider,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    IconButton,
    Tooltip,
    Pagination
} from '@mui/material';
import {
    Warning as WarningIcon,
    Notifications as NotificationsIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    LocalPharmacy as MedicationIcon,
    Done as DoneIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import NotificationService from '../services/notificationService';

const NotificationHistory = () => {
    const [notifications, setNotifications] = useState({ items: [], total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage] = useState(20);

    useEffect(() => {
        fetchNotifications();
    }, [page, filter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await NotificationService.getNotificationHistory(page, perPage);
            setNotifications(data);
            setError(null);
        } catch (err) {
            setError('Failed to load notification history');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (notificationId) => {
        try {
            await NotificationService.acknowledgeNotification(notificationId);
            // Refresh the notifications
            fetchNotifications();
        } catch (err) {
            setError('Failed to acknowledge notification');
            console.error('Error acknowledging notification:', err);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'INTERACTION_WARNING':
                return <WarningIcon color="error" />;
            case 'MISSED_DOSE':
                return <ErrorIcon color="error" />;
            case 'UPCOMING_DOSE':
                return <NotificationsIcon color="primary" />;
            case 'REFILL_REMINDER':
                return <MedicationIcon color="warning" />;
            case 'TEST':
                return <NotificationsIcon color="info" />;
            default:
                return <NotificationsIcon />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'error';
            case 'normal':
                return 'primary';
            default:
                return 'default';
        }
    };

    const getNotificationTypeLabel = (type) => {
        switch (type) {
            case 'INTERACTION_WARNING':
                return 'Interaction Warning';
            case 'MISSED_DOSE':
                return 'Missed Dose';
            case 'UPCOMING_DOSE':
                return 'Upcoming Dose';
            case 'REFILL_REMINDER':
                return 'Refill Reminder';
            case 'TEST':
                return 'Test Notification';
            default:
                return type;
        }
    };

    const getNotificationContent = (notification) => {
        if (notification.data) {
            if (notification.type === 'INTERACTION_WARNING' && notification.data.medications) {
                return `Potential interaction between ${notification.data.medications.join(' and ')}`;
            }
            if (notification.data.message) {
                return notification.data.message;
            }
        }
        return 'Notification';
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Card>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Notification History
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Filter</InputLabel>
                            <Select
                                value={filter}
                                label="Filter"
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <MenuItem value="all">All Notifications</MenuItem>
                                <MenuItem value="high">High Priority</MenuItem>
                                <MenuItem value="INTERACTION_WARNING">Interaction Warnings</MenuItem>
                                <MenuItem value="MISSED_DOSE">Missed Doses</MenuItem>
                                <MenuItem value="UPCOMING_DOSE">Upcoming Doses</MenuItem>
                                <MenuItem value="REFILL_REMINDER">Refill Reminders</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {notifications.items.length === 0 ? (
                        <Alert severity="info">
                            No notifications found
                        </Alert>
                    ) : (
                        <>
                            <List>
                                {notifications.items.map((notification, index) => (
                                    <React.Fragment key={notification.id}>
                                        {index > 0 && <Divider />}
                                        <ListItem
                                            secondaryAction={
                                                !notification.acknowledged_at && (
                                                    <Tooltip title="Mark as read">
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => handleAcknowledge(notification.id)}
                                                        >
                                                            <DoneIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )
                                            }
                                        >
                                            <ListItemIcon>
                                                {getNotificationIcon(notification.type)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {getNotificationContent(notification)}
                                                        <Chip
                                                            label={getNotificationTypeLabel(notification.type)}
                                                            size="small"
                                                            color={getPriorityColor(notification.priority)}
                                                            variant={notification.priority === 'high' ? 'filled' : 'outlined'}
                                                        />
                                                        {notification.acknowledged_at && (
                                                            <Chip
                                                                label="Read"
                                                                size="small"
                                                                color="default"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    <>
                                                        {format(new Date(notification.created_at), 'PPpp')}
                                                        {notification.medication && (
                                                            <Typography
                                                                component="span"
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                {` • ${notification.medication.name} ${notification.medication.dosage}`}
                                                            </Typography>
                                                        )}
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    </React.Fragment>
                                ))}
                            </List>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                <Pagination
                                    count={notifications.pages}
                                    page={page}
                                    onChange={(e, value) => setPage(value)}
                                    color="primary"
                                />
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default NotificationHistory;
