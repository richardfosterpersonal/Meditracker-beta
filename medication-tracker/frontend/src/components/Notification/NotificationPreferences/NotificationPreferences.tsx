import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    FormControl,
    FormControlLabel,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Grid,
    Alert,
    CircularProgress,
    Divider,
    Button,
    Stack,
    SelectChangeEvent,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { parseISO, format, set } from 'date-fns';
import NotificationService from '../../../services/notificationService';

interface NotificationPreference {
    enabled: boolean;
    type: 'email' | 'push' | 'sms';
    frequency: 'immediate' | 'daily' | 'weekly';
    reminderTime?: string;
    advanceNotice: number;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    categories: {
        medications: boolean;
        appointments: boolean;
        refills: boolean;
        emergencies: boolean;
    };
    customSettings: {
        soundEnabled: boolean;
        vibrationEnabled: boolean;
        priority: 'high' | 'normal' | 'low';
    };
}

interface SaveStatus {
    type: 'success' | 'error' | 'info';
    message: string;
}

const NotificationPreferences: React.FC = () => {
    const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            const response = await NotificationService.getPreferences();
            setPreferences(response);
            setError(null);
        } catch (err) {
            setError('Failed to load notification preferences');
            console.error('Error loading preferences:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preferences) return;

        try {
            setSaveStatus({ type: 'info', message: 'Saving preferences...' });
            await NotificationService.updatePreferences(preferences);
            setSaveStatus({ type: 'success', message: 'Preferences saved successfully' });
        } catch (err) {
            setSaveStatus({
                type: 'error',
                message: 'Failed to save preferences. Please try again.',
            });
            console.error('Error saving preferences:', err);
        }
    };

    const handleToggle = (field: keyof NotificationPreference) => {
        if (!preferences) return;

        setPreferences((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [field]: !prev[field],
            };
        });
    };

    const handleCategoryToggle = (category: keyof NotificationPreference['categories']) => {
        if (!preferences) return;

        setPreferences((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                categories: {
                    ...prev.categories,
                    [category]: !prev.categories[category],
                },
            };
        });
    };

    const handleCustomSettingToggle = (setting: keyof NotificationPreference['customSettings']) => {
        if (!preferences) return;

        setPreferences((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                customSettings: {
                    ...prev.customSettings,
                    [setting]: !prev.customSettings[setting],
                },
            };
        });
    };

    const handleSelectChange = (field: keyof NotificationPreference) => (
        event: SelectChangeEvent
    ) => {
        if (!preferences) return;

        setPreferences((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [field]: event.target.value,
            };
        });
    };

    const handleTimeChange = (field: 'reminderTime' | 'quietHoursStart' | 'quietHoursEnd') => (
        value: Date | null
    ) => {
        if (!preferences || !value) return;

        setPreferences((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [field]: format(value, 'HH:mm'),
            };
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!preferences) {
        return (
            <Alert severity="error">
                Unable to load notification preferences. Please try again later.
            </Alert>
        );
    }

    return (
        <Box>
            <Card>
                <CardContent>
                    <Stack spacing={3}>
                        {error && <Alert severity="error">{error}</Alert>}
                        {saveStatus && <Alert severity={saveStatus.type}>{saveStatus.message}</Alert>}

                        <Typography variant="h6">General Settings</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Notification Type</InputLabel>
                                    <Select
                                        value={preferences.type}
                                        onChange={handleSelectChange('type')}
                                        label="Notification Type"
                                    >
                                        <MenuItem value="push">Push Notifications</MenuItem>
                                        <MenuItem value="email">Email</MenuItem>
                                        <MenuItem value="sms">SMS</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Frequency</InputLabel>
                                    <Select
                                        value={preferences.frequency}
                                        onChange={handleSelectChange('frequency')}
                                        label="Frequency"
                                    >
                                        <MenuItem value="immediate">Immediate</MenuItem>
                                        <MenuItem value="daily">Daily Summary</MenuItem>
                                        <MenuItem value="weekly">Weekly Summary</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {preferences.frequency !== 'immediate' && (
                                <Grid item xs={12} md={6}>
                                    <TimePicker
                                        label="Reminder Time"
                                        value={
                                            preferences.reminderTime
                                                ? parseISO(
                                                      `2000-01-01T${preferences.reminderTime}:00`
                                                  )
                                                : null
                                        }
                                        onChange={handleTimeChange('reminderTime')}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                </Grid>
                            )}
                        </Grid>

                        <Divider />

                        <Typography variant="h6">Notification Categories</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.categories.medications}
                                            onChange={() => handleCategoryToggle('medications')}
                                        />
                                    }
                                    label="Medication Reminders"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.categories.appointments}
                                            onChange={() => handleCategoryToggle('appointments')}
                                        />
                                    }
                                    label="Appointment Reminders"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.categories.refills}
                                            onChange={() => handleCategoryToggle('refills')}
                                        />
                                    }
                                    label="Refill Alerts"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.categories.emergencies}
                                            onChange={() => handleCategoryToggle('emergencies')}
                                        />
                                    }
                                    label="Emergency Alerts"
                                />
                            </Grid>
                        </Grid>

                        <Divider />

                        <Typography variant="h6">Quiet Hours</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.quietHoursEnabled}
                                            onChange={() => handleToggle('quietHoursEnabled')}
                                        />
                                    }
                                    label="Enable Quiet Hours"
                                />
                            </Grid>

                            {preferences.quietHoursEnabled && (
                                <>
                                    <Grid item xs={12} md={6}>
                                        <TimePicker
                                            label="Start Time"
                                            value={
                                                preferences.quietHoursStart
                                                    ? parseISO(
                                                          `2000-01-01T${preferences.quietHoursStart}:00`
                                                      )
                                                    : null
                                            }
                                            onChange={handleTimeChange('quietHoursStart')}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TimePicker
                                            label="End Time"
                                            value={
                                                preferences.quietHoursEnd
                                                    ? parseISO(
                                                          `2000-01-01T${preferences.quietHoursEnd}:00`
                                                      )
                                                    : null
                                            }
                                            onChange={handleTimeChange('quietHoursEnd')}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                },
                                            }}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>

                        <Divider />

                        <Typography variant="h6">Custom Settings</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.customSettings.soundEnabled}
                                            onChange={() => handleCustomSettingToggle('soundEnabled')}
                                        />
                                    }
                                    label="Enable Sound"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.customSettings.vibrationEnabled}
                                            onChange={() =>
                                                handleCustomSettingToggle('vibrationEnabled')
                                            }
                                        />
                                    }
                                    label="Enable Vibration"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Notification Priority</InputLabel>
                                    <Select
                                        value={preferences.customSettings.priority}
                                        onChange={(e: SelectChangeEvent) =>
                                            setPreferences((prev) => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    customSettings: {
                                                        ...prev.customSettings,
                                                        priority: e.target.value as 'high' | 'normal' | 'low',
                                                    },
                                                };
                                            })
                                        }
                                        label="Notification Priority"
                                    >
                                        <MenuItem value="high">High</MenuItem>
                                        <MenuItem value="normal">Normal</MenuItem>
                                        <MenuItem value="low">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Box display="flex" justifyContent="flex-end">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                Save Preferences
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
};

export default NotificationPreferences;
