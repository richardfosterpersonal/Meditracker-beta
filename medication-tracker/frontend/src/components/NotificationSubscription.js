import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import axios from '../services/axiosConfig';

function NotificationSubscription() {
    const [subscription, setSubscription] = useState(null);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const existingSubscription = await registration.pushManager.getSubscription();
                setSubscription(existingSubscription);
            }
        } catch (error) {
            console.error('Error checking push subscription:', error);
        }
    };

    const subscribeToNotifications = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setNotification({
                    open: true,
                    message: 'Push notifications are not supported by your browser',
                    severity: 'error'
                });
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const existingSubscription = await registration.pushManager.getSubscription();

            if (existingSubscription) {
                setSubscription(existingSubscription);
                return;
            }

            const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
            });

            // Send subscription to backend
            await axios.post('/notifications/subscribe', {
                subscription: JSON.stringify(newSubscription)
            });

            setSubscription(newSubscription);
            setNotification({
                open: true,
                message: 'Successfully subscribed to notifications!',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error subscribing to notifications:', error);
            setNotification({
                open: true,
                message: 'Failed to subscribe to notifications',
                severity: 'error'
            });
        }
    };

    const unsubscribeFromNotifications = async () => {
        try {
            if (subscription) {
                await subscription.unsubscribe();
                await axios.post('/notifications/unsubscribe');
                setSubscription(null);
                setNotification({
                    open: true,
                    message: 'Successfully unsubscribed from notifications',
                    severity: 'success'
                });
            }
        } catch (error) {
            console.error('Error unsubscribing from notifications:', error);
            setNotification({
                open: true,
                message: 'Failed to unsubscribe from notifications',
                severity: 'error'
            });
        }
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    return (
        <div>
            <Button
                variant="contained"
                color={subscription ? "error" : "primary"}
                startIcon={subscription ? <NotificationsOffIcon /> : <NotificationsIcon />}
                onClick={subscription ? unsubscribeFromNotifications : subscribeToNotifications}
            >
                {subscription ? "Disable Notifications" : "Enable Notifications"}
            </Button>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default NotificationSubscription;
