import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { api } from '../../services/api';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';

interface MedicationStatus {
  id: string;
  name: string;
  lastTaken: string;
  nextDue: string;
  compliance: number;
  status: 'on_track' | 'missed' | 'overdue';
  remainingDoses: number;
}

interface PatientMedicationOverviewProps {
  patientId: string;
}

export const PatientMedicationOverview: React.FC<PatientMedicationOverviewProps> = ({
  patientId
}) => {
  const [medications, setMedications] = useState<MedicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastMessage } = useWebSocketConnection(`/ws/carer/patient/${patientId}/medications`);

  const fetchMedications = async () => {
    try {
      const response = await api.get(`/api/v1/carer/patient/${patientId}/medications`);
      setMedications(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load medication data');
      console.error('Error fetching medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [patientId]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'MEDICATION_STATUS_UPDATE') {
          setMedications(prev => 
            prev.map(med => 
              med.id === data.payload.id ? { ...med, ...data.payload } : med
            )
          );
        }
      } catch (err) {
        console.error('Error processing medication update:', err);
      }
    }
  }, [lastMessage]);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Medication Overview
        </Typography>
        
        {/* Desktop view */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Medication</TableCell>
                  <TableCell>Last Taken</TableCell>
                  <TableCell>Next Due</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Compliance</TableCell>
                  <TableCell>Supply</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell>{med.name}</TableCell>
                    <TableCell>{new Date(med.lastTaken).toLocaleString()}</TableCell>
                    <TableCell>{new Date(med.nextDue).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={med.status}
                        color={
                          med.status === 'on_track'
                            ? 'success'
                            : med.status === 'missed'
                            ? 'warning'
                            : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress
                          variant="determinate"
                          value={med.compliance}
                          size={24}
                          color={med.compliance >= 80 ? 'success' : 'warning'}
                        />
                        <Typography variant="body2">{med.compliance}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{med.remainingDoses} doses</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Mobile view */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {medications.map((med) => (
            <Card
              key={med.id}
              sx={{
                mb: 2,
                '&:last-child': { mb: 0 },
                boxShadow: 'none',
                border: 1,
                borderColor: 'divider'
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {med.name}
                  </Typography>
                  <Chip
                    label={med.status}
                    color={
                      med.status === 'on_track'
                        ? 'success'
                        : med.status === 'missed'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                  />
                </Box>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Taken
                    </Typography>
                    <Typography variant="body2">
                      {new Date(med.lastTaken).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Next Due
                    </Typography>
                    <Typography variant="body2">
                      {new Date(med.nextDue).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Compliance
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress
                        variant="determinate"
                        value={med.compliance}
                        size={20}
                        color={med.compliance >= 80 ? 'success' : 'warning'}
                      />
                      <Typography variant="body2">{med.compliance}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Supply
                    </Typography>
                    <Typography variant="body2">
                      {med.remainingDoses} doses
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
