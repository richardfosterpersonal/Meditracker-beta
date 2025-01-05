import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { monitoring } from '../../utils/monitoring';

interface Props {
  children: React.ReactNode;
}

const MedicationErrorBoundary: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    monitoring.captureError(error, {
      component: 'MedicationModule',
      metadata: {
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const ErrorFallback = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        Unable to Load Medication Information
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        We encountered an issue while loading your medication information. This could be due to:
      </Typography>
      <Box sx={{ textAlign: 'left', mb: 3 }}>
        <Typography component="ul" sx={{ pl: 2 }}>
          <li>Temporary connection issues</li>
          <li>Server maintenance</li>
          <li>Outdated browser cache</li>
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="contained" color="primary" onClick={handleRetry}>
          Try Again
        </Button>
        <Button variant="outlined" onClick={handleGoBack}>
          Go Back
        </Button>
        <Button variant="outlined" onClick={handleGoHome}>
          Go to Dashboard
        </Button>
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary
      componentName="MedicationModule"
      handleError={handleError}
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
};

export default MedicationErrorBoundary;
