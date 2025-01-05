import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { liabilityProtection } from '../../utils/liabilityProtection';

interface EmergencyDisclaimerProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function EmergencyDisclaimer({ open, onAccept, onDecline }: EmergencyDisclaimerProps) {
  const [acknowledged, setAcknowledged] = React.useState(false);

  const handleAccept = () => {
    liabilityProtection.logCriticalAction(
      'EMERGENCY_DISCLAIMER_ACCEPTED',
      'current-user',
      {
        timestamp: new Date().toISOString(),
        acknowledged: true
      }
    );
    onAccept();
  };

  const handleDecline = () => {
    liabilityProtection.logCriticalAction(
      'EMERGENCY_DISCLAIMER_DECLINED',
      'current-user',
      {
        timestamp: new Date().toISOString(),
        acknowledged: false
      }
    );
    onDecline();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDecline}
      maxWidth="sm"
      fullWidth
      aria-labelledby="emergency-disclaimer-title"
    >
      <DialogTitle id="emergency-disclaimer-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Important Notice: Not an Emergency Service
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This app is NOT a replacement for emergency services. In case of emergency, 
          directly call your local emergency number.
        </Alert>

        <Typography variant="body1" paragraph>
          This medication tracking app provides features to:
        </Typography>

        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li">
            Notify designated family members and caregivers
          </Typography>
          <Typography component="li">
            Display your current medication list and medical history
          </Typography>
          <Typography component="li">
            Show local emergency service numbers
          </Typography>
          <Typography component="li">
            Coordinate responses from your support network
          </Typography>
        </Box>

        <Typography variant="body1" color="error" paragraph sx={{ mt: 2 }}>
          The app does NOT:
        </Typography>

        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" color="error">
            Directly contact emergency services
          </Typography>
          <Typography component="li" color="error">
            Guarantee immediate response from contacts
          </Typography>
          <Typography component="li" color="error">
            Replace professional medical advice
          </Typography>
          <Typography component="li" color="error">
            Ensure 24/7 monitoring
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          If you're experiencing a medical emergency, immediately dial your local
          emergency number (e.g., 911 in the US) or visit the nearest emergency room.
        </Alert>

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              color="primary"
            />
          }
          label="I understand this is not an emergency service and agree to use it responsibly"
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDecline} color="error">
          Decline
        </Button>
        <Button
          onClick={handleAccept}
          color="primary"
          variant="contained"
          disabled={!acknowledged}
        >
          Accept & Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
