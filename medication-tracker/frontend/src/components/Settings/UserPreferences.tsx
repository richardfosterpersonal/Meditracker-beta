import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Divider,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  Language as LanguageIcon,
  AccessibilityNew as AccessibilityIcon,
  Help as HelpIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { api } from '../../services/api';
import { useWebSocketConnection } from '../../services/websocket';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  reminderTime: number; // minutes before scheduled time
  missedDoseAlert: boolean;
  lowSupplyAlert: boolean;
  caregiverAlert: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface GeneralPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  highContrastMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preferences-tabpanel-${index}`}
      aria-labelledby={`preferences-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ErrorBoundaryProps {
  componentName: string;
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          An error occurred in the {this.props.componentName} component.
        </Alert>
      );
    }

    return this.props.children;
  }
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onChange: (prefs: NotificationPreferences) => void;
  connected: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onChange,
  connected,
}) => {
  const handleNotificationChange = (key: keyof NotificationPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(prev => ({
      ...prev,
      [key]: event.target.checked,
    }));
  };

  const handleReminderTimeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(prev => ({
      ...prev,
      reminderTime: event.target.value as number,
    }));
  };

  const handleQuietHoursChange = (field: 'quietHoursStart' | 'quietHoursEnd') => (
    newValue: Date | null
  ) => {
    if (newValue) {
      onChange(prev => ({
        ...prev,
        [field]: newValue.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      }));
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Notification Channels
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.email}
                onChange={handleNotificationChange('email')}
              />
            }
            label="Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.push}
                onChange={handleNotificationChange('push')}
              />
            }
            label="Push Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.sms}
                onChange={handleNotificationChange('sms')}
              />
            }
            label="SMS Notifications"
          />
        </FormGroup>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Alert Settings
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.missedDoseAlert}
                onChange={handleNotificationChange('missedDoseAlert')}
              />
            }
            label="Missed Dose Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.lowSupplyAlert}
                onChange={handleNotificationChange('lowSupplyAlert')}
              />
            }
            label="Low Supply Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.caregiverAlert}
                onChange={handleNotificationChange('caregiverAlert')}
              />
            }
            label="Notify Caregiver"
          />
        </FormGroup>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Timing Preferences
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Reminder Time</InputLabel>
              <Select
                value={preferences.reminderTime}
                onChange={handleReminderTimeChange}
              >
                <MenuItem value={15}>15 minutes before</MenuItem>
                <MenuItem value={30}>30 minutes before</MenuItem>
                <MenuItem value={60}>1 hour before</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" gap={2}>
              <TimePicker
                label="Quiet Hours Start"
                value={new Date(`2000-01-01T${preferences.quietHoursStart}`)}
                onChange={handleQuietHoursChange('quietHoursStart')}
              />
              <TimePicker
                label="Quiet Hours End"
                value={new Date(`2000-01-01T${preferences.quietHoursEnd}`)}
                onChange={handleQuietHoursChange('quietHoursEnd')}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const updatePreferences = async (prefs: {
  notifications: NotificationPreferences;
  general: GeneralPreferences;
}) => {
  await Promise.all([
    api.put('/api/v1/preferences/notifications', prefs.notifications),
    api.put('/api/v1/preferences/general', prefs.general),
  ]);
};

