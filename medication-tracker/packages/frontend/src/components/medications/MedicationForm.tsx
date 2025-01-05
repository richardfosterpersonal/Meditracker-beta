import React from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Paper,
  Grid,
  SelectChangeEvent,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAccessibility } from '../../hooks/useAccessibility';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface MedicationFormValues {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date | null;
  endDate: Date | null;
  instructions: string;
  prescribedBy: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Medication name is required'),
  dosage: Yup.string().required('Dosage is required'),
  frequency: Yup.string().required('Frequency is required'),
  startDate: Yup.date().nullable().required('Start date is required'),
  endDate: Yup.date().nullable().min(
    Yup.ref('startDate'),
    'End date must be after start date'
  ),
  instructions: Yup.string(),
  prescribedBy: Yup.string().required('Prescribing doctor is required'),
});

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice-daily', label: 'Twice Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as-needed', label: 'As Needed' },
];

interface MedicationFormProps {
  onSubmit: (values: MedicationFormValues) => void;
  initialValues?: Partial<MedicationFormValues>;
  mode?: 'create' | 'edit';
}

export const MedicationForm: React.FC<MedicationFormProps> = ({
  onSubmit,
  initialValues,
  mode = 'create',
}) => {
  const { settings } = useAccessibility();
  
  const formik = useFormik<MedicationFormValues>({
    initialValues: {
      name: initialValues?.name || '',
      dosage: initialValues?.dosage || '',
      frequency: initialValues?.frequency || '',
      startDate: initialValues?.startDate || null,
      endDate: initialValues?.endDate || null,
      instructions: initialValues?.instructions || '',
      prescribedBy: initialValues?.prescribedBy || '',
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  const handleFrequencyChange = (event: SelectChangeEvent<string>) => {
    formik.setFieldValue('frequency', event.target.value);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        ...(settings.screenReaderOptimized && {
          p: 4,
        }),
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          ...(settings.screenReaderOptimized && {
            fontSize: '1.5rem',
            mb: 3,
          }),
        }}
      >
        {mode === 'create' ? 'Add New Medication' : 'Edit Medication'}
      </Typography>

      <form onSubmit={formik.handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="name"
              name="name"
              label="Medication Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              required
              inputProps={{
                'aria-label': 'Medication name',
                'aria-required': 'true',
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="dosage"
              name="dosage"
              label="Dosage"
              value={formik.values.dosage}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.dosage && Boolean(formik.errors.dosage)}
              helperText={formik.touched.dosage && formik.errors.dosage}
              required
              inputProps={{
                'aria-label': 'Medication dosage',
                'aria-required': 'true',
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              error={formik.touched.frequency && Boolean(formik.errors.frequency)}
              required
            >
              <InputLabel id="frequency-label">Frequency</InputLabel>
              <Select
                labelId="frequency-label"
                id="frequency"
                name="frequency"
                value={formik.values.frequency}
                onChange={handleFrequencyChange}
                onBlur={formik.handleBlur}
                label="Frequency"
                inputProps={{
                  'aria-label': 'Medication frequency',
                  'aria-required': 'true',
                }}
              >
                {frequencyOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.frequency && formik.errors.frequency && (
                <FormHelperText>{formik.errors.frequency}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="prescribedBy"
              name="prescribedBy"
              label="Prescribed By"
              value={formik.values.prescribedBy}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.prescribedBy && Boolean(formik.errors.prescribedBy)}
              helperText={formik.touched.prescribedBy && formik.errors.prescribedBy}
              required
              inputProps={{
                'aria-label': 'Prescribing doctor',
                'aria-required': 'true',
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={formik.values.startDate}
                onChange={(value) => formik.setFieldValue('startDate', value)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: formik.touched.startDate && Boolean(formik.errors.startDate),
                    helperText: formik.touched.startDate && formik.errors.startDate,
                    inputProps: {
                      'aria-label': 'Start date',
                      'aria-required': 'true',
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={formik.values.endDate}
                onChange={(value) => formik.setFieldValue('endDate', value)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: formik.touched.endDate && Boolean(formik.errors.endDate),
                    helperText: formik.touched.endDate && formik.errors.endDate,
                    inputProps: {
                      'aria-label': 'End date',
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="instructions"
              name="instructions"
              label="Special Instructions"
              multiline
              rows={4}
              value={formik.values.instructions}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.instructions && Boolean(formik.errors.instructions)}
              helperText={formik.touched.instructions && formik.errors.instructions}
              inputProps={{
                'aria-label': 'Special instructions',
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size={settings.screenReaderOptimized ? 'large' : 'medium'}
                aria-label={mode === 'create' ? 'Add medication' : 'Save changes'}
              >
                {mode === 'create' ? 'Add Medication' : 'Save Changes'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};
