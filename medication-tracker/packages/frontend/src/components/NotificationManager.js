import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    Button,
    Alert,
    Snackbar,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    CircularProgress,
    Tabs,
    Tab,
} from '@mui/material';
import NotificationService from '../services/notificationService';
import NotificationHistory from './NotificationHistory';
import NotificationPreferences from './NotificationPreferences';

const NotificationManager = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        checkNotificationStatus();
    }, []);

    const checkNotificationStatus = async () => {
        try {
            setLoading(true);
            const isEnabled = await NotificationService.init();
            setNotificationsEnabled(isEnabled);
            setError(null);
        } catch (err) {
            setError('Failed to initialize notifications');
            console.error('Notification error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotifications = async () => {
        try {
            if (!notificationsEnabled) {
                const granted = await NotificationService.init();
                if (granted) {
                    await NotificationService.subscribe();
                    setNotificationsEnabled(true);
                    showSnackbar('Notifications enabled successfully', 'success');
                } else {
                    showSnackbar('Permission denied for notifications', 'error');
                }
            } else {
                await NotificationService.unsubscribe();
                setNotificationsEnabled(false);
                showSnackbar('Notifications disabled', 'info');
            }
        } catch (err) {
            showSnackbar('Failed to update notification settings', 'error');
            console.error('Error toggling notifications:', err);
        }
    };

    const handleTestNotification = async () => {
        try {
            const sent = await NotificationService.sendTestNotification();
            if (sent) {
                showSnackbar('Test notification sent', 'success');
            } else {
                showSnackbar('Notifications not enabled', 'warning');
            }
        } catch (err) {
            showSnackbar('Failed to send test notification', 'error');
            console.error('Error sending test notification:', err);
        }
    };

    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Settings" />
                    <Tab label="Preferences" />
                    <Tab label="History" />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Notification Settings
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <List>
                            <ListItem>
                                <ListItemText
                                    primary="Enable Notifications"
                                    secondary="Receive reminders when it's time to take your medications"
                                />
                                <ListItemSecondaryAction>
                                    <Switch
                                        edge="end"
                                        checked={notificationsEnabled}
                                        onChange={handleToggleNotifications}
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemText
                                    primary="Test Notifications"
                                    secondary="Send a test notification to verify settings"
                                />
                                <ListItemSecondaryAction>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleTestNotification}
                                        disabled={!notificationsEnabled}
                                    >
                                        Test
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                        </List>
                    </CardContent>
                </Card>
            )}

            {activeTab === 1 && <NotificationPreferences />}
            {activeTab === 2 && <NotificationHistory />}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default NotificationManager;
