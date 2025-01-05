import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Box, Typography, Button, Alert, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { monitoring } from '../../utils/monitoring';
import { WarningAmber } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

const DrugInteractionErrorBoundary: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    monitoring.captureError(error, {
      component: 'DrugInteractions',
      metadata: {
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      },
      severity: 'high', // Drug interactions are critical for patient safety
      category: 'medication_safety',
    });
  };

  const ErrorFallback = () => (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxWidth: 600,
        mx: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <WarningAmber color="error" sx={{ fontSize: 40 }} />
        <Typography variant="h5" color="error">
          Drug Interaction Check Unavailable
        </Typography>
      </Box>

      <Alert severity="error" sx={{ mb: 2 }}>
        We're unable to check for drug interactions at the moment. For your safety:
      </Alert>

      <Box sx={{ pl: 3, mb: 3 }}>
        <Typography component="ul" sx={{ listStyleType: 'disc' }}>
          <li>Consult your healthcare provider before taking any medications</li>
          <li>Review your current medication list with your pharmacist</li>
          <li>Check for interactions using reliable external resources</li>
          <li>Monitor yourself for any adverse reactions</li>
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" color="text.secondary" paragraph>
        Emergency Contacts:
      </Typography>

      <Box sx={{ pl: 3, mb: 3 }}>
        <Typography component="ul" sx={{ listStyleType: 'none' }}>
          <li>🚑 Emergency Services: 911</li>
          <li>☎️ Poison Control: 1-800-222-1222</li>
          <li>💊 Pharmacy: [Your saved pharmacy number]</li>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/medications')}
        >
          View Medications
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => navigate('/emergency')}
        >
          Emergency Info
        </Button>
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary
      componentName="DrugInteractions"
      handleError={handleError}
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
};

export default DrugInteractionErrorBoundary;
