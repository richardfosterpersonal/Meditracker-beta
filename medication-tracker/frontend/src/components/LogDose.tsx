import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import useOfflineAwareRequest from '../hooks/useOfflineAwareRequest';
import useOfflineStatus from '../hooks/useOfflineStatus';
import { AuditLogger } from '../utils/auditLog';
import { MedicationSafety } from '../utils/medicationSafety';
import { toast } from '../utils/toast';

const validationSchema = Yup.object({
  takenAt: Yup.date().required('Time taken is required'),
  status: Yup.string().required('Status is required'),
  notes: Yup.string(),
});

interface LogDoseProps {
  medication: any;
  onSuccess: () => void;
  userId: string;
}

const LogDose: React.FC<LogDoseProps> = ({ medication, onSuccess, userId }) => {
  const navigate = useNavigate();
  const { medicationId } = useParams<{ medicationId: string }>();
  const { isOffline } = useOfflineStatus();
  const { request, loading } = useOfflineAwareRequest();
  const [isLoading, setIsLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      takenAt: new Date(),
      status: 'taken',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      handleLogDose(values);
    },
  });

  const handleLogDose = async (values: any) => {
    setIsLoading(true);
    try {
      // Perform safety check
      const safetyCheck = await MedicationSafety.checkSafety(medication.id, userId);

      if (!safetyCheck.safe) {
        // Show warnings in UI
        safetyCheck.errors.forEach((error: string) => {
          toast.error(error);
        });

        safetyCheck.warnings.forEach((warning: string) => {
          toast.warning(warning);
        });

        if (safetyCheck.interactions.length > 0) {
          safetyCheck.interactions.forEach((interaction: any) => {
            toast.warning(
              `${interaction.severity.toUpperCase()} interaction with ${interaction.medicationB}: ${interaction.description}`
            );
          });
        }

        if (safetyCheck.errors.length > 0) {
          setIsLoading(false);
          return; // Don't proceed if there are errors
        }
      }

      // Record the dose
      await MedicationSafety.recordDose(medication.id, userId);

      // Continue with existing dose logging logic
      try {
        await request('/api/doses', {
          method: 'POST',
          data: {
            ...values,
            medicationId,
            takenAt: values.takenAt.toISOString(),
          },
          offlineSupport: true,
          syncOperation: 'DOSE_LOG',
        });

        // Audit log the medication intake
        await AuditLogger.log(
          'medication_taken',
          userId,
          {
            medicationId,
            medicationName: 'medicationName', // Replace with actual medicationName
            dosage: 'dosage', // Replace with actual dosage
            scheduledTime: 'scheduledTime', // Replace with actual scheduledTime
            actualTime: new Date().toISOString(),
            success: true,
          },
          'info'
        );

        navigate(`/medications/${medicationId}`);
      } catch (error) {
        // Error handling is managed by useOfflineAwareRequest
        console.error('Failed to log dose:', error);

        // Audit log the failure
        await AuditLogger.log(
          'medication_taken_failed',
          userId,
          {
            medicationId,
            medicationName: 'medicationName', // Replace with actual medicationName
            dosage: 'dosage', // Replace with actual dosage
            scheduledTime: 'scheduledTime', // Replace with actual scheduledTime
            actualTime: new Date().toISOString(),
            success: false,
            error: error.message,
          },
          'error'
        );
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to log dose:', error);
      toast.error('Failed to log dose. Please try again.');

      // Log the error
      await AuditLogger.log(
        'dose_log_failed',
        userId,
        {
          medicationId: medication.id,
          error: error.message,
          success: false,
        },
        'error'
      );
    }
    setIsLoading(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Log Medication Dose
        </Typography>
        {isOffline && (
          <Typography color="warning.main" sx={{ mb: 2 }}>
            You are offline. Your dose log will be saved and synced when you're back online.
          </Typography>
        )}
        <form onSubmit={formik.handleSubmit}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Time Taken"
              value={formik.values.takenAt}
              onChange={(value) => formik.setFieldValue('takenAt', value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="normal"
                  error={formik.touched.takenAt && Boolean(formik.errors.takenAt)}
                  helperText={formik.touched.takenAt && formik.errors.takenAt}
                />
              )}
            />
          </LocalizationProvider>

          <FormControl fullWidth margin="normal">
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              id="status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              error={formik.touched.status && Boolean(formik.errors.status)}
              label="Status"
            >
              <MenuItem value="taken">Taken</MenuItem>
              <MenuItem value="missed">Missed</MenuItem>
              <MenuItem value="skipped">Skipped</MenuItem>
            </Select>
          </FormControl>

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
              disabled={isLoading || loading}
              sx={{ flex: 1 }}
            >
              {isLoading || loading ? 'Saving...' : 'Log Dose'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(`/medications/${medicationId}`)}
              disabled={isLoading || loading}
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

export default LogDose;
