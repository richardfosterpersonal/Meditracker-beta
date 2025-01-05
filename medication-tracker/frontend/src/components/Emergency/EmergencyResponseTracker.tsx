import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  LocalHospital as HospitalIcon,
  LocalPolice as PoliceIcon,
  Fireplace as FireIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { emergencyServiceIntegration } from '../../services/EmergencyServiceIntegration';
import { liabilityProtection } from '../../utils/liabilityProtection';

interface EmergencyResponseTrackerProps {
  emergencyId: string;
  trackingIds: string[];
  onComplete?: () => void;
}

export default function EmergencyResponseTracker({
  emergencyId,
  trackingIds,
  onComplete,
}: EmergencyResponseTrackerProps) {
  const [responses, setResponses] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const trackResponses = async () => {
      try {
        const updatedResponses = new Map();
        
        for (const trackingId of trackingIds) {
          const response = await emergencyServiceIntegration.trackResponse(trackingId);
          updatedResponses.set(trackingId, response);
        }
        
        setResponses(updatedResponses);
        setLoading(false);

        // Log tracking update for liability
        liabilityProtection.logCriticalAction(
          'EMERGENCY_RESPONSES_TRACKED',
          'current-user',
          {
            emergencyId,
            trackingIds,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error('Failed to track responses:', error);
        setError('Failed to track emergency responses');
        setLoading(false);
      }
    };

    const interval = setInterval(trackResponses, 10000); // Update every 10 seconds
    trackResponses(); // Initial tracking

    return () => clearInterval(interval);
  }, [emergencyId, trackingIds]);

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'AMBULANCE':
        return <HospitalIcon />;
      case 'POLICE':
        return <PoliceIcon />;
      case 'FIRE':
        return <FireIcon />;
      default:
        return <WarningIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return 'info';
      case 'EN_ROUTE':
        return 'warning';
      case 'ARRIVED':
        return 'success';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleCancelResponse = async () => {
    if (!selectedTrackingId || !cancelReason) return;

    try {
      await emergencyServiceIntegration.cancelResponse(selectedTrackingId, cancelReason);
      
      // Update responses
      const updatedResponses = new Map(responses);
      const response = updatedResponses.get(selectedTrackingId);
      updatedResponses.set(selectedTrackingId, { ...response, status: 'CANCELLED' });
      setResponses(updatedResponses);
      
      setCancelDialogOpen(false);
      setSelectedTrackingId(null);
      setCancelReason('');
    } catch (error) {
      console.error('Failed to cancel response:', error);
      setError('Failed to cancel emergency response');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Emergency Response Status
      </Typography>

      <Timeline position="alternate">
        {Array.from(responses.entries()).map(([trackingId, response]) => (
          <TimelineItem key={trackingId}>
            <TimelineOppositeContent>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(response.timestamp), 'HH:mm:ss')}
              </Typography>
              {response.eta && (
                <Typography variant="caption" color="text.secondary">
                  ETA: {response.eta}
                </Typography>
              )}
            </TimelineOppositeContent>

            <TimelineSeparator>
              <TimelineDot color={getStatusColor(response.status)}>
                {getServiceIcon(response.type)}
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>

            <TimelineContent>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">
                      {response.type} Response Unit
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Chip
                      label={response.status}
                      color={getStatusColor(response.status)}
                      size="small"
                    />
                  </Grid>
                  {response.location && (
                    <Grid item xs={12}>
                      <Button
                        startIcon={<LocationIcon />}
                        size="small"
                        onClick={() => {
                          // Handle location view
                        }}
                      >
                        View Location
                      </Button>
                    </Grid>
                  )}
                  {response.status !== 'CANCELLED' && response.status !== 'COMPLETED' && (
                    <Grid item xs={12}>
                      <Button
                        startIcon={<CancelIcon />}
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelectedTrackingId(trackingId);
                          setCancelDialogOpen(true);
                        }}
                      >
                        Cancel Response
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Emergency Response</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to cancel this emergency response?
          </Alert>
          <Typography variant="body2" gutterBottom>
            Please provide a reason for cancellation:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Active
          </Button>
          <Button
            color="error"
            onClick={handleCancelResponse}
            disabled={!cancelReason}
          >
            Cancel Response
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
