import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { format, isAfter, isBefore, addHours } from 'date-fns';
import { api } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

interface Dose {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  status: 'pending' | 'taken' | 'missed';
  dosage: string;
  instructions: string;
}

export const UpcomingDoses: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection
  const { lastMessage } = useWebSocket(`/api/v1/ws/medications/${user?.id}`);

  const fetchDoses = async () => {
    try {
      const response = await api.get('/api/v1/medications/upcoming-doses');
      const processedDoses = response.data.map((dose: any) => ({
        id: dose.id,
        medicationId: dose.medication_id,
        medicationName: dose.medication_name,
        scheduledTime: dose.scheduled_time,
        status: dose.status,
        dosage: dose.dosage,
        instructions: dose.instructions
      }));
      setDoses(processedDoses);
      setError(null);
    } catch (err) {
      console.error('Error fetching upcoming doses:', err);
      setError('Failed to load upcoming doses');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchDoses();
    // Polling every minute as fallback
    const interval = setInterval(fetchDoses, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        switch (data.type) {
          case 'DOSE_UPDATE':
          case 'MEDICATION_SCHEDULE_UPDATE':
          case 'MEDICATION_ADDED':
          case 'MEDICATION_REMOVED':
            fetchDoses();
            break;
          case 'DOSE_REMINDER':
            // Update specific dose status without full refresh
            setDoses(prevDoses => 
              prevDoses.map(dose => 
                dose.id === data.payload.doseId
                  ? { ...dose, status: data.payload.status }
                  : dose
              )
            );
            break;
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    }
  }, [lastMessage]);

  const handleTakeDose = async (doseId: string) => {
    try {
      await api.post(`/api/v1/medications/doses/${doseId}/take`);
      await fetchDoses(); // Refresh the list
    } catch (err) {
      console.error('Error marking dose as taken:', err);
      setError('Failed to mark dose as taken');
    }
  };

  const handleSkipDose = async (doseId: string) => {
    try {
      await api.post(`/api/v1/medications/doses/${doseId}/skip`);
      await fetchDoses(); // Refresh the list
    } catch (err) {
      console.error('Error marking dose as skipped:', err);
      setError('Failed to mark dose as skipped');
    }
  };

  const getStatusColor = (status: string, scheduledTime: string) => {
    const now = new Date();
    const doseTime = new Date(scheduledTime);
    const lateThreshold = addHours(doseTime, 1); // Consider dose late after 1 hour

    if (status === 'taken') return theme.palette.success.main;
    if (status === 'missed') return theme.palette.error.main;
    if (isAfter(now, lateThreshold)) return theme.palette.warning.main;
    return theme.palette.info.main;
  };

  const getStatusLabel = (status: string, scheduledTime: string) => {
    const now = new Date();
    const doseTime = new Date(scheduledTime);
    const lateThreshold = addHours(doseTime, 1);

    if (status === 'taken') return 'Taken';
    if (status === 'missed') return 'Missed';
    if (isAfter(now, lateThreshold)) return 'Late';
    if (isBefore(now, doseTime)) return 'Upcoming';
    return 'Due Now';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upcoming Doses
        </Typography>

        {doses.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
            No upcoming doses scheduled
          </Typography>
        ) : (
          <List>
            {doses.map((dose, index) => (
              <React.Fragment key={dose.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {dose.medicationName}
                        </Typography>
                        <Chip
                          size="small"
                          label={getStatusLabel(dose.status, dose.scheduledTime)}
                          sx={{
                            backgroundColor: getStatusColor(dose.status, dose.scheduledTime),
                            color: 'white'
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {format(new Date(dose.scheduledTime), 'h:mm a')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          {dose.dosage} • {dose.instructions}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  {dose.status === 'pending' && (
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        color="success"
                        onClick={() => handleTakeDose(dose.id)}
                        title="Mark as taken"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleSkipDose(dose.id)}
                        title="Skip dose"
                        sx={{ ml: 1 }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={fetchDoses}
            startIcon={<AccessTimeIcon />}
          >
            Refresh
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
