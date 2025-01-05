import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { inventoryService } from '../../services/inventory';

interface NotificationSettings {
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  thresholds: {
    lowSupply: number;
    refillReminder: number;
    unusualUsage: number;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    customHours?: number[];
    timezone: string;
  };
  contacts: {
    email?: string;
    phone?: string;
    caregivers?: string[];
  };
}

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await inventoryService.getNotificationSettings();
      setSettings(response);
      setError(null);
    } catch (err) {
      console.error('Error loading notification settings:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaveStatus('saving');
    try {
      await inventoryService.updateNotificationSettings(settings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setSaveStatus('error');
    }
  };

  const handleChannelToggle = (channel: keyof NotificationSettings['channels']) => {
    if (!settings) return;
    setSettings({
      ...settings,
      channels: {
        ...settings.channels,
        [channel]: !settings.channels[channel]
      }
    });
  };

  const handleThresholdChange = (
    threshold: keyof NotificationSettings['thresholds'],
    value: number
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      thresholds: {
        ...settings.thresholds,
        [threshold]: value
      }
    });
  };

  if (loading) {
    return <Typography>Loading notification settings...</Typography>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!settings) {
    return <Alert severity="error">No settings available</Alert>;
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              <NotificationsIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Notification Preferences
            </Typography>
            <Switch
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
              color="primary"
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Notification Channels */}
          <Typography variant="subtitle1" gutterBottom>
            Notification Channels
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Email Notifications"
                secondary={settings.contacts.email || 'No email set'}
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.channels.email}
                  onChange={() => handleChannelToggle('email')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Push Notifications"
                secondary="Browser and mobile notifications"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.channels.push}
                  onChange={() => handleChannelToggle('push')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="SMS Notifications"
                secondary={settings.contacts.phone || 'No phone number set'}
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.channels.sms}
                  onChange={() => handleChannelToggle('sms')}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Notification Thresholds */}
          <Typography variant="subtitle1" gutterBottom>
            Alert Thresholds
          </Typography>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography gutterBottom>Low Supply Warning (%)</Typography>
            <Slider
              value={settings.thresholds.lowSupply}
              onChange={(_, value) =>
                handleThresholdChange('lowSupply', value as number)
              }
              valueLabelDisplay="auto"
              step={5}
              marks
              min={5}
              max={50}
            />
          </Box>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography gutterBottom>Refill Reminder (days before)</Typography>
            <Slider
              value={settings.thresholds.refillReminder}
              onChange={(_, value) =>
                handleThresholdChange('refillReminder', value as number)
              }
              valueLabelDisplay="auto"
              step={1}
              marks
              min={1}
              max={14}
            />
          </Box>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography gutterBottom>Unusual Usage Alert (%)</Typography>
            <Slider
              value={settings.thresholds.unusualUsage}
              onChange={(_, value) =>
                handleThresholdChange('unusualUsage', value as number)
              }
              valueLabelDisplay="auto"
              step={5}
              marks
              min={10}
              max={50}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Notification Schedule */}
          <Typography variant="subtitle1" gutterBottom>
            Notification Schedule
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Frequency</InputLabel>
            <Select
              value={settings.schedule.frequency}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  schedule: {
                    ...settings.schedule,
                    frequency: e.target.value as NotificationSettings['schedule']['frequency']
                  }
                })
              }
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* Contact Information */}
          <Typography variant="subtitle1" gutterBottom>
            Contact Information
          </Typography>
          <TextField
            fullWidth
            label="Email"
            value={settings.contacts.email || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                contacts: { ...settings.contacts, email: e.target.value }
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={settings.contacts.phone || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                contacts: { ...settings.contacts, phone: e.target.value }
              })
            }
            sx={{ mb: 2 }}
          />

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              variant="contained"
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? 'Saved!'
                : 'Save Settings'}
            </Button>
          </Box>

          {saveStatus === 'error' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to save settings. Please try again.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
