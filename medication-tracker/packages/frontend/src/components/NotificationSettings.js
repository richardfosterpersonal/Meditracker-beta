import React, { useState, useEffect } from 'react';
import { TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Button,
  Select,
  MenuItem,
  Alert,
  Grid,
  Divider,
  Box,
  Stack,
  Paper
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    browserNotifications: true,
    notificationSound: true,
    notificationTypes: {
      upcomingDose: true,
      missedDose: true,
      refillReminder: true,
      interactionWarning: true
    },
    quietHours: {
      enabled: false,
      start: null,
      end: null
    },
    reminderAdvanceMinutes: 30,
    maxDailyReminders: 10,
    reminderFrequencyMinutes: 30,
    refillReminderDays: 7,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/email/preferences');
      if (response.data.status === 'success') {
        setSettings(response.data.data);
        setEmailVerified(response.data.data.emailVerified);
      }
    } catch (error) {
      setError('Failed to load notification settings');
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const parts = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      return newSettings;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put('/api/email/preferences', settings);
      if (response.data.status === 'success') {
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      setError('Failed to save settings');
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    try {
      const response = await axios.post('/api/email/verify');
      if (response.data.status === 'success') {
        setVerificationSent(true);
        toast.success('Verification code sent to your email');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
      console.error('Error sending verification:', error);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const response = await axios.post(`/api/email/verify/${verificationCode}`);
      if (response.data.status === 'success') {
        setEmailVerified(true);
        setVerificationSent(false);
        setVerificationCode('');
        toast.success('Email verified successfully');
      }
    } catch (error) {
      toast.error('Invalid verification code');
      console.error('Error verifying email:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      const response = await axios.post('/api/email/test');
      if (response.data.status === 'success') {
        toast.success('Test notification sent');
      }
    } catch (error) {
      toast.error('Failed to send test notification');
      console.error('Error sending test:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Notification Settings
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Notification Channels */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Notification Channels
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                />
              }
              label="Email Notifications"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.browserNotifications}
                  onChange={(e) => handleSettingChange('browserNotifications', e.target.checked)}
                />
              }
              label="Browser Notifications"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notificationSound}
                  onChange={(e) => handleSettingChange('notificationSound', e.target.checked)}
                />
              }
              label="Sound Notifications"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Notification Types */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Notification Types
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notificationTypes.upcomingDose}
                  onChange={(e) => handleSettingChange('notificationTypes.upcomingDose', e.target.checked)}
                />
              }
              label="Upcoming Doses"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notificationTypes.missedDose}
                  onChange={(e) => handleSettingChange('notificationTypes.missedDose', e.target.checked)}
                />
              }
              label="Missed Doses"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notificationTypes.refillReminder}
                  onChange={(e) => handleSettingChange('notificationTypes.refillReminder', e.target.checked)}
                />
              }
              label="Refill Reminders"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notificationTypes.interactionWarning}
                  onChange={(e) => handleSettingChange('notificationTypes.interactionWarning', e.target.checked)}
                />
              }
              label="Medication Interactions"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Quiet Hours */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quiet Hours
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.quietHours.enabled}
                  onChange={(e) => handleSettingChange('quietHours.enabled', e.target.checked)}
                />
              }
              label="Enable Quiet Hours"
            />
          </Grid>
          {settings.quietHours.enabled && (
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack spacing={2}>
                  <TimePicker
                    label="Start Time"
                    value={settings.quietHours.start}
                    onChange={(newTime) => handleSettingChange('quietHours.start', newTime)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />

                  <TimePicker
                    label="End Time"
                    value={settings.quietHours.end}
                    onChange={(newTime) => handleSettingChange('quietHours.end', newTime)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Stack>
              </LocalizationProvider>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Advanced Settings */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Advanced Settings
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Time Zone
              </Typography>
              <Select
                value={settings.timezone}
                onChange={(e) => handleSettingChange('timezone', e.target.value)}
              >
                {Intl.supportedValuesOf('timeZone').map((zone) => (
                  <MenuItem key={zone} value={zone}>
                    {zone}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Reminder Advance Notice (minutes)
              </Typography>
              <TextField
                type="number"
                value={settings.reminderAdvanceMinutes}
                onChange={(e) => handleSettingChange('reminderAdvanceMinutes', parseInt(e.target.value))}
                inputProps={{ min: 0, max: 120 }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Maximum Daily Reminders
              </Typography>
              <TextField
                type="number"
                value={settings.maxDailyReminders}
                onChange={(e) => handleSettingChange('maxDailyReminders', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 50 }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Reminder Frequency (minutes)
              </Typography>
              <TextField
                type="number"
                value={settings.reminderFrequencyMinutes}
                onChange={(e) => handleSettingChange('reminderFrequencyMinutes', parseInt(e.target.value))}
                inputProps={{ min: 15, max: 120 }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Refill Reminder Days Before
              </Typography>
              <TextField
                type="number"
                value={settings.refillReminderDays}
                onChange={(e) => handleSettingChange('refillReminderDays', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 30 }}
              />
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          size="large"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationSettings;
