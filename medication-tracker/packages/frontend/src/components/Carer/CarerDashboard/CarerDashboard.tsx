import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
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
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

interface Patient {
  id: string;
  name: string;
  age: number;
  medications: number;
  lastActivity: string;
}

interface MedicationEvent {
  id: string;
  type: 'taken' | 'missed' | 'scheduled';
  medicationName: string;
  timestamp: string;
  notes?: string;
}

const CarerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicationHistory, setMedicationHistory] = useState<MedicationEvent[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchMedicationHistory(selectedPatient.id);
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      const response = await axios.get<Patient[]>('/api/carer/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchMedicationHistory = async (patientId: string) => {
    try {
      const response = await axios.get<MedicationEvent[]>(`/api/carer/patients/${patientId}/medications/history`);
      setMedicationHistory(response.data);
    } catch (error) {
      console.error('Error fetching medication history:', error);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const getStatusColor = (type: MedicationEvent['type']) => {
    switch (type) {
      case 'taken':
        return 'success';
      case 'missed':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Carer Dashboard
      </Typography>

      <Grid container spacing={3}>
        {patients.map((patient) => (
          <Grid item xs={12} sm={6} md={4} key={patient.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {patient.name}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Age: {patient.age}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`${patient.medications} Medications`}
                    color="primary"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`Last active: ${patient.lastActivity}`}
                    color="secondary"
                    size="small"
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => handlePatientSelect(patient)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedPatient && (
          <>
            <DialogTitle>{selectedPatient.name}'s Medication History</DialogTitle>
            <DialogContent>
              <Timeline>
                {medicationHistory.map((event) => (
                  <TimelineItem key={event.id}>
                    <TimelineSeparator>
                      <TimelineDot color={getStatusColor(event.type)} />
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="h6">{event.medicationName}</Typography>
                      <Typography color="textSecondary">
                        {new Date(event.timestamp).toLocaleString()}
                      </Typography>
                      <Typography>Status: {event.type}</Typography>
                      {event.notes && (
                        <Typography color="textSecondary">Notes: {event.notes}</Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CarerDashboard;
