import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Box,
  useTheme,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { Medication } from '../../../store/slices/medicationSlice';

interface MedicationListProps {
  medications: Medication[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();

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
                <Typography variant="h6" component="h2" gutterBottom>
                  {medication.name}
                </Typography>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(medication.id)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(medication.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Typography color="textSecondary" gutterBottom>
                {medication.dosage}
              </Typography>

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Next dose: {format(new Date(medication.nextDose), 'PPp')}
                </Typography>
              </Box>

              <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                <Chip
                  label={`${medication.compliance}% Compliance`}
                  color={getStatusColor(medication.compliance)}
                  size="small"
                />
                <Chip
                  label={medication.category}
                  variant="outlined"
                  size="small"
                />
                {medication.reminderEnabled && (
                  <Chip
                    label="Reminders On"
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              {medication.instructions && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    Instructions: {medication.instructions}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default MedicationList;
