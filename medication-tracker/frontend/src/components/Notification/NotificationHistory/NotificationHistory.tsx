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
    Pagination,
    SelectChangeEvent,
} from '@mui/material';
import {
    Warning as WarningIcon,
    Notifications as NotificationsIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    LocalPharmacy as MedicationIcon,
    Done as DoneIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import NotificationService from '../../../services/notificationService';

interface Notification {
    id: string;
    type: 'medication' | 'reminder' | 'alert' | 'system';
    priority: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    timestamp: string;
    status: 'read' | 'unread';
    metadata?: {
        medicationId?: string;
        medicationName?: string;
        scheduledTime?: string;
        actionRequired?: boolean;
    };
}

interface NotificationResponse {
    items: Notification[];
    total: number;
    pages: number;
}

const NotificationHistory: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationResponse>({
        items: [],
        total: 0,
        pages: 1,
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [page, setPage] = useState<number>(1);
    const [perPage] = useState<number>(20);

    useEffect(() => {
        fetchNotifications();
    }, [page, filter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await NotificationService.getNotificationHistory(page, perPage, filter);
            setNotifications(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await NotificationService.markAsRead(notificationId);
            setNotifications(prev => ({
                ...prev,
                items: prev.items.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, status: 'read' as const }
                        : notification
                ),
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
        }
    };

    const handleFilterChange = (event: SelectChangeEvent) => {
        setFilter(event.target.value);
        setPage(1);
    };

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
        switch (type) {
            case 'medication':
                return <MedicationIcon color={priority === 'high' ? 'error' : 'primary'} />;
            case 'alert':
                return <WarningIcon color={priority === 'high' ? 'error' : 'warning'} />;
            case 'reminder':
                return <NotificationsIcon color="info" />;
            default:
                return <ErrorIcon color="action" />;
        }
    };

    const getNotificationColor = (priority: Notification['priority']) => {
        switch (priority) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'default';
        }
    };

    if (loading && notifications.items.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                        sx={{ mb: 3 }}
                    >
                        <Typography variant="h5">Notification History</Typography>
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Filter</InputLabel>
                            <Select value={filter} onChange={handleFilterChange} label="Filter">
                                <MenuItem value="all">All Notifications</MenuItem>
                                <MenuItem value="unread">Unread</MenuItem>
                                <MenuItem value="medication">Medication</MenuItem>
                                <MenuItem value="alert">Alerts</MenuItem>
                                <MenuItem value="reminder">Reminders</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <List>
                        {notifications.items.map((notification, index) => (
                            <React.Fragment key={notification.id}>
                                {index > 0 && <Divider />}
                                <ListItem
                                    sx={{
                                        bgcolor:
                                            notification.status === 'unread'
                                                ? 'action.hover'
                                                : 'transparent',
                                    }}
                                    secondaryAction={
                                        notification.status === 'unread' && (
                                            <Tooltip title="Mark as read">
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => markAsRead(notification.id)}
                                                >
                                                    <DoneIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )
                                    }
                                >
                                    <ListItemIcon>
                                        {getNotificationIcon(notification.type, notification.priority)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="subtitle1">
                                                    {notification.title}
                                                </Typography>
                                                <Chip
                                                    label={notification.priority.toUpperCase()}
                                                    color={getNotificationColor(notification.priority)}
                                                    size="small"
                                                />
                                                {notification.status === 'unread' && (
                                                    <Chip
                                                        label="NEW"
                                                        color="primary"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary">
                                                    {notification.message}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ mt: 1, display: 'block' }}
                                                >
                                                    {format(
                                                        new Date(notification.timestamp),
                                                        'PPp'
                                                    )}
                                                </Typography>
                                                {notification.metadata?.medicationName && (
                                                    <Chip
                                                        icon={<MedicationIcon />}
                                                        label={notification.metadata.medicationName}
                                                        size="small"
                                                        sx={{ mt: 1 }}
                                                    />
                                                )}
                                            </>
                                        }
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>

                    {notifications.pages > 1 && (
                        <Box display="flex" justifyContent="center" mt={3}>
                            <Pagination
                                count={notifications.pages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default NotificationHistory;
