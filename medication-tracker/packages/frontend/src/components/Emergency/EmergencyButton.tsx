import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  LocalHospital as HospitalIcon,
  Phone as PhoneIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { emergencyLocalizationService } from '../../services/EmergencyLocalizationService';
import { liabilityProtection } from '../../utils/liabilityProtection';
import EmergencyDisclaimer from './EmergencyDisclaimer';

interface EmergencyButtonProps {
  onEmergencyActivated: () => void;
}

export default function EmergencyButton({ onEmergencyActivated }: EmergencyButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [activating, setActivating] = useState(false);
  const [emergencyNumbers, setEmergencyNumbers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmergencyNumbers();
  }, []);

  const loadEmergencyNumbers = async () => {
    try {
      const numbers = emergencyLocalizationService.getEmergencyNumbers();
      setEmergencyNumbers(numbers);
    } catch (error) {
      console.error('Failed to load emergency numbers:', error);
      setError('Failed to load emergency information');
    }
  };

  const handleEmergencyClick = () => {
    // Show disclaimer first if not previously acknowledged
    const acknowledged = localStorage.getItem('emergency_disclaimer_acknowledged');
    if (!acknowledged) {
      setShowDisclaimer(true);
    } else {
      setShowDialog(true);
    }

    // Log button press for liability
    liabilityProtection.logCriticalAction(
      'EMERGENCY_BUTTON_PRESSED',
      'current-user',
      {
        timestamp: new Date().toISOString()
      }
    );
  };

  const handleDisclaimerAccept = () => {
    localStorage.setItem('emergency_disclaimer_acknowledged', 'true');
    setShowDisclaimer(false);
    setShowDialog(true);
  };

  const handleActivateEmergency = async () => {
    try {
      setActivating(true);
      setError(null);

      // Log activation attempt
      liabilityProtection.logCriticalAction(
        'EMERGENCY_ACTIVATION_STARTED',
        'current-user',
        {
          timestamp: new Date().toISOString()
        }
      );

      // Notify emergency contacts
      // Note: This doesn't directly call emergency services
      await onEmergencyActivated();

      setShowDialog(false);
      
      // Log successful activation
      liabilityProtection.logCriticalAction(
        'EMERGENCY_ACTIVATION_COMPLETED',
        'current-user',
        {
          timestamp: new Date().toISOString(),
          success: true
        }
      );
    } catch (error) {
      console.error('Failed to activate emergency:', error);
      setError('Failed to notify emergency contacts');
      
      // Log activation failure
      liabilityProtection.logCriticalAction(
        'EMERGENCY_ACTIVATION_FAILED',
        'current-user',
        {
          timestamp: new Date().toISOString(),
          error: error.message
        }
      );
    } finally {
      setActivating(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        size="large"
        startIcon={<WarningIcon />}
        onClick={handleEmergencyClick}
        sx={{
          width: '100%',
          height: 64,
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}
      >
        Get Help
      </Button>

      <EmergencyDisclaimer
        open={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={() => setShowDisclaimer(false)}
      />

      <Dialog
        open={showDialog}
        onClose={() => !activating && setShowDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
          Emergency Support
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            This is NOT an emergency service. If you need immediate medical attention,
            directly call emergency services.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Emergency Numbers:
          </Typography>

          <List>
            {emergencyNumbers.map((service) => (
              <ListItem key={service.number}>
                <ListItemIcon>
                  <HospitalIcon />
                </ListItemIcon>
                <ListItemText
                  primary={service.name}
                  secondary={service.number}
                />
                <Button
                  startIcon={<PhoneIcon />}
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    // Just display the number, don't auto-dial
                    liabilityProtection.logCriticalAction(
                      'EMERGENCY_NUMBER_VIEWED',
                      'current-user',
                      {
                        service: service.name,
                        number: service.number,
                        timestamp: new Date().toISOString()
                      }
                    );
                  }}
                >
                  Show Number
                </Button>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            What this will do:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <ShareIcon />
              </ListItemIcon>
              <ListItemText
                primary="Notify your emergency contacts"
                secondary="Family members and caregivers will be notified"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <HospitalIcon />
              </ListItemIcon>
              <ListItemText
                primary="Share your medical information"
                secondary="Current medications and medical history will be available"
              />
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setShowDialog(false)}
            disabled={activating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleActivateEmergency}
            variant="contained"
            color="error"
            disabled={activating}
            startIcon={activating ? <CircularProgress size={20} /> : <WarningIcon />}
          >
            {activating ? 'Notifying Contacts...' : 'Notify Emergency Contacts'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
