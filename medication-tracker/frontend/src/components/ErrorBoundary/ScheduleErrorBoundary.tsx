import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { monitoring } from '../../utils/monitoring';

interface Props {
  children: React.ReactNode;
}

const ScheduleErrorBoundary: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    monitoring.captureError(error, {
      component: 'MedicationSchedule',
      metadata: {
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const ErrorFallback = () => (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load medication schedule
      </Alert>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        We encountered an issue while loading your medication schedule. This could affect:
      </Typography>
      
      <Box sx={{ pl: 3, mb: 2 }}>
        <Typography component="ul" sx={{ listStyleType: 'disc' }}>
          <li>Upcoming medication reminders</li>
          <li>Dose tracking</li>
          <li>Adherence monitoring</li>
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" paragraph>
        Your medications are still saved and secure. This is likely a temporary issue.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
        >
          Refresh Schedule
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary
      componentName="MedicationSchedule"
      handleError={handleError}
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ScheduleErrorBoundary;
