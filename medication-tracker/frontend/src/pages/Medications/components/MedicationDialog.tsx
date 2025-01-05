import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  MenuItem,
  useTheme,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import type { Medication } from '../../../store/slices/medicationSlice';

interface MedicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (medication: Partial<Medication>) => Promise<void>;
  medication?: Medication | null;
}

const schema = yup.object().shape({
  name: yup.string().required('Medication name is required'),
  dosage: yup.string().required('Dosage is required'),
  frequency: yup.string().required('Frequency is required'),
  category: yup.string().required('Category is required'),
  nextDose: yup.date().required('Next dose time is required'),
  instructions: yup.string(),
  reminderEnabled: yup.boolean(),
  reminderTime: yup.string().when('reminderEnabled', {
    is: true,
    then: yup.string().required('Reminder time is required when reminders are enabled'),
  }),
});

const categories = [
  'Prescription',
  'Over-the-counter',
  'Supplement',
  'Vitamin',
  'Other',
];

const MedicationDialog: React.FC<MedicationDialogProps> = ({
  open,
  onClose,
  onSave,
  medication,
}) => {
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      dosage: '',
      frequency: '',
      category: '',
      nextDose: new Date(),
      instructions: '',
      reminderEnabled: false,
      reminderTime: '',
    },
  });

  useEffect(() => {
    if (medication) {
      reset({
        ...medication,
        nextDose: new Date(medication.nextDose),
      });
    } else {
      reset({
        name: '',
        dosage: '',
        frequency: '',
        category: '',
        nextDose: new Date(),
        instructions: '',
        reminderEnabled: false,
        reminderTime: '',
      });
    }
  }, [medication, reset]);

  const onSubmit = async (data: Partial<Medication>) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save medication:', error);
    }
  };

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
      <DialogTitle>
        {medication ? 'Edit Medication' : 'Add New Medication'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Medication Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="dosage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Dosage"
                    fullWidth
                    error={!!errors.dosage}
                    helperText={errors.dosage?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Frequency"
                    fullWidth
                    error={!!errors.frequency}
                    helperText={errors.frequency?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Category"
                    fullWidth
                    error={!!errors.category}
                    helperText={errors.category?.message}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="nextDose"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Next Dose"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.nextDose,
                        helperText: errors.nextDose?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="instructions"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Instructions"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.instructions}
                    helperText={errors.instructions?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="reminderEnabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Enable Reminders"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="reminderTime"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Reminder Time Before Dose"
                    select
                    fullWidth
                    disabled={!control._formValues.reminderEnabled}
                    error={!!errors.reminderTime}
                    helperText={errors.reminderTime?.message}
                  >
                    <MenuItem value="15">15 minutes</MenuItem>
                    <MenuItem value="30">30 minutes</MenuItem>
                    <MenuItem value="60">1 hour</MenuItem>
                    <MenuItem value="120">2 hours</MenuItem>
                  </TextField>
                )}
              />
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
            {medication ? 'Update' : 'Add'} Medication
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MedicationDialog;
