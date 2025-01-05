import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Notifications, NotificationsOff } from '@mui/icons-material';
import useNotificationSettings from '../hooks/useNotificationSettings';
import { toast } from 'react-hot-toast';

const NotificationSettings: React.FC = () => {
  const {
    permission,
    supported,
    settings,
    loading,
    error,
    requestPermission,
    updateSettings,
  } = useNotificationSettings();

  const handlePermissionRequest = async () => {
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Permission denied. Please enable notifications in your browser settings.');
      }
    } catch (error) {
      toast.error('Failed to request notification permission');
    }
  };

  const handleSettingChange = async (setting: keyof typeof settings) => {
    try {
      await updateSettings({
        [setting]: !settings[setting],
      });
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (!supported) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Notifications are not supported in your browser. Please use a modern browser to enable notifications.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          {permission === 'granted' ? (
            <Notifications color="primary" sx={{ mr: 2 }} />
          ) : (
            <NotificationsOff color="action" sx={{ mr: 2 }} />
          )}
          <Typography variant="h5">Notification Settings</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {permission !== 'granted' && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enable notifications to receive medication reminders and important updates.
            </Alert>
            <Button
              variant="contained"
              onClick={handlePermissionRequest}
              startIcon={<Notifications />}
            >
              Enable Notifications
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.medicationReminders}
                onChange={() => handleSettingChange('medicationReminders')}
                disabled={permission !== 'granted'}
              />
            }
            label="Medication Reminders"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
            Receive reminders when it's time to take your medications
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.refillAlerts}
                onChange={() => handleSettingChange('refillAlerts')}
                disabled={permission !== 'granted'}
              />
            }
            label="Refill Alerts"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
            Get notified when you need to refill your medications
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.appointmentReminders}
                onChange={() => handleSettingChange('appointmentReminders')}
                disabled={permission !== 'granted'}
              />
            }
            label="Appointment Reminders"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
            Receive reminders about upcoming medical appointments
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.dailySummary}
                onChange={() => handleSettingChange('dailySummary')}
                disabled={permission !== 'granted'}
              />
            }
            label="Daily Summary"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
            Get a daily summary of your medication schedule
          </Typography>
        </FormGroup>

        {permission === 'granted' && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success">
              Notifications are enabled. You will receive updates based on your preferences.
            </Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default NotificationSettings;
