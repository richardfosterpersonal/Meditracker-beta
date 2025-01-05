import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Alert, Box, Typography, CircularProgress } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import axios from '../../../services/axiosConfig';

interface NotificationState {
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
}

const NotificationSubscription: React.FC = () => {
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [notification, setNotification] = useState<NotificationState>({
        open: false,
        message: '',
        severity: 'info',
    });
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async (): Promise<void> => {
        try {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const existingSubscription = await registration.pushManager.getSubscription();
                setSubscription(existingSubscription);
            }
        } catch (error) {
            console.error('Error checking push subscription:', error);
            setNotification({
                open: true,
                message: 'Failed to check notification subscription status',
                severity: 'error',
            });
        }
    };

    const subscribeToNotifications = async (): Promise<void> => {
        try {
            setLoading(true);

            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setNotification({
                    open: true,
                    message: 'Push notifications are not supported by your browser',
                    severity: 'error',
                });
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const existingSubscription = await registration.pushManager.getSubscription();

            if (existingSubscription) {
                setSubscription(existingSubscription);
                return;
            }

            const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                throw new Error('VAPID public key is not configured');
            }

            const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey,
            });

            // Send subscription to backend
            await axios.post('/api/notifications/subscribe', newSubscription);

            setSubscription(newSubscription);
            setNotification({
                open: true,
                message: 'Successfully subscribed to notifications',
                severity: 'success',
            });
        } catch (error) {
            console.error('Error subscribing to notifications:', error);
            setNotification({
                open: true,
                message: 'Failed to subscribe to notifications',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const unsubscribeFromNotifications = async (): Promise<void> => {
        try {
            setLoading(true);

            if (!subscription) {
                return;
            }

            await subscription.unsubscribe();
            await axios.post('/api/notifications/unsubscribe', subscription);

            setSubscription(null);
            setNotification({
                open: true,
                message: 'Successfully unsubscribed from notifications',
                severity: 'success',
            });
        } catch (error) {
            console.error('Error unsubscribing from notifications:', error);
            setNotification({
                open: true,
                message: 'Failed to unsubscribe from notifications',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification((prev) => ({ ...prev, open: false }));
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                Push Notifications
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {subscription
                    ? 'You are currently subscribed to push notifications'
                    : 'Subscribe to receive important medication reminders and updates'}
            </Typography>

            <Button
                variant="contained"
                color={subscription ? 'error' : 'primary'}
                onClick={subscription ? unsubscribeFromNotifications : subscribeToNotifications}
                startIcon={
                    loading ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : subscription ? (
                        <NotificationsOffIcon />
                    ) : (
                        <NotificationsIcon />
                    )
                }
                disabled={loading}
            >
                {subscription ? 'Unsubscribe' : 'Subscribe to Notifications'}
            </Button>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default NotificationSubscription;
