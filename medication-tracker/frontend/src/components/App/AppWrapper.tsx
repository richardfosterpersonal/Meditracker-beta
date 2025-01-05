import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';
import { Box, Alert } from '@mui/material';
import { useMedicationContext } from '../../contexts/MedicationContext';

interface AppWrapperProps {
  children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  const { updateMedication } = useMedicationContext();
  
  const { isConnected, error } = useWebSocketConnection('/ws/notifications', {
    onMessage: (message) => {
      switch (message.type) {
        case 'MEDICATION_UPDATE':
          updateMedication(message.payload);
          break;
        case 'MEDICATION_REMINDER':
          // Handle immediate UI feedback for reminders
          break;
        case 'ERROR':
          console.error('WebSocket error:', message.payload);
          break;
      }
    },
  });

  return (
    <ErrorBoundary componentName="Application">
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          data-testid="websocket-error"
        >
          Connection Error: {error.message}
        </Alert>
      )}
      
      {!isConnected && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          data-testid="websocket-disconnected"
        >
          Reconnecting to server...
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {children}
      </Box>
    </ErrorBoundary>
  );
};
