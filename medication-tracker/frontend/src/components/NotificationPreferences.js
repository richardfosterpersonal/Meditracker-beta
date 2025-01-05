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
    Stack
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { parseISO, format, set } from 'date-fns';
import NotificationService from '../services/notificationService';

const NotificationPreferences = () => {
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);

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
        try {
            setSaveStatus({ type: 'info', message: 'Saving preferences...' });
            await NotificationService.updatePreferences(preferences);
            setSaveStatus({ type: 'success', message: 'Preferences saved successfully!' });
        } catch (err) {
            setSaveStatus({ type: 'error', message: 'Failed to save preferences' });
            console.error('Error saving preferences:', err);
        }
    };

    const handleChange = (field, value) => {
        setPreferences(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTimeChange = (field, time) => {
        if (!time) return;
        const timeString = format(time, 'HH:mm');
        handleChange(field, timeString);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!preferences) {
        return (
            <Alert severity="error">
                Failed to load notification preferences
            </Alert>
        );
    }

    return (
        <Card>
            <CardContent>
                <Stack spacing={3}>
                    <Typography variant="h6">
                        Notification Preferences
                    </Typography>

                    {error && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {saveStatus && (
                        <Alert severity={saveStatus.type}>
                            {saveStatus.message}
                        </Alert>
                    )}

                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Notification Channels
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.browser_notifications}
                                            onChange={(e) => handleChange('browser_notifications', e.target.checked)}
                                        />
                                    }
                                    label="Browser Notifications"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.email_notifications}
                                            onChange={(e) => handleChange('email_notifications', e.target.checked)}
                                        />
                                    }
                                    label="Email Notifications"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.notification_sound}
                                            onChange={(e) => handleChange('notification_sound', e.target.checked)}
                                        />
                                    }
                                    label="Notification Sounds"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Quiet Hours
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TimePicker
                                    label="Start Time"
                                    value={parseISO(`2000-01-01T${preferences.quiet_hours_start}`)}
                                    onChange={(newValue) => handleTimeChange('quiet_hours_start', newValue)}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TimePicker
                                    label="End Time"
                                    value={parseISO(`2000-01-01T${preferences.quiet_hours_end}`)}
                                    onChange={(newValue) => handleTimeChange('quiet_hours_end', newValue)}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Notification Types
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.notify_upcoming_doses}
                                            onChange={(e) => handleChange('notify_upcoming_doses', e.target.checked)}
                                        />
                                    }
                                    label="Upcoming Doses"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.notify_missed_doses}
                                            onChange={(e) => handleChange('notify_missed_doses', e.target.checked)}
                                        />
                                    }
                                    label="Missed Doses"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.notify_refill_reminders}
                                            onChange={(e) => handleChange('notify_refill_reminders', e.target.checked)}
                                        />
                                    }
                                    label="Refill Reminders"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.notify_interactions}
                                            onChange={(e) => handleChange('notify_interactions', e.target.checked)}
                                        />
                                    }
                                    label="Medication Interactions"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Reminder Settings
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Reminder Advance Time (minutes)"
                                    value={preferences.reminder_advance_minutes}
                                    onChange={(e) => handleChange('reminder_advance_minutes', parseInt(e.target.value))}
                                    InputProps={{ inputProps: { min: 0, max: 180 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Maximum Daily Reminders"
                                    value={preferences.max_daily_reminders}
                                    onChange={(e) => handleChange('max_daily_reminders', parseInt(e.target.value))}
                                    InputProps={{ inputProps: { min: 1, max: 50 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Reminder Frequency (minutes)"
                                    value={preferences.reminder_frequency_minutes}
                                    onChange={(e) => handleChange('reminder_frequency_minutes', parseInt(e.target.value))}
                                    InputProps={{ inputProps: { min: 5, max: 120 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Refill Reminder Days Before"
                                    value={preferences.refill_reminder_days_before}
                                    onChange={(e) => handleChange('refill_reminder_days_before', parseInt(e.target.value))}
                                    InputProps={{ inputProps: { min: 1, max: 30 } }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            color="primary"
                        >
                            Save Preferences
                        </Button>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default NotificationPreferences;
