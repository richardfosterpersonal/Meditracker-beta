import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Tab,
  Tabs,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Warning as WarningIcon,
  ContactPhone as ContactsIcon,
  LocalHospital as MedicalIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { EmergencyButton } from './EmergencyButton';
import { EmergencyDisclaimer } from './EmergencyDisclaimer';
import { EmergencyContactManager } from './EmergencyContactManager';
import { MedicalInfoManager } from './MedicalInfoManager';
import { emergencyContactService } from '../../services/EmergencyContactService';
import { medicalInfoService } from '../../services/MedicalInfoService';
import { liabilityProtection } from '../../utils/liabilityProtection';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`emergency-tabpanel-${index}`}
    aria-labelledby={`emergency-tab-${index}`}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const EmergencyManager: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      // Check if we have any emergency contacts
      const contacts = await emergencyContactService.getAllContacts();
      
      // Check if we have critical medical info
      const medicalInfo = await medicalInfoService.getMedicalInfoSnapshot();
      const validation = await medicalInfoService.validateMedicalInfo();

      if (contacts.length === 0) {
        setNotification({
          open: true,
          message: 'Please add at least one emergency contact',
          severity: 'warning',
        });
      } else if (validation.issues.length > 0) {
        setNotification({
          open: true,
          message: 'Some medical information needs to be completed',
          severity: 'warning',
        });
      }
    } catch (error) {
      console.error('Failed to check emergency setup:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
    liabilityProtection.logCriticalAction(
      'EMERGENCY_DISCLAIMER_ACCEPTED',
      'current-user',
      {
        timestamp: new Date().toISOString(),
      }
    );
  };

  const handleEmergencyActivation = async () => {
    try {
      setEmergencyMode(true);
      
      // Log emergency activation
      liabilityProtection.logCriticalAction(
        'EMERGENCY_MODE_ACTIVATED',
        'current-user',
        {
          timestamp: new Date().toISOString(),
        }
      );

      // Get medical info snapshot
      const medicalInfo = await medicalInfoService.getMedicalInfoSnapshot();

      // Notify emergency contacts
      const notificationResult = await emergencyContactService.notifyContacts({
        severity: 'HIGH',
        medicalInfo,
        message: 'Emergency assistance requested',
      });

      setNotification({
        open: true,
        message: `Emergency contacts notified: ${notificationResult.notified.length} successful, ${notificationResult.failed.length} failed`,
        severity: notificationResult.failed.length === 0 ? 'success' : 'warning',
      });
    } catch (error) {
      console.error('Failed to activate emergency mode:', error);
      setNotification({
        open: true,
        message: 'Failed to notify emergency contacts',
        severity: 'error',
      });
    }
  };

  const handleEmergencyDeactivation = () => {
    setEmergencyMode(false);
    liabilityProtection.logCriticalAction(
      'EMERGENCY_MODE_DEACTIVATED',
      'current-user',
      {
        timestamp: new Date().toISOString(),
      }
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Emergency Management
        </Typography>

        {!disclaimerAccepted && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please review and accept the emergency disclaimer to access all features
          </Alert>
        )}

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EmergencyButton
                disabled={!disclaimerAccepted}
                active={emergencyMode}
                onActivate={handleEmergencyActivation}
                onDeactivate={handleEmergencyDeactivation}
              />
              <Typography>
                {emergencyMode
                  ? 'Emergency mode is active - Contacts are being notified'
                  : 'Press the emergency button to notify your emergency contacts'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="emergency management tabs"
          >
            <Tab
              icon={<ContactsIcon />}
              label="Emergency Contacts"
              id="emergency-tab-0"
              aria-controls="emergency-tabpanel-0"
            />
            <Tab
              icon={<MedicalIcon />}
              label="Medical Information"
              id="emergency-tab-1"
              aria-controls="emergency-tabpanel-1"
            />
            <Tab
              icon={<InfoIcon />}
              label="Disclaimer & Settings"
              id="emergency-tab-2"
              aria-controls="emergency-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <EmergencyContactManager />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <MedicalInfoManager />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Emergency Service Disclaimer
              </Typography>
              <EmergencyDisclaimer
                onAccept={handleDisclaimerAccept}
                accepted={disclaimerAccepted}
              />
            </CardContent>
          </Card>
        </TabPanel>
      </Box>

      <Dialog
        open={showDisclaimer}
        onClose={() => {}}
        disableEscapeKeyDown
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Important Disclaimer
          </Box>
        </DialogTitle>
        <DialogContent>
          <EmergencyDisclaimer
            onAccept={handleDisclaimerAccept}
            accepted={disclaimerAccepted}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDisclaimerAccept}
            disabled={disclaimerAccepted}
          >
            Accept & Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
