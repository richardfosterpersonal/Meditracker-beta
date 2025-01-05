import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';
import { MedicationActions } from './MedicationActions';
import { MedicationSchedule } from './MedicationSchedule';

interface Medication {
  id: string;
  name: string;
  dosage: {
    amount: string;
    unit: string;
    frequency: string;
    times_per_day: number;
    specific_times: string[];
  };
  schedule: {
    start_date: string;
    end_date?: string;
    reminder_time: number;
    dose_times: string[];
    timezone: string;
  };
  category?: string;
  instructions?: string;
  is_prn: boolean;
  remaining_doses?: number;
  last_taken?: string;
  daily_doses_taken: number;
}

interface MedicationListProps {
  medications: Medication[];
  onEdit: (medicationId: string) => void;
  onDelete: (medicationId: string) => void;
  onTakeDose?: (medicationId: string) => void;
  showCompliance?: boolean;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  onEdit,
  onDelete,
  onTakeDose,
  showCompliance = false,
}) => {
  const theme = useTheme();
  const { settings } = useAccessibility();

  const getStatusColor = (compliance: number) => {
    if (compliance >= 90) return 'success';
    if (compliance >= 70) return 'warning';
    return 'error';
  };

  if (medications.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No medications found. Add a medication to get started.
        </Typography>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {medications.map((medication) => (
        <Grid item xs={12} sm={6} md={4} key={medication.id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              '&:hover': {
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography
                  variant="h6"
                  component="h2"
                  gutterBottom
                  sx={{
                    ...(settings.screenReaderOptimized && {
                      fontSize: '1.3rem',
                    }),
                  }}
                >
                  {medication.name}
                </Typography>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton
                      size={settings.screenReaderOptimized ? 'large' : 'small'}
                      onClick={() => onEdit(medication.id)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size={settings.screenReaderOptimized ? 'large' : 'small'}
                      onClick={() => onDelete(medication.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Typography color="textSecondary" gutterBottom>
                {medication.dosage.amount} {medication.dosage.unit}
              </Typography>

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Next dose: {formatDistanceToNow(new Date(medication.schedule.dose_times[0]))}
                </Typography>
              </Box>

              {showCompliance && (
                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label={`Compliance: ${medication.daily_doses_taken}%`}
                    color={getStatusColor(medication.daily_doses_taken)}
                    size={settings.screenReaderOptimized ? 'medium' : 'small'}
                  />
                  <Chip
                    label={medication.category}
                    variant="outlined"
                    size={settings.screenReaderOptimized ? 'medium' : 'small'}
                  />
                </Box>
              )}

              {medication.instructions && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    Instructions: {medication.instructions}
                  </Typography>
                </Box>
              )}

              {onTakeDose && (
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="primary"
                    size={settings.screenReaderOptimized ? 'large' : 'medium'}
                    onClick={() => onTakeDose(medication.id)}
                  >
                    Take Dose
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export const MedicationListContainer: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { lastMessage } = useWebSocketConnection('/ws/medications');

  const fetchMedications = async () => {
    try {
      const response = await api.get('/api/v1/medications');
      setMedications(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load medications');
      console.error('Error fetching medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        switch (data.type) {
          case 'MEDICATION_UPDATED':
            setMedications(prev => 
              prev.map(med => med.id === data.payload.id ? data.payload : med)
            );
            break;
          case 'MEDICATION_TAKEN':
            setMedications(prev => 
              prev.map(med => {
                if (med.id === data.payload.medicationId) {
                  return {
                    ...med,
                    last_taken: data.payload.timestamp,
                    daily_doses_taken: (med.daily_doses_taken || 0) + 1
                  };
                }
                return med;
              })
            );
            break;
        }
      } catch (err) {
        console.error('Error processing medication update:', err);
      }
    }
  }, [lastMessage]);

  const handleEdit = (medicationId: string) => {
    // Handle edit functionality
  };

  const handleDelete = (medicationId: string) => {
    // Handle delete functionality
  };

  const handleTakeDose = (medicationId: string) => {
    // Handle take dose functionality
  };

  if (loading) {
    return <Box>Loading medications...</Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">My Medications</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          // onClick={() => handleOpenDialog()}
        >
          Add Medication
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <MedicationList
        medications={medications}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTakeDose={handleTakeDose}
      />
    </Box>
  );
};
