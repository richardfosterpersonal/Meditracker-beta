import axiosInstance from './axiosConfig';
import notificationTemplates from './notificationTemplates';

class NotificationService {
    constructor() {
        this.permission = null;
        this.supported = 'Notification' in window;
        this.scheduledNotifications = new Map();
        this.sounds = {
            high: new Audio('/sounds/high-priority.mp3'),
            normal: new Audio('/sounds/normal-priority.mp3')
        };
    }

    async init() {
        if (this.supported) {
            this.permission = await Notification.requestPermission();
            if (this.permission === 'granted') {
                await this.loadScheduledNotifications();
                return true;
            }
        }
        return false;
    }

    async loadScheduledNotifications() {
        try {
            const response = await axiosInstance.get('/notifications/scheduled');
            const notifications = response.data;
            notifications.forEach(notification => {
                this.scheduleNotification(notification);
            });
        } catch (error) {
            console.error('Error loading scheduled notifications:', error);
        }
    }

    scheduleNotification(notificationData) {
        const { id, type, scheduledTime, data } = notificationData;
        const delay = new Date(scheduledTime).getTime() - Date.now();
        
        if (delay < 0) return; // Don't schedule past notifications

        const timeoutId = setTimeout(() => {
            this.showNotification(type, data);
            this.scheduledNotifications.delete(id);
        }, delay);

        this.scheduledNotifications.set(id, timeoutId);
    }

    async showNotification(type, data) {
        try {
            const prefs = await this.getPreferences();
            if (!this.shouldShowNotification(prefs)) return;

            const template = notificationTemplates[type];
            if (!template) throw new Error(`Unknown notification type: ${type}`);

            const notificationOptions = template.template(...data);
            
            // Show browser notification if enabled
            if (prefs.browser_notifications) {
                const notification = new Notification(notificationOptions.title, {
                    ...notificationOptions,
                    silent: !prefs.notification_sound
                });

                // Handle notification click
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                    // Additional click handling based on notification type
                    this.handleNotificationClick(type, data);
                };
            }

            // Play sound if enabled
            if (prefs.notification_sound) {
                const sound = this.sounds[notificationOptions.priority || 'normal'];
                await sound.play();
            }

            // Log notification
            await this.logNotification(type, data);

        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    shouldShowNotification(prefs) {
        if (!prefs) return true;

        // Check quiet hours
        if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const startTime = this.timeStringToMinutes(prefs.quiet_hours_start);
            const endTime = this.timeStringToMinutes(prefs.quiet_hours_end);

            if (startTime < endTime) {
                if (currentTime >= startTime && currentTime <= endTime) return false;
            } else {
                if (currentTime >= startTime || currentTime <= endTime) return false;
            }
        }

        return true;
    }

    timeStringToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    async handleNotificationClick(type, data) {
        // Implement specific click handling based on notification type
        switch (type) {
            case 'UPCOMING_DOSE':
            case 'MISSED_DOSE':
                window.location.href = `/medications/${data[0].id}`;
                break;
            case 'INTERACTION_WARNING':
                window.location.href = '/interactions';
                break;
            case 'REFILL_REMINDER':
                window.location.href = `/medications/${data[0].id}/refill`;
                break;
        }
    }

    async logNotification(type, data) {
        try {
            await axiosInstance.post('/notifications/log', {
                type,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error logging notification:', error);
        }
    }

    async subscribe() {
        try {
            const response = await axiosInstance.post('/notifications/subscribe');
            return response.data;
        } catch (error) {
            console.error('Error subscribing to notifications:', error);
            throw error;
        }
    }

    async unsubscribe() {
        try {
            const response = await axiosInstance.post('/notifications/unsubscribe');
            return response.data;
        } catch (error) {
            console.error('Error unsubscribing from notifications:', error);
            throw error;
        }
    }

    async getNotifications() {
        try {
            const response = await axiosInstance.get('/notifications');
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    async getPreferences() {
        try {
            const response = await axiosInstance.get('/notifications/preferences');
            return response.data;
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
            throw error;
        }
    }

    async updatePreferences(preferences) {
        try {
            const response = await axiosInstance.put('/notifications/preferences', preferences);
            return response.data;
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            throw error;
        }
    }

    async sendTestNotification() {
        if (this.permission === 'granted') {
            return this.showNotification('test', {
                type: 'test',
                priority: 'normal',
                message: 'This is a test notification from your medication tracker.',
                requiresAcknowledgment: false
            });
        }
        return false;
    }

    async sendTestEmail() {
        try {
            const response = await axiosInstance.post('/api/email/test');
            return response.data;
        } catch (error) {
            console.error('Error sending test email:', error);
            throw error;
        }
    }

    async verifyEmail() {
        try {
            const response = await axiosInstance.post('/api/email/verify');
            return response.data;
        } catch (error) {
            console.error('Error sending verification email:', error);
            throw error;
        }
    }

    async confirmEmailVerification(code) {
        try {
            const response = await axiosInstance.post(`/api/email/verify/${code}`);
            return response.data;
        } catch (error) {
            console.error('Error confirming email verification:', error);
            throw error;
        }
    }

    async getEmailPreferences() {
        try {
            const response = await axiosInstance.get('/api/email/preferences');
            return response.data;
        } catch (error) {
            console.error('Error getting email preferences:', error);
            throw error;
        }
    }

    async updateEmailPreferences(preferences) {
        try {
            const response = await axiosInstance.put('/api/email/preferences', preferences);
            return response.data;
        } catch (error) {
            console.error('Error updating email preferences:', error);
            throw error;
        }
    }

    // Helper method to determine notification urgency
    getNotificationUrgency(notification) {
        if (notification.type === 'interaction_warning') return 'critical';
        if (notification.priority === 'high') return 'high';
        return 'normal';
    }
}

export default new NotificationService();
