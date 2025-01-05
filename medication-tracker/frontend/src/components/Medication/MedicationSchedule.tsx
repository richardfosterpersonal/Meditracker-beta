import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { api } from '../../services/api';
import ScheduleErrorBoundary from '../ErrorBoundary/ScheduleErrorBoundary';
import ScheduleLoadingState from './MedicationSchedule/ScheduleLoadingState';

interface ScheduleTime {
  hour: number;
  minute: number;
  daysOfWeek: number[];
}

interface MedicationSchedule {
  id: string;
  medicationId: string;
  times: ScheduleTime[];
  startDate: string;
  endDate?: string;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
}

interface MedicationScheduleProps {
  medicationId: string;
  onScheduleUpdate?: () => void;
}

export const MedicationSchedule: React.FC<MedicationScheduleProps> = ({
  medicationId,
  onScheduleUpdate
}) => {
  const [schedule, setSchedule] = useState<MedicationSchedule | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTime, setEditingTime] = useState<ScheduleTime | null>(null);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchSchedule();
  }, [medicationId]);

  const fetchSchedule = async () => {
    try {
      const response = await api.get(`/api/v1/medications/${medicationId}/schedule`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTime = () => {
    setEditingTime({
      hour: 9,
      minute: 0,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0]
    });
    setEditDialogOpen(true);
  };

  const handleEditTime = (time: ScheduleTime) => {
    setEditingTime(time);
    setEditDialogOpen(true);
  };

  const handleSaveTime = async () => {
    if (!editingTime || !schedule) return;

    try {
      const updatedTimes = editingTime.id
        ? schedule.times.map(t => (t.id === editingTime.id ? editingTime : t))
        : [...schedule.times, editingTime];

      await api.put(`/api/v1/medications/${medicationId}/schedule`, {
        ...schedule,
        times: updatedTimes
      });

      setSchedule(prev => prev ? { ...prev, times: updatedTimes } : null);
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Error saving schedule time:', error);
    }

    setEditDialogOpen(false);
    setEditingTime(null);
  };

  const handleDeleteTime = async (timeId: string) => {
    if (!schedule) return;

    try {
      const updatedTimes = schedule.times.filter(t => t.id !== timeId);
      await api.put(`/api/v1/medications/${medicationId}/schedule`, {
        ...schedule,
        times: updatedTimes
      });

      setSchedule(prev => prev ? { ...prev, times: updatedTimes } : null);
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Error deleting schedule time:', error);
    }
  };

  const handleFrequencyChange = async (frequency: 'daily' | 'weekly' | 'monthly') => {
    if (!schedule) return;

    try {
      const updatedSchedule = {
        ...schedule,
        frequency,
        daysOfWeek: frequency === 'weekly' ? [1, 2, 3, 4, 5] : undefined,
        daysOfMonth: frequency === 'monthly' ? [1] : undefined
      };

      await api.put(`/api/v1/medications/${medicationId}/schedule`, updatedSchedule);
      setSchedule(updatedSchedule);
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Error updating frequency:', error);
    }
  };

  if (loading) {
    return <ScheduleLoadingState loadingId="schedule_initial_load" />;
  }

  return (
    <ScheduleErrorBoundary>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Medication Schedule</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={handleAddTime}
            >
              Add Time
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={schedule?.frequency || 'daily'}
                  onChange={(e) => handleFrequencyChange(e.target.value as any)}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {schedule?.frequency === 'weekly' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Days of Week
                </Typography>
                <Box display="flex" gap={1}>
                  {daysOfWeek.map((day, index) => (
                    <Chip
                      key={day}
                      label={day}
                      color={schedule.daysOfWeek?.includes(index) ? 'primary' : 'default'}
                      onClick={() => {
                        const updatedDays = schedule.daysOfWeek?.includes(index)
                          ? schedule.daysOfWeek.filter(d => d !== index)
                          : [...(schedule.daysOfWeek || []), index];
                        handleFrequencyChange('weekly');
                      }}
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {schedule?.times.map((time) => (
              <Grid item xs={12} key={time.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography>
                        {String(time.hour).padStart(2, '0')}:
                        {String(time.minute).padStart(2, '0')}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTime(time)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTime(time.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
            <DialogTitle>
              {editingTime?.id ? 'Edit Schedule Time' : 'Add Schedule Time'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <TimePicker
                  label="Time"
                  value={new Date().setHours(editingTime?.hour || 0, editingTime?.minute || 0)}
                  onChange={(newValue) => {
                    if (newValue && editingTime) {
                      setEditingTime({
                        ...editingTime,
                        hour: newValue.getHours(),
                        minute: newValue.getMinutes()
                      });
                    }
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTime} variant="contained">
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </ScheduleErrorBoundary>
  );
};
