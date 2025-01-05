import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Button,
  Alert,
} from '@mui/material';
import NotificationService from '../../services/NotificationService';

interface NotificationPreferences {
  medicationReminders: boolean;
  missedDoseAlerts: boolean;
  lowSupplyAlerts: boolean;
  advanceNoticeMinutes: number;
}

const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    medicationReminders: true,
    missedDoseAlerts: true,
    lowSupplyAlerts: true,
    advanceNoticeMinutes: 15,
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const loadPermissionStatus = async () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    };
    loadPermissionStatus();
  }, []);

  const handleRequestPermission = async () => {
    const notificationService = NotificationService.getInstance();
    const granted = await notificationService.requestPermission();
    if (granted) {
      setPermissionStatus('granted');
      setShowAlert(true);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Notification Preferences
        </Typography>

        {showAlert && (
          <Alert severity="success" onClose={() => setShowAlert(false)} sx={{ mb: 2 }}>
            Notification permissions granted successfully!
          </Alert>
        )}

        {permissionStatus !== 'granted' && (
          <Box mb={2}>
            <Alert severity="info">
              To receive notifications, please enable notification permissions.
              <Button
                color="primary"
                size="small"
                onClick={handleRequestPermission}
                sx={{ ml: 2 }}
              >
                Enable Notifications
              </Button>
            </Alert>
          </Box>
        )}

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.medicationReminders}
                onChange={() => handlePreferenceChange('medicationReminders')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Medication Reminders"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.missedDoseAlerts}
                onChange={() => handlePreferenceChange('missedDoseAlerts')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Missed Dose Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.lowSupplyAlerts}
                onChange={() => handlePreferenceChange('lowSupplyAlerts')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Low Supply Alerts"
          />
        </FormGroup>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
