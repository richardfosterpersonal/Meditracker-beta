import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Switch,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  TextField,
  Button,
  Alert,
  Divider,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Notifications as NotificationsIcon,
  AccessibilityNew as AccessibilityIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  SaveAlt as SaveIcon,
  Upload as UploadIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { userSettingsService, UserSettings } from '../../services/UserSettingsService';
import { liabilityProtection } from '../../utils/liabilityProtection';

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
      id={`settings-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function UserSettingsPanel() {
  const [settings, setSettings] = useState<UserSettings>(userSettingsService.getSettings());
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = userSettingsService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('Failed to load settings');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = async (
    section: keyof UserSettings,
    subsection: string,
    value: any
  ) => {
    try {
      setLoading(true);
      setError(null);

      const newSettings = {
        ...settings,
        [section]: {
          ...settings[section],
          [subsection]: value
        }
      };

      await userSettingsService.updateSettings(newSettings);
      setSettings(newSettings);
      setSuccessMessage('Settings updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSettings = async () => {
    try {
      const settingsJson = await userSettingsService.exportSettings();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medication-tracker-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
      setError('Failed to export settings');
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const settingsJson = e.target?.result as string;
          await userSettingsService.importSettings(settingsJson);
          await loadSettings();
          setSuccessMessage('Settings imported successfully');
        } catch (error) {
          console.error('Failed to import settings:', error);
          setError('Failed to import settings');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to read settings file:', error);
      setError('Failed to read settings file');
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<LanguageIcon />} label="Language & Region" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<AccessibilityIcon />} label="Accessibility" />
          <Tab icon={<SecurityIcon />} label="Privacy" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={settings.language.preferred}
                onChange={(e) => handleSettingChange('language', 'preferred', e.target.value)}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="fr">Français</MenuItem>
                {/* Add more languages as needed */}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={settings.locale.currency}
                onChange={(e) => handleSettingChange('locale', 'currency', e.target.value)}
              >
                <MenuItem value="USD">US Dollar (USD)</MenuItem>
                <MenuItem value="CAD">Canadian Dollar (CAD)</MenuItem>
                <MenuItem value="EUR">Euro (EUR)</MenuItem>
                {/* Add more currencies as needed */}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Time Format</InputLabel>
              <Select
                value={settings.locale.timeFormat}
                onChange={(e) => handleSettingChange('locale', 'timeFormat', e.target.value)}
              >
                <MenuItem value="12h">12-hour</MenuItem>
                <MenuItem value="24h">24-hour</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.enabled}
                  onChange={(e) => handleSettingChange('notifications', 'enabled', e.target.checked)}
                />
              }
              label="Enable Notifications"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Notification Methods
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.methods.push}
                  onChange={(e) => handleSettingChange('notifications', 'methods', {
                    ...settings.notifications.methods,
                    push: e.target.checked
                  })}
                />
              }
              label="Push Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.methods.email}
                  onChange={(e) => handleSettingChange('notifications', 'methods', {
                    ...settings.notifications.methods,
                    email: e.target.checked
                  })}
                />
              }
              label="Email"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.methods.sms}
                  onChange={(e) => handleSettingChange('notifications', 'methods', {
                    ...settings.notifications.methods,
                    sms: e.target.checked
                  })}
                />
              }
              label="SMS"
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Font Size</InputLabel>
              <Select
                value={settings.accessibility.fontSize}
                onChange={(e) => handleSettingChange('accessibility', 'fontSize', e.target.value)}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.accessibility.highContrast}
                  onChange={(e) => handleSettingChange('accessibility', 'highContrast', e.target.checked)}
                />
              }
              label="High Contrast"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.accessibility.reduceMotion}
                  onChange={(e) => handleSettingChange('accessibility', 'reduceMotion', e.target.checked)}
                />
              }
              label="Reduce Motion"
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privacy.shareLocation}
                  onChange={(e) => handleSettingChange('privacy', 'shareLocation', e.target.checked)}
                />
              }
              label="Share Location"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privacy.shareMedData}
                  onChange={(e) => handleSettingChange('privacy', 'shareMedData', e.target.checked)}
                />
              }
              label="Share Medical Data with Emergency Contacts"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Data Retention</InputLabel>
              <Select
                value={settings.privacy.dataRetention}
                onChange={(e) => handleSettingChange('privacy', 'dataRetention', e.target.value)}
              >
                <MenuItem value={30}>30 days</MenuItem>
                <MenuItem value={90}>90 days</MenuItem>
                <MenuItem value={365}>1 year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </TabPanel>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleExportSettings}
            sx={{ mr: 1 }}
          >
            Export Settings
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            component="label"
          >
            Import Settings
            <input
              type="file"
              hidden
              accept=".json"
              onChange={handleImportSettings}
            />
          </Button>
        </Box>
        <Tooltip title="Need help with settings?">
          <IconButton color="primary">
            <HelpIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
