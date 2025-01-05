import React, { useEffect, useState } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Button,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';
import api from '../../api'; // Assuming you have an API client set up

interface Notification {
  id: string;
  type: 'reminder' | 'missed' | 'low_supply' | 'upcoming' | 'overdue';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  patientId?: string;
  medicationId?: string;
  scheduledTime?: string;
}

interface NotificationSystemProps {
  role: 'patient' | 'carer';
  patientIds?: string[];
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ role, patientIds }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [upcomingMedications, setUpcomingMedications] = useState<any[]>([]);
  const { lastMessage } = useWebSocketConnection(
    role === 'carer' && patientIds 
      ? `/ws/carer/notifications/${patientIds.join(',')}`
      : '/ws/notifications'
  );

  // Check for upcoming medications every minute
  useEffect(() => {
    const checkUpcoming = async () => {
      try {
        const response = await api.get('/api/v1/medications/upcoming');
        const medications = response.data;
        
        medications.forEach(med => {
          const dueTime = new Date(med.nextDue).getTime();
          const currentTime = new Date().getTime();
          const timeUntilDue = dueTime - currentTime;
          
          // Alert 30 minutes before medication is due
          if (timeUntilDue > 0 && timeUntilDue <= 30 * 60 * 1000) {
            const notification: Notification = {
              id: `upcoming-${med.id}`,
              type: 'upcoming',
              title: 'Upcoming Medication',
              message: `${med.name} is due in ${Math.round(timeUntilDue / 60000)} minutes`,
              timestamp: new Date().toISOString(),
              priority: 'medium',
              medicationId: med.id,
              scheduledTime: med.nextDue
            };
            setNotifications(prev => [...prev, notification]);
          }
        });
        
        setUpcomingMedications(medications);
      } catch (err) {
        console.error('Error checking upcoming medications:', err);
      }
    };

    const interval = setInterval(checkUpcoming, 60000);
    checkUpcoming(); // Initial check
    
    return () => clearInterval(interval);
  }, []);

  // Process incoming WebSocket notifications
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'NOTIFICATION') {
          const notification: Notification = {
            ...data.payload,
            timestamp: new Date().toISOString()
          };

          // For carers, add high-priority overdue notifications
          if (role === 'carer' && data.payload.type === 'missed') {
            const missedTime = new Date(data.payload.scheduledTime).getTime();
            const currentTime = new Date().getTime();
            const hoursSinceMissed = (currentTime - missedTime) / (1000 * 60 * 60);

            if (hoursSinceMissed >= 1) {
              notification.priority = 'high';
              notification.type = 'overdue';
              notification.title = 'Medication Significantly Overdue';
              notification.message = `Patient has missed ${data.payload.medicationName} for over an hour`;
            }
          }

          setNotifications(prev => [...prev, notification]);
          
          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/medication-icon.png',
              tag: notification.id
            });
          }
        }
      } catch (err) {
        console.error('Error processing notification:', err);
      }
    }
  }, [lastMessage, role]);

  useEffect(() => {
    // Show next notification if one isn't currently showing
    if (!currentNotification && notifications.length > 0) {
      setCurrentNotification(notifications[0]);
      setNotifications(prev => prev.slice(1));
    }
  }, [notifications, currentNotification]);

  const handleClose = () => {
    setCurrentNotification(null);
  };

  const markAsTaken = (medicationId: string) => {
    // Implement mark as taken logic here
  };

  const getSeverity = (type: Notification['type']) => {
    switch (type) {
      case 'reminder':
        return 'info';
      case 'missed':
        return 'warning';
      case 'low_supply':
        return 'error';
      case 'upcoming':
        return 'info';
      case 'overdue':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <>
      {/* Floating notification indicator for mobile */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          zIndex: 1000,
          display: { xs: 'block', md: 'none' }
        }}
      >
        {upcomingMedications.length > 0 && (
          <Box
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              borderRadius: '50%',
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 3,
              mb: 2
            }}
          >
            {upcomingMedications.length}
          </Box>
        )}
      </Box>

      {/* Desktop Notifications */}
      <Snackbar
        open={!!currentNotification}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ 
          vertical: 'top', 
          horizontal: window.innerWidth <= 600 ? 'center' : 'right' 
        }}
        sx={{
          width: { xs: '100%', sm: 'auto' },
          '& .MuiAlert-root': {
            width: { xs: '100%', sm: 'auto' },
            minWidth: { sm: '300px' },
            maxWidth: { sm: '500px' }
          }
        }}
      >
        {currentNotification && (
          <Alert
            severity={getSeverity(currentNotification.type)}
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {currentNotification.type === 'upcoming' && (
                  <Button 
                    color="inherit" 
                    size="small"
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: { xs: '44px', sm: '36px' }, // Larger touch target on mobile
                      px: { xs: 2, sm: 1 }
                    }}
                    onClick={() => markAsTaken(currentNotification.medicationId)}
                  >
                    Mark as Taken
                  </Button>
                )}
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={handleClose}
                  sx={{ 
                    padding: { xs: '12px', sm: '8px' }, // Larger touch target on mobile
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.5rem', sm: '1.25rem' }
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            }
            sx={{
              '& .MuiAlert-message': {
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }
            }}
          >
            <AlertTitle sx={{ fontSize: { xs: '1.1rem', sm: '1rem' } }}>
              {currentNotification.title}
            </AlertTitle>
            {currentNotification.message}
          </Alert>
        )}
      </Snackbar>

      {/* Persistent Medication Reminders Panel */}
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 'auto', md: '50%' },
          bottom: { xs: 0, md: 'auto' },
          right: { xs: 0, md: 0 },
          transform: { xs: 'none', md: 'translateY(-50%)' },
          width: { xs: '100%', md: 'auto' },
          maxWidth: { xs: '100%', md: '350px' },
          backgroundColor: 'background.paper',
          boxShadow: 3,
          borderRadius: { xs: '16px 16px 0 0', md: '8px 0 0 8px' },
          zIndex: 999,
          display: upcomingMedications.length > 0 ? 'block' : 'none'
        }}
      >
        <Box
          sx={{
            p: 2,
            maxHeight: { xs: '40vh', md: '80vh' },
            overflowY: 'auto'
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Upcoming Medications
          </Typography>
          {upcomingMedications.map((med) => (
            <Card
              key={med.id}
              sx={{
                mb: 1,
                '&:last-child': { mb: 0 },
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <CardContent sx={{ 
                p: { xs: 2, sm: 1.5 },
                '&:last-child': { pb: { xs: 2, sm: 1.5 } }
              }}>
                <Typography variant="subtitle1" sx={{ fontSize: { xs: '1rem', sm: '0.875rem' } }}>
                  {med.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '0.75rem' } }}>
                  Due at {new Date(med.nextDue).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </>
  );
};
