import React from 'react';
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { api } from '../../services/api';

interface MedicationActionsProps {
  medicationId: string;
  medicationName: string;
  onMedicationTaken: () => void;
}

export const MedicationActions: React.FC<MedicationActionsProps> = ({
  medicationId,
  medicationName,
  onMedicationTaken
}) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleTakeMedication = async () => {
    try {
      await api.post(`/api/v1/medications/${medicationId}/taken`, {
        takenAt: new Date().toISOString()
      });
      onMedicationTaken();
      setConfirmOpen(false);
    } catch (error) {
      console.error('Error recording medication:', error);
    }
  };

  return (
    <>
      <ButtonGroup variant="contained" size="small">
        <Button
          startIcon={<CheckIcon />}
          onClick={() => setConfirmOpen(true)}
          color="primary"
          data-testid="take-medication-button"
        >
          Take Now
        </Button>
      </ButtonGroup>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Medication</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark {medicationName} as taken?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleTakeMedication} 
            color="primary"
            data-testid="confirm-take-medication"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
