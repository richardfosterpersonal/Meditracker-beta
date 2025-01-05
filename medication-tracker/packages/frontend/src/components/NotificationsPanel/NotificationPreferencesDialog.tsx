import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Grid,
  Typography,
  Box,
  useTheme,
  MenuItem,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  type NotificationPreferences,
} from '../../store/services/notificationApi';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

const reminderTimings = [
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
];

const schema = yup.object().shape({
  emailNotifications: yup.boolean(),
  pushNotifications: yup.boolean(),
  smsNotifications: yup.boolean(),
  reminderTiming: yup.object().shape({
    beforeMinutes: yup.number().required(),
    repeatInterval: yup.number().nullable(),
  }),
  notificationTypes: yup.object().shape({
    medicationReminders: yup.boolean(),
    refillReminders: yup.boolean(),
    familyUpdates: yup.boolean(),
    systemNotifications: yup.boolean(),
  }),
  quietHours: yup.object().shape({
    enabled: yup.boolean(),
    start: yup.date().nullable(),
    end: yup.date().nullable(),
  }),
});

const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const { data: preferences, isLoading } = useGetNotificationPreferencesQuery();
  const [updatePreferences] = useUpdateNotificationPreferencesMutation();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      emailNotifications: false,
      pushNotifications: false,
      smsNotifications: false,
      reminderTiming: {
        beforeMinutes: 15,
        repeatInterval: null,
      },
      notificationTypes: {
        medicationReminders: true,
        refillReminders: true,
        familyUpdates: true,
        systemNotifications: true,
      },
      quietHours: {
        enabled: false,
        start: null,
        end: null,
      },
    },
  });

  React.useEffect(() => {
    if (preferences) {
      reset(preferences);
    }
  }, [preferences, reset]);

  const quietHoursEnabled = watch('quietHours.enabled');

  const onSubmit = async (data: Partial<NotificationPreferences>) => {
    try {
      await updatePreferences(data).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: theme.shape.borderRadius,
        },
      }}
    >
      <DialogTitle>Notification Preferences</DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Notification Channels
              </Typography>
              <Box sx={{ ml: 2 }}>
                <Controller
                  name="emailNotifications"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Email Notifications"
                    />
                  )}
                />

                <Controller
                  name="pushNotifications"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Push Notifications"
                    />
                  )}
                />

                <Controller
                  name="smsNotifications"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="SMS Notifications"
                    />
                  )}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Reminder Timing
              </Typography>
              <Box sx={{ ml: 2 }}>
                <Controller
                  name="reminderTiming.beforeMinutes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Remind me"
                      sx={{ mb: 2 }}
                    >
                      {reminderTimings.map((timing) => (
                        <MenuItem key={timing.value} value={timing.value}>
                          {timing.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <Controller
                  name="reminderTiming.repeatInterval"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Repeat reminder"
                    >
                      <MenuItem value={null}>Don't repeat</MenuItem>
                      <MenuItem value={5}>Every 5 minutes</MenuItem>
                      <MenuItem value={10}>Every 10 minutes</MenuItem>
                      <MenuItem value={15}>Every 15 minutes</MenuItem>
                    </TextField>
                  )}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Notification Types
              </Typography>
              <Box sx={{ ml: 2 }}>
                <Controller
                  name="notificationTypes.medicationReminders"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Medication Reminders"
                    />
                  )}
                />

                <Controller
                  name="notificationTypes.refillReminders"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Refill Reminders"
                    />
                  )}
                />

                <Controller
                  name="notificationTypes.familyUpdates"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Family Updates"
                    />
                  )}
                />

                <Controller
                  name="notificationTypes.systemNotifications"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="System Notifications"
                    />
                  )}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Quiet Hours
              </Typography>
              <Box sx={{ ml: 2 }}>
                <Controller
                  name="quietHours.enabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Enable Quiet Hours"
                    />
                  )}
                />

                {quietHoursEnabled && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Controller
                        name="quietHours.start"
                        control={control}
                        render={({ field }) => (
                          <TimePicker
                            label="Start Time"
                            value={field.value}
                            onChange={(date) => field.onChange(date)}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                              },
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Controller
                        name="quietHours.end"
                        control={control}
                        render={({ field }) => (
                          <TimePicker
                            label="End Time"
                            value={field.value}
                            onChange={(date) => field.onChange(date)}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                              },
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NotificationPreferencesDialog;
