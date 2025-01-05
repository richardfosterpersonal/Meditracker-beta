import React from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Controller, useForm } from 'react-hook-form';
import { format, parse } from 'date-fns';
import { MedicationSchedule } from '../../../store/services/medicationScheduleApi';

type FormData = Omit<MedicationSchedule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

interface MedicationScheduleFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

const MedicationScheduleForm: React.FC<MedicationScheduleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      medicationName: '',
      dosage: '',
      frequency: {
        type: 'daily',
        times: ['09:00'],
      },
      startDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'active',
      refillReminder: {
        enabled: false,
        threshold: 7,
      },
      ...initialData,
    },
  });

  const frequencyType = watch('frequency.type');
  const refillEnabled = watch('refillReminder.enabled');

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: theme.shape.borderRadius,
      }}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              {initialData ? 'Edit Medication Schedule' : 'New Medication Schedule'}
            </Typography>
          </Grid>

          {/* Basic Information */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="medicationName"
              control={control}
              rules={{ required: 'Medication name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Medication Name"
                  error={!!errors.medicationName}
                  helperText={errors.medicationName?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="dosage"
              control={control}
              rules={{ required: 'Dosage is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Dosage"
                  placeholder="e.g., 1 tablet, 10mg"
                  error={!!errors.dosage}
                  helperText={errors.dosage?.message}
                />
              )}
            />
          </Grid>

          {/* Frequency Settings */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="frequency.type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select {...field} label="Frequency">
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>

          {/* Time Selection */}
          <Grid item xs={12}>
            <Controller
              name="frequency.times"
              control={control}
              rules={{ required: 'At least one time is required' }}
              render={({ field }) => (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Time(s)
                  </Typography>
                  {field.value.map((time, index) => (
                    <Box key={index} sx={{ mb: 2, display: 'flex', gap: 2 }}>
                      <TimePicker
                        value={parse(time, 'HH:mm', new Date())}
                        onChange={(newValue) => {
                          const newTimes = [...field.value];
                          newTimes[index] = format(newValue || new Date(), 'HH:mm');
                          field.onChange(newTimes);
                        }}
                      />
                      {field.value.length > 1 && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            const newTimes = field.value.filter((_, i) => i !== index);
                            field.onChange(newTimes);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={() => {
                      field.onChange([...field.value, '12:00']);
                    }}
                  >
                    Add Time
                  </Button>
                </Box>
              )}
            />
          </Grid>

          {/* Weekly/Monthly Options */}
          {(frequencyType === 'weekly' || frequencyType === 'monthly') && (
            <Grid item xs={12}>
              <Controller
                name={
                  frequencyType === 'weekly'
                    ? 'frequency.daysOfWeek'
                    : 'frequency.daysOfMonth'
                }
                control={control}
                rules={{ required: 'Please select at least one day' }}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>
                      {frequencyType === 'weekly' ? 'Days of Week' : 'Days of Month'}
                    </InputLabel>
                    <Select
                      {...field}
                      multiple
                      label={frequencyType === 'weekly' ? 'Days of Week' : 'Days of Month'}
                    >
                      {frequencyType === 'weekly'
                        ? [
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                          ].map((day, index) => (
                            <MenuItem key={index} value={index}>
                              {day}
                            </MenuItem>
                          ))
                        : Array.from({ length: 31 }, (_, i) => (
                            <MenuItem key={i} value={i + 1}>
                              {i + 1}
                            </MenuItem>
                          ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          )}

          {/* Date Range */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="startDate"
              control={control}
              rules={{ required: 'Start date is required' }}
              render={({ field }) => (
                <DatePicker
                  label="Start Date"
                  value={parse(field.value, 'yyyy-MM-dd', new Date())}
                  onChange={(date) => {
                    field.onChange(format(date || new Date(), 'yyyy-MM-dd'));
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate?.message,
                    },
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="End Date (Optional)"
                  value={field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : null}
                  onChange={(date) => {
                    field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined);
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              )}
            />
          </Grid>

          {/* Instructions */}
          <Grid item xs={12}>
            <Controller
              name="instructions"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={3}
                  label="Instructions (Optional)"
                  placeholder="Add any special instructions or notes"
                />
              )}
            />
          </Grid>

          {/* Refill Reminder */}
          <Grid item xs={12}>
            <Controller
              name="refillReminder.enabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Enable Refill Reminders"
                />
              )}
            />
          </Grid>

          {refillEnabled && (
            <>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="refillReminder.threshold"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      fullWidth
                      label="Reminder Days Before Refill"
                      InputProps={{ inputProps: { min: 1, max: 30 } }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="refillReminder.lastRefillDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Last Refill Date"
                      value={
                        field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : null
                      }
                      onChange={(date) => {
                        field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined);
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                {initialData ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default MedicationScheduleForm;
