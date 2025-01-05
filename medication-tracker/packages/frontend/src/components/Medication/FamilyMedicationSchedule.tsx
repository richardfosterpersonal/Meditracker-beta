import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Medication as MedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useMedicationSchedule } from '../../hooks/useMedicationSchedule';
import { useNotifications } from '../../hooks/useNotifications';
import { liabilityProtection } from '../../utils/liabilityProtection';
import { MedicationConfirmDialog } from './MedicationConfirmDialog';

interface ScheduleItem {
  id: string;
  userId: string;
  userName: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'DELAYED';
  instructions: string;
  emergencyInstructions?: string;
}

export default function FamilyMedicationSchedule() {
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  
  const { schedule, loading, error, markMedicationStatus } = useMedicationSchedule();
  const { sendNotification } = useNotifications();

  useEffect(() => {
    // Log schedule view for liability
    liabilityProtection.logHealthDataAccess(
      'current-user',
      'READ',
      'MEDICATION_SCHEDULE'
    );
  }, []);

  const handleStatusUpdate = async (item: ScheduleItem, newStatus: ScheduleItem['status']) => {
    try {
      // Generate liability waiver for medication action
      const waiver = liabilityProtection.generateLiabilityWaiver(
        'MEDICATION_STATUS_UPDATE',
        'current-user'
      );

      // Log critical action
      liabilityProtection.logCriticalAction(
        'MEDICATION_STATUS_CHANGE',
        'current-user',
        {
          medicationId: item.medicationId,
          oldStatus: item.status,
          newStatus,
          timestamp: new Date().toISOString(),
        },
        true
      );

      await markMedicationStatus(item.id, newStatus);

      // Notify relevant family members
      if (newStatus === 'MISSED' || newStatus === 'DELAYED') {
        sendNotification({
          type: 'MEDICATION_ALERT',
          priority: 'HIGH',
          message: `${item.userName}'s medication ${item.medicationName} was ${newStatus.toLowerCase()}`,
          data: {
            medicationId: item.medicationId,
            scheduledTime: item.scheduledTime,
          },
        });
      }
    } catch (error) {
      console.error('Error updating medication status:', error);
      // Log error for liability
      liabilityProtection.logLiabilityRisk(
        'MEDICATION_UPDATE_FAILED',
        'HIGH',
        { error, item }
      );
    }
  };

  const getStatusColor = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'TAKEN':
        return 'success';
      case 'MISSED':
        return 'error';
      case 'DELAYED':
        return 'warning';
      default:
        return 'info';
    }
  };

  const handleEmergencyAction = (item: ScheduleItem) => {
    setSelectedItem(item);
    setEmergencyDialogOpen(true);
    
    // Log emergency action
    liabilityProtection.logCriticalAction(
      'MEDICATION_EMERGENCY',
      'current-user',
      {
        medicationId: item.medicationId,
        timestamp: new Date().toISOString(),
      },
      true
    );
  };

  if (loading) {
    return <Typography>Loading medication schedule...</Typography>;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading medication schedule. Please try again or contact support.
      </Alert>
    );
  }

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            Family Medication Schedule
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              liabilityProtection.logHealthDataAccess(
                'current-user',
                'READ',
                'EXPORT_SCHEDULE'
              );
              // Implement export functionality
            }}
          >
            Export Schedule
          </Button>
        </Box>

        <Timeline position="alternate">
          {schedule.map((item) => (
            <TimelineItem key={item.id}>
              <TimelineSeparator>
                <TimelineDot color={getStatusColor(item.status)}>
                  <MedIcon />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              
              <TimelineContent>
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" component="div">
                      {item.userName}
                    </Typography>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" component="div">
                    {item.medicationName} - {item.dosage}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Scheduled: {format(new Date(item.scheduledTime), 'h:mm a')}
                  </Typography>
                  
                  <Box mt={2} display="flex" gap={1}>
                    {item.status === 'PENDING' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          setSelectedItem(item);
                          setConfirmDialogOpen(true);
                        }}
                      >
                        Mark as Taken
                      </Button>
                    )}
                    
                    {item.status !== 'TAKEN' && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleEmergencyAction(item)}
                      >
                        <WarningIcon />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Paper>

      {/* Confirmation Dialog */}
      <MedicationConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          if (selectedItem) {
            handleStatusUpdate(selectedItem, 'TAKEN');
          }
          setConfirmDialogOpen(false);
        }}
        medication={selectedItem?.medicationName || ''}
        dosage={selectedItem?.dosage || ''}
      />

      {/* Emergency Instructions Dialog */}
      <Dialog
        open={emergencyDialogOpen}
        onClose={() => setEmergencyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
          Emergency Instructions
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Important Safety Information</AlertTitle>
              {selectedItem?.emergencyInstructions || 'Contact emergency services immediately'}
            </Alert>
            <Typography variant="body1" paragraph>
              Medication: {selectedItem?.medicationName}
              <br />
              Scheduled Time: {selectedItem?.scheduledTime && 
                format(new Date(selectedItem.scheduledTime), 'h:mm a')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              // Implement emergency contact
              setEmergencyDialogOpen(false);
            }}
          >
            Contact Emergency Services
          </Button>
          <Button
            onClick={() => setEmergencyDialogOpen(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
