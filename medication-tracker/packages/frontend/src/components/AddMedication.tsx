import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import useOfflineAwareRequest from '../hooks/useOfflineAwareRequest';
import useOfflineStatus from '../hooks/useOfflineStatus';
import { ScheduleBuilder, ScheduleConfig } from './ScheduleBuilder';

interface MedicationFormData {
  name: string;
  dosageForm: string;
  strength: string;
  schedule: ScheduleConfig;
  notes?: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Medication name is required'),
  dosageForm: Yup.string().required('Dosage form is required'),
  strength: Yup.string().required('Strength is required'),
  schedule: Yup.object().required('Schedule is required'),
  notes: Yup.string(),
});

const AddMedication: React.FC = () => {
  const navigate = useNavigate();
  const { isOffline } = useOfflineStatus();
  const { request, loading } = useOfflineAwareRequest();
  const [formData, setFormData] = useState<MedicationFormData>({
    name: '',
    dosageForm: '',
    strength: '',
    schedule: {
      type: 'fixed_time',
      fixedTimeSlots: []
    },
    notes: ''
  });

  const handleScheduleChange = (schedule: ScheduleConfig) => {
    setFormData(prev => ({ ...prev, schedule }));
  };

  const formik = useFormik({
    initialValues: formData,
    validationSchema,
    onSubmit: async (values) => {
      try {
        await request('/api/medications', {
          method: 'POST',
          data: values,
          offlineSupport: true,
          syncOperation: 'MEDICATION_LOG',
        });

        navigate('/medications');
      } catch (error) {
        // Error handling is managed by useOfflineAwareRequest
        console.error('Failed to add medication:', error);
      }
    },
  });

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Add New Medication
        </Typography>
        {isOffline && (
          <Typography color="warning.main" sx={{ mb: 2 }}>
            You are offline. Your changes will be saved and synced when you're back online.
          </Typography>
        )}
        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            id="name"
            name="name"
            label="Medication Name"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            margin="normal"
          />
          <TextField
            fullWidth
            id="dosageForm"
            name="dosageForm"
            label="Dosage Form"
            value={formik.values.dosageForm}
            onChange={formik.handleChange}
            error={formik.touched.dosageForm && Boolean(formik.errors.dosageForm)}
            helperText={formik.touched.dosageForm && formik.errors.dosageForm}
            margin="normal"
          />
          <TextField
            fullWidth
            id="strength"
            name="strength"
            label="Strength"
            value={formik.values.strength}
            onChange={formik.handleChange}
            error={formik.touched.strength && Boolean(formik.errors.strength)}
            helperText={formik.touched.strength && formik.errors.strength}
            margin="normal"
          />
          <ScheduleBuilder
            onScheduleChange={handleScheduleChange}
            initialSchedule={formik.values.schedule}
          />
          <TextField
            fullWidth
            id="notes"
            name="notes"
            label="Notes"
            multiline
            rows={4}
            value={formik.values.notes}
            onChange={formik.handleChange}
            error={formik.touched.notes && Boolean(formik.errors.notes)}
            helperText={formik.touched.notes && formik.errors.notes}
            margin="normal"
          />
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? 'Saving...' : 'Add Medication'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/medications')}
              disabled={loading}
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default AddMedication;
