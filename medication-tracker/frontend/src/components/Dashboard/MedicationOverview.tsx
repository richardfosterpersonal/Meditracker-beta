import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { drugInfoService, DrugInfo } from '../../services/DrugInfoService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface MedicationSummary {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  nextDose: string;
  remainingDoses: number;
  warnings: string[];
}

export const MedicationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || { user: null };
  const [medications, setMedications] = useState<MedicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drugInfo, setDrugInfo] = useState<Record<string, DrugInfo>>({});

  // Initialize WebSocket connection
  const { lastMessage } = useWebSocket(`/api/v1/ws/medications/${user?.id}`);

  const fetchMedicationData = async () => {
    try {
      const response = await fetch('/api/v1/medications/current');
      const data = await response.json();
      setMedications(data);
      
      // Fetch drug info for each medication
      const drugInfoPromises = data.map((med: MedicationSummary) =>
        drugInfoService.getDrugInfo(med.name)
          .then(info => ({ [med.name]: info }))
          .catch(() => ({ [med.name]: null }))
      );
      
      const drugInfoResults = await Promise.all(drugInfoPromises);
      const combinedDrugInfo = drugInfoResults.reduce((acc, info) => ({ ...acc, ...info }), {});
      setDrugInfo(combinedDrugInfo);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching medication data:', err);
      setError('Failed to load medication overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicationData();
  }, []);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (['MEDICATION_ADDED', 'MEDICATION_REMOVED', 'MEDICATION_UPDATE'].includes(data.type)) {
          fetchMedicationData();
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    }
  }, [lastMessage]);

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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Medication Overview</Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchMedicationData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={2}>
          {medications.map((medication) => (
            <Grid item xs={12} key={medication.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        {medication.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {medication.dosage} • {medication.frequency}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Next dose: {medication.nextDose}
                      </Typography>
                      <Box mt={1}>
                        {medication.remainingDoses < 5 && (
                          <Chip
                            size="small"
                            icon={<WarningIcon />}
                            label={`${medication.remainingDoses} doses remaining`}
                            color="warning"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {drugInfo[medication.name]?.warnings?.map((warning, index) => (
                          <Tooltip key={index} title={warning}>
                            <Chip
                              size="small"
                              icon={<InfoIcon />}
                              label="Warning"
                              color="error"
                              sx={{ mr: 1 }}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
