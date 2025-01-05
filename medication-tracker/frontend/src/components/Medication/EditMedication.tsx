import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAccessibility } from '../../hooks/useAccessibility';
import { Medication } from '../../types/medication';

interface EditMedicationProps {
  open: boolean;
  onClose: () => void;
  onSave: (medicationData: Partial<Medication>) => Promise<void>;
  medication?: Medication;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Medication name is required'),
  dosage: Yup.object({
    amount: Yup.string().required('Dosage amount is required'),
    unit: Yup.string().required('Unit is required'),
    frequency: Yup.string().required('Frequency is required'),
    times_per_day: Yup.number().min(1, 'Must take at least once per day'),
  }),
  category: Yup.string(),
  instructions: Yup.string(),
});

export const EditMedication: React.FC<EditMedicationProps> = ({
  open,
  onClose,
  onSave,
  medication,
}) => {
  const { settings } = useAccessibility();

  const formik = useFormik({
    initialValues: {
      name: medication?.name || '',
      dosage: {
        amount: medication?.dosage.amount || '',
        unit: medication?.dosage.unit || '',
        frequency: medication?.dosage.frequency || 'daily',
        times_per_day: medication?.dosage.times_per_day || 1,
        specific_times: medication?.dosage.specific_times || ['09:00'],
      },
      category: medication?.category || '',
      instructions: medication?.instructions || '',
      is_prn: medication?.is_prn || false,
      remaining_doses: medication?.remaining_doses,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await onSave(values);
        onClose();
      } catch (error) {
        console.error('Error saving medication:', error);
      }
    },
    enableReinitialize: true,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          ...(settings.screenReaderOptimized && {
            p: 2,
          }),
        },
      }}
    >
      <DialogTitle>
        <Typography
          variant="h5"
          sx={{
            ...(settings.screenReaderOptimized && {
              fontSize: '1.5rem',
            }),
          }}
        >
          {medication ? 'Edit Medication' : 'Add New Medication'}
        </Typography>
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="name"
                name="name"
                label="Medication Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                size={settings.screenReaderOptimized ? 'medium' : 'small'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="dosage.amount"
                name="dosage.amount"
                label="Dosage Amount"
                value={formik.values.dosage.amount}
                onChange={formik.handleChange}
                error={
                  formik.touched.dosage?.amount &&
                  Boolean(formik.errors.dosage?.amount)
                }
                helperText={
                  formik.touched.dosage?.amount && formik.errors.dosage?.amount
                }
                size={settings.screenReaderOptimized ? 'medium' : 'small'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                error={
                  formik.touched.dosage?.unit && Boolean(formik.errors.dosage?.unit)
                }
                size={settings.screenReaderOptimized ? 'medium' : 'small'}
              >
                <InputLabel>Unit</InputLabel>
                <Select
                  id="dosage.unit"
                  name="dosage.unit"
                  value={formik.values.dosage.unit}
                  onChange={formik.handleChange}
                  label="Unit"
                >
                  <MenuItem value="mg">mg</MenuItem>
                  <MenuItem value="ml">ml</MenuItem>
                  <MenuItem value="tablet">tablet</MenuItem>
                  <MenuItem value="capsule">capsule</MenuItem>
                  <MenuItem value="patch">patch</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl
                fullWidth
                error={
                  formik.touched.dosage?.frequency &&
                  Boolean(formik.errors.dosage?.frequency)
                }
                size={settings.screenReaderOptimized ? 'medium' : 'small'}
              >
                <InputLabel>Frequency</InputLabel>
                <Select
                  id="dosage.frequency"
                  name="dosage.frequency"
                  value={formik.values.dosage.frequency}
                  onChange={formik.handleChange}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="twice-daily">Twice Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="as-needed">As Needed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="category"
                name="category"
                label="Category"
                value={formik.values.category}
                onChange={formik.handleChange}
                size={settings.screenReaderOptimized ? 'medium' : 'small'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="instructions"
                name="instructions"
                label="Instructions"
                multiline
                rows={3}
                value={formik.values.instructions}
                onChange={formik.handleChange}
                size={settings.screenReaderOptimized ? 'medium' : 'small'}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    id="is_prn"
                    name="is_prn"
                    checked={formik.values.is_prn}
                    onChange={formik.handleChange}
                    size={settings.screenReaderOptimized ? 'medium' : 'small'}
                  />
                }
                label="Take as needed (PRN)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onClose}
            size={settings.screenReaderOptimized ? 'large' : 'medium'}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size={settings.screenReaderOptimized ? 'large' : 'medium'}
          >
            {medication ? 'Update' : 'Add'} Medication
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditMedication;
