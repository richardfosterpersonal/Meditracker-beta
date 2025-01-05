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
import { useAuth } from '../contexts/AuthContext';

const CarerDashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medicationHistory, setMedicationHistory] = useState([]);
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
      const response = await axios.get('/api/carer/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchMedicationHistory = async (patientId) => {
    try {
      const response = await axios.get(`/api/medication/history/${patientId}`);
      setMedicationHistory(response.data);
    } catch (error) {
      console.error('Error fetching medication history:', error);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setOpenDialog(true);
  };

  const getComplianceColor = (compliance) => {
    if (compliance >= 90) return 'success';
    if (compliance >= 70) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Carer Dashboard
      </Typography>

      <Grid container spacing={3}>
        {patients.map((patient) => (
          <Grid item xs={12} md={6} key={patient.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{patient.name}</Typography>
                <Typography color="textSecondary" gutterBottom>
                  Compliance Rate:
                  <Chip
                    label={`${patient.compliance_rate}%`}
                    color={getComplianceColor(patient.compliance_rate)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => handlePatientSelect(patient)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPatient?.name}'s Medication Details
        </DialogTitle>
        <DialogContent>
          <Timeline>
            {medicationHistory.map((event) => (
              <TimelineItem key={event.id}>
                <TimelineSeparator>
                  <TimelineDot color={event.taken ? 'success' : 'error'} />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    {event.medication_name}
                  </Typography>
                  <Typography color="textSecondary">
                    {new Date(event.scheduled_time).toLocaleString()}
                  </Typography>
                  <Typography>
                    Status: {event.taken ? 'Taken' : 'Missed'}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CarerDashboard;