export const UserPreferences: React.FC = () => {
  const [value, setValue] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const { isConnected } = useWebSocketConnection('/ws/notifications');

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: false,
    reminderTime: 30,
    missedDoseAlert: true,
    lowSupplyAlert: true,
    caregiverAlert: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const [generalPrefs, setGeneralPrefs] = useState<GeneralPreferences>({
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    highContrastMode: false,
    fontSize: 'medium',
  });

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await updatePreferences({
        notifications: notificationPrefs,
        general: generalPrefs,
      });
      setSaveStatus('success');
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save preferences:', error);
    }
  };

  return (
    <ErrorBoundary componentName="UserPreferences">
      <Box sx={{ width: '100%', maxWidth: 800, margin: '0 auto', p: 3 }}>
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Some real-time updates may be delayed due to connection issues
          </Alert>
        )}

        {saveStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to save preferences. Please try again.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Tabs value={value} onChange={(_, newValue) => setValue(newValue)}>
              <Tab icon={<NotificationsIcon />} label="Notifications" />
              <Tab icon={<AccessibilityIcon />} label="Accessibility" />
              <Tab icon={<LanguageIcon />} label="Regional" />
            </Tabs>

            <TabPanel value={value} index={0}>
              <NotificationSettings
                preferences={notificationPrefs}
                onChange={setNotificationPrefs}
                connected={isConnected}
              />
            </TabPanel>

            <TabPanel value={value} index={1}>
              <ErrorBoundary componentName="AccessibilityPreferences">
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Display Settings
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generalPrefs.highContrastMode}
                            onChange={(event) =>
                              setGeneralPrefs((prev) => ({
                                ...prev,
                                highContrastMode: event.target.checked,
                              }))
                            }
                          />
                        }
                        label="High Contrast Mode"
                      />
                    </FormGroup>

                    <Box sx={{ mt: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel>Font Size</InputLabel>
                        <Select
                          value={generalPrefs.fontSize}
                          onChange={(event) =>
                            setGeneralPrefs((prev) => ({
                              ...prev,
                              fontSize: event.target.value as 'small' | 'medium' | 'large',
                            }))
                          }
                        >
                          <MenuItem value="small">Small</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="large">Large</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </CardContent>
                </Card>
              </ErrorBoundary>
            </TabPanel>

            <TabPanel value={value} index={2}>
              <ErrorBoundary componentName="RegionalPreferences">
                <Card>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Language</InputLabel>
                          <Select
                            value={generalPrefs.language}
                            onChange={(event) =>
                              setGeneralPrefs((prev) => ({
                                ...prev,
                                language: event.target.value as string,
                              }))
                            }
                          >
                            <MenuItem value="en">English</MenuItem>
                            <MenuItem value="es">Español</MenuItem>
                            <MenuItem value="fr">Français</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Time Format</InputLabel>
                          <Select
                            value={generalPrefs.timeFormat}
                            onChange={(event) =>
                              setGeneralPrefs((prev) => ({
                                ...prev,
                                timeFormat: event.target.value as '12h' | '24h',
                              }))
                            }
                          >
                            <MenuItem value="12h">12-hour</MenuItem>
                            <MenuItem value="24h">24-hour</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Date Format</InputLabel>
                          <Select
                            value={generalPrefs.dateFormat}
                            onChange={(event) =>
                              setGeneralPrefs((prev) => ({
                                ...prev,
                                dateFormat: event.target.value as string,
                              }))
                            }
                          >
                            <MenuItem value="MM/dd/yyyy">MM/DD/YYYY</MenuItem>
                            <MenuItem value="dd/MM/yyyy">DD/MM/YYYY</MenuItem>
                            <MenuItem value="yyyy-MM-dd">YYYY-MM-DD</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Timezone</InputLabel>
                          <Select
                            value={generalPrefs.timezone}
                            onChange={(event) =>
                              setGeneralPrefs((prev) => ({
                                ...prev,
                                timezone: event.target.value as string,
                              }))
                            }
                          >
                            {Intl.supportedValuesOf('timeZone').map((zone) => (
                              <MenuItem key={zone} value={zone}>
                                {zone}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </ErrorBoundary>
            </TabPanel>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            startIcon={
              saveStatus === 'saving' ? <CircularProgress size={20} /> : <SaveIcon />
            }
          >
            Save Preferences
          </Button>
        </Box>

        <Snackbar
          open={saveStatus === 'success'}
          autoHideDuration={6000}
          onClose={() => setSaveStatus('idle')}
          message="Preferences saved successfully"
        />
      </Box>
    </ErrorBoundary>
  );
};
