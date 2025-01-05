import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircleOutline,
  AccessTime,
  WifiOff,
  Security,
} from '@mui/icons-material';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<'success' | 'dismissed' | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowSnackbar(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    setShowSnackbar(false);
    setShowDialog(true);
  };

  const handleConfirmInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        setInstallOutcome(choiceResult.outcome === 'accepted' ? 'success' : 'dismissed');
      } catch (error) {
        console.error('Error during installation:', error);
      } finally {
        setDeferredPrompt(null);
        setShowDialog(false);
      }
    }
  };

  const handleClose = () => {
    setShowSnackbar(false);
    setShowDialog(false);
  };

  const features = [
    {
      icon: <CheckCircleOutline />,
      text: 'Quick access from your home screen',
    },
    {
      icon: <AccessTime />,
      text: 'Faster load times and better performance',
    },
    {
      icon: <WifiOff />,
      text: 'Works offline or with poor internet',
    },
    {
      icon: <Security />,
      text: 'Secure and private access to your medications',
    },
  ];

  return (
    <>
      <Snackbar
        open={showSnackbar}
        autoHideDuration={10000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          sx={{ width: '100%' }}
          action={
            <Button color="inherit" size="small" onClick={handleInstallClick}>
              Install
            </Button>
          }
        >
          Install Medication Tracker for easier access
        </Alert>
      </Snackbar>

      <Dialog
        open={showDialog}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Install Medication Tracker
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Install our app for the best experience with these benefits:
          </Typography>
          <List>
            {features.map((feature, index) => (
              <ListItem key={index}>
                <ListItemIcon sx={{ color: 'primary.main' }}>
                  {feature.icon}
                </ListItemIcon>
                <ListItemText primary={feature.text} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Not Now</Button>
          <Button
            variant="contained"
            onClick={handleConfirmInstall}
            color="primary"
          >
            Install App
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={installOutcome !== null}
        autoHideDuration={3000}
        onClose={() => setInstallOutcome(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={installOutcome === 'success' ? 'success' : 'info'}
          sx={{ width: '100%' }}
        >
          {installOutcome === 'success'
            ? 'App installed successfully!'
            : 'Installation cancelled'}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InstallPrompt;
