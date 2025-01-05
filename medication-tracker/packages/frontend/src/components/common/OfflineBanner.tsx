import React from 'react';
import { Alert, Snackbar } from '@mui/material';
import useOfflineStatus from '../../hooks/useOfflineStatus';

const OfflineBanner: React.FC = () => {
  const { isOffline } = useOfflineStatus();

  return (
    <Snackbar
      open={isOffline}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 90, sm: 0 } }} // Adjust for bottom navigation on mobile
    >
      <Alert
        severity="warning"
        variant="filled"
        sx={{
          width: '100%',
          '& .MuiAlert-icon': {
            fontSize: '1.5rem',
          },
        }}
      >
        You are currently offline. Some features may be limited.
      </Alert>
    </Snackbar>
  );
};

export default OfflineBanner;
