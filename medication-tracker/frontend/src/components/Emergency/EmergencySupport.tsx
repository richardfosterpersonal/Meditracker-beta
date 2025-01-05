import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  AlertTitle,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  ContactPhone as ContactIcon,
  Print as PrintIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { EmergencySupportService } from '../../services/EmergencySupportService';
import { liabilityProtection } from '../../utils/liabilityProtection';

const emergencySupport = new EmergencySupportService();

export default function EmergencySupport() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [emergencyNumbers, setEmergencyNumbers] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmergencyClick = async () => {
    try {
      const numbers = await emergencySupport.getLocalEmergencyNumbers();
      setEmergencyNumbers(numbers);
      setDialogOpen(true);

      // Log button click for liability
      liabilityProtection.logCriticalAction(
        'EMERGENCY_SUPPORT_OPENED',
        'current-user',
        { timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.error('Failed to get emergency numbers:', error);
      setError('Failed to load emergency information');
    }
  };

  const handleNotifyContacts = async () => {
    if (!description) {
      setError('Please provide a description of the situation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create support situation
      const situation = await emergencySupport.initiateSupport(
        description,
        'HEALTH'
      );

      // Notify contacts
      await emergencySupport.notifyContacts(
        situation.id,
        description
      );

      // Generate printable info
      const supportInfo = await emergencySupport.prepareSupportInfo();

      setDialogOpen(false);
      setDescription('');

      // Show confirmation dialog
      // Implementation would show success message
    } catch (error) {
      console.error('Failed to notify contacts:', error);
      setError('Failed to notify emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        variant="contained"
        color="error"
        startIcon={<ContactIcon />}
        onClick={handleEmergencyClick}
        size="large"
        sx={{
          fontWeight: 'bold',
          py: 2,
          px: 4,
        }}
      >
        Get Emergency Support
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          Emergency Support
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Important Notice</AlertTitle>
              This is not an emergency service. For immediate emergency assistance,
              please call emergency services directly using the numbers below.
            </Alert>

            {emergencyNumbers && (
              <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Emergency Numbers
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Emergency Services"
                      secondary={emergencyNumbers.emergency}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Police"
                      secondary={emergencyNumbers.police}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Ambulance"
                      secondary={emergencyNumbers.ambulance}
                    />
                  </ListItem>
                </List>
              </Paper>
            )}

            <Typography variant="subtitle1" gutterBottom>
              Describe the situation to notify your emergency contacts:
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's happening..."
              sx={{ mb: 2 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={async () => {
                  const info = await emergencySupport.prepareSupportInfo();
                  // Implementation would handle printing
                }}
              >
                Print Emergency Info
              </Button>
              <Button
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={() => {
                  // Implementation would show detailed help
                }}
              >
                Help
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNotifyContacts}
            disabled={loading || !description}
          >
            Notify Emergency Contacts
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
