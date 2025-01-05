import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  Tooltip,
  List,
  ListItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAccessibility } from '../../hooks/useAccessibility';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  instructions?: string;
  prescribedBy: string;
}

interface MedicationListProps {
  medications: Medication[];
  onEdit: (medication: Medication) => void;
  onDelete: (medicationId: string) => void;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  onEdit,
  onDelete,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const theme = useTheme();
  const { settings } = useAccessibility();

  const handleDeleteClick = (medication: Medication) => {
    setSelectedMedication(medication);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedMedication) {
      onDelete(selectedMedication.id);
      setDeleteDialogOpen(false);
      setSelectedMedication(null);
    }
  };

  const getFrequencyColor = (frequency: string) => {
    const colors: { [key: string]: string } = {
      'daily': 'primary',
      'twice-daily': 'secondary',
      'weekly': 'success',
      'monthly': 'info',
      'as-needed': 'warning',
    };
    return colors[frequency] || 'default';
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <Box role="region" aria-label="Medications list">
      <List sx={{ p: 0 }}>
        {medications.map((medication) => (
          <ListItem
            key={medication.id}
            disablePadding
            sx={{ mb: 2 }}
          >
            <Card
              sx={{
                width: '100%',
                ...(settings.screenReaderOptimized && {
                  p: 1,
                }),
              }}
            >
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      gutterBottom
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <AccessTimeIcon fontSize="small" />
                      Dosage: {medication.dosage}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={medication.frequency}
                        color={getFrequencyColor(medication.frequency)}
                        size={settings.screenReaderOptimized ? 'medium' : 'small'}
                        sx={{ mr: 1 }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <CalendarIcon fontSize="small" />
                      Start: {formatDate(medication.startDate)}
                      {medication.endDate && ` - End: ${formatDate(medication.endDate)}`}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <PersonIcon fontSize="small" />
                      Dr. {medication.prescribedBy}
                    </Typography>
                    {medication.instructions && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Instructions: {medication.instructions}
                      </Typography>
                    )}
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Tooltip title="Edit medication">
                      <IconButton
                        onClick={() => onEdit(medication)}
                        aria-label={`Edit ${medication.name}`}
                        size={settings.screenReaderOptimized ? 'large' : 'medium'}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete medication">
                      <IconButton
                        onClick={() => handleDeleteClick(medication)}
                        aria-label={`Delete ${medication.name}`}
                        size={settings.screenReaderOptimized ? 'large' : 'medium'}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </ListItem>
        ))}
      </List>

      {medications.length === 0 && (
        <Typography
          variant="body1"
          sx={{ textAlign: 'center', mt: 4 }}
          role="status"
        >
          No medications found. Add a medication to get started.
        </Typography>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent id="delete-dialog-description">
          <Typography>
            Are you sure you want to delete {selectedMedication?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            color="primary"
            size={settings.screenReaderOptimized ? 'large' : 'medium'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            size={settings.screenReaderOptimized ? 'large' : 'medium'}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
