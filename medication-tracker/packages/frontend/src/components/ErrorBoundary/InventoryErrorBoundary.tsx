import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { monitoring } from '../../utils/monitoring';
import { Inventory as InventoryIcon } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

const InventoryErrorBoundary: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    monitoring.captureError(error, {
      component: 'InventoryTracker',
      metadata: {
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      },
      severity: 'medium',
      category: 'inventory_management',
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
        <InventoryIcon color="error" sx={{ fontSize: 40 }} />
        <Typography variant="h5" color="error">
          Inventory Management Unavailable
        </Typography>
      </Box>

      <Alert severity="error" sx={{ mb: 2 }}>
        We're unable to manage medication inventory at the moment. Please:
      </Alert>

      <Box sx={{ pl: 3, mb: 3 }}>
        <Typography component="ul" sx={{ listStyleType: 'disc' }}>
          <li>Check your physical medication supply</li>
          <li>Keep track of your medications manually</li>
          <li>Contact your pharmacy if you need refills</li>
          <li>Try refreshing the page</li>
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
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary
      componentName="InventoryTracker"
      handleError={handleError}
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
};

export default InventoryErrorBoundary;
