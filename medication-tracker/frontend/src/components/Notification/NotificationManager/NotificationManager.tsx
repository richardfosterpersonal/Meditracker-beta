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
    AlertColor,
} from '@mui/material';
import NotificationService from '../../../services/notificationService';
import NotificationHistory from '../NotificationHistory';
import NotificationPreferences from '../NotificationPreferences';

interface SnackbarState {
    open: boolean;
    message: string;
    severity: AlertColor;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div
        role="tabpanel"
        hidden={value !== index}
        id={`notification-tabpanel-${index}`}
        aria-labelledby={`notification-tab-${index}`}
    >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
);

const a11yProps = (index: number) => ({
    id: `notification-tab-${index}`,
    'aria-controls': `notification-tabpanel-${index}`,
});

const NotificationManager: React.FC = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'info',
    });
    const [activeTab, setActiveTab] = useState<number>(0);

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
                const permission = await NotificationService.requestPermission();
                if (permission === 'granted') {
                    await NotificationService.enable();
                    setNotificationsEnabled(true);
                    showSnackbar('Notifications enabled successfully', 'success');
                } else {
                    showSnackbar('Permission denied for notifications', 'error');
                }
            } else {
                await NotificationService.disable();
                setNotificationsEnabled(false);
                showSnackbar('Notifications disabled', 'info');
            }
        } catch (err) {
            showSnackbar('Failed to update notification settings', 'error');
            console.error('Error toggling notifications:', err);
        }
    };

    const showSnackbar = (message: string, severity: AlertColor) => {
        setSnackbar({
            open: true,
            message,
            severity,
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    if (loading) {
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
                    <Typography variant="h5" gutterBottom>
                        Notification Settings
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <List>
                        <ListItem>
                            <ListItemText
                                primary="Enable Notifications"
                                secondary="Receive alerts for medication schedules and important updates"
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
                    </List>
                </CardContent>
            </Card>

            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="notification tabs">
                        <Tab label="History" {...a11yProps(0)} />
                        <Tab label="Preferences" {...a11yProps(1)} />
                    </Tabs>
                </Box>

                <TabPanel value={activeTab} index={0}>
                    <NotificationHistory />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <NotificationPreferences />
                </TabPanel>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default NotificationManager;
