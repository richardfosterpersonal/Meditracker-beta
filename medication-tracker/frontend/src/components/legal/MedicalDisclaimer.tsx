import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
  Checkbox,
  FormControlLabel,
  Stack,
  useTheme,
} from '@mui/material';
import {
  WarningAmberOutlined as WarningIcon,
  MedicalInformationOutlined as MedicalIcon,
} from '@mui/icons-material';

interface MedicalDisclaimerProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  showAsDialog?: boolean;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({
  open,
  onClose,
  onAccept,
  showAsDialog = true,
}) => {
  const theme = useTheme();
  const [acknowledged, setAcknowledged] = useState(false);
  const [hasAcceptedBefore, setHasAcceptedBefore] = useState(false);

  useEffect(() => {
    const checkPreviousAcceptance = async () => {
      try {
        const response = await fetch('/api/user/disclaimer-status', {
          credentials: 'include',
        });
        const data = await response.json();
        setHasAcceptedBefore(data.hasAccepted);
      } catch (error) {
        console.error('Failed to check disclaimer status:', error);
      }
    };

    checkPreviousAcceptance();
  }, []);

  const handleAccept = async () => {
    try {
      await fetch('/api/user/accept-disclaimer', {
        method: 'POST',
        credentials: 'include',
      });
      onAccept();
    } catch (error) {
      console.error('Failed to record disclaimer acceptance:', error);
    }
  };

  const DisclaimerContent = () => (
    <Stack spacing={3}>
      <Alert 
        severity="warning" 
        icon={<WarningIcon />}
        sx={{ 
          '& .MuiAlert-icon': {
            fontSize: '2rem',
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Important Medical Disclaimer
        </Typography>
        <Typography>
          This medication tracking app is for informational purposes only and does not provide medical advice.
        </Typography>
      </Alert>

      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          Not a Substitute for Professional Medical Advice
        </Typography>
        <Typography paragraph>
          The content and features provided by this application are intended solely to help you track your medications
          and are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice
          of your physician or other qualified health provider with any questions you may have regarding your medications
          or medical conditions.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom color="error">
          Emergency Situations
        </Typography>
        <Typography paragraph>
          If you think you may have a medical emergency, immediately call your doctor or dial your local emergency services.
          Do not rely on this application for emergency medical needs.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          Medication Information
        </Typography>
        <Typography paragraph>
          While we strive to maintain accurate medication information, we cannot guarantee its completeness or accuracy.
          Always verify medication information with your healthcare provider and refer to the medication packaging
          or insert for the most current information.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          Your Responsibility
        </Typography>
        <Typography paragraph>
          By using this application, you acknowledge that:
        </Typography>
        <ul>
          <li>
            <Typography>
              This app is a tracking tool only and does not provide medical recommendations
            </Typography>
          </li>
          <li>
            <Typography>
              You are responsible for verifying all medication information with your healthcare provider
            </Typography>
          </li>
          <li>
            <Typography>
              You should never change your medication schedule without consulting your healthcare provider
            </Typography>
          </li>
          <li>
            <Typography>
              This app is not a replacement for professional medical care or advice
            </Typography>
          </li>
        </ul>
      </Box>

      {!hasAcceptedBefore && (
        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              color="primary"
            />
          }
          label="I have read and understand this disclaimer"
        />
      )}
    </Stack>
  );

  if (!showAsDialog) {
    return <DisclaimerContent />;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <MedicalIcon color="primary" />
          <Typography variant="h6">Medical Disclaimer</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <DisclaimerContent />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {hasAcceptedBefore ? (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Decline</Button>
            <Button
              onClick={handleAccept}
              variant="contained"
              disabled={!acknowledged}
            >
              Accept and Continue
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
