import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Alert,
  useTheme,
} from '@mui/material';
import {
  SecurityOutlined as SecurityIcon,
  PrivacyTipOutlined as PrivacyIcon,
  PhoneAndroidOutlined as PhoneIcon,
  HistoryOutlined as HistoryIcon,
  KeyOutlined as KeyIcon,
} from '@mui/icons-material';
import { TwoFactorSetup } from '../components/security/TwoFactorSetup';
import { ConsentManagement } from '../components/security/ConsentManagement';

export const SecuritySettings: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState({
    twoFactorEnabled: false,
    consentGiven: false,
    lastLogin: null as string | null,
    deviceCount: 0,
    securityScore: 0,
  });
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showConsentManagement, setShowConsentManagement] = useState(false);

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  const fetchSecurityStatus = async () => {
    try {
      const response = await fetch('/api/user/security-status', {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSecurityStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = () => {
    if (!securityStatus.twoFactorEnabled) {
      setShowTwoFactorSetup(true);
    } else {
      // Handle 2FA disable flow
      if (window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        disable2FA();
      }
    }
  };

  const disable2FA = async () => {
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      setSecurityStatus(prev => ({
        ...prev,
        twoFactorEnabled: false,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
  };

  const handleTwoFactorComplete = () => {
    setShowTwoFactorSetup(false);
    setSecurityStatus(prev => ({
      ...prev,
      twoFactorEnabled: true,
    }));
  };

  const SecurityScoreCard = () => (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 4,
        background: theme.palette.primary.main,
        color: 'white',
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="h5" gutterBottom>
            Security Score: {securityStatus.securityScore}/100
          </Typography>
          <Typography variant="body1">
            {securityStatus.securityScore >= 80
              ? 'Your account is well protected! Keep up the good work.'
              : 'There are some recommended actions to improve your account security.'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            onClick={() => setShowConsentManagement(true)}
          >
            Review Security
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Security & Privacy Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <SecurityScoreCard />

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Security
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <PhoneIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Two-Factor Authentication"
                  secondary={securityStatus.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={securityStatus.twoFactorEnabled}
                    onChange={handleToggle2FA}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemIcon>
                  <PrivacyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Privacy Consent"
                  secondary={securityStatus.consentGiven ? 'Provided' : 'Not provided'}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowConsentManagement(true)}
                  >
                    Review
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemIcon>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Last Login"
                  secondary={securityStatus.lastLogin || 'Never'}
                />
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemIcon>
                  <KeyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Connected Devices"
                  secondary={`${securityStatus.deviceCount} device(s)`}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                  >
                    Manage
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Recommendations
            </Typography>
            <List>
              {!securityStatus.twoFactorEnabled && (
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Enable Two-Factor Authentication"
                    secondary="Add an extra layer of security to your account"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setShowTwoFactorSetup(true)}
                    >
                      Enable
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              )}

              {!securityStatus.consentGiven && (
                <ListItem>
                  <ListItemIcon>
                    <PrivacyIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Review Privacy Settings"
                    secondary="Update your consent preferences"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setShowConsentManagement(true)}
                    >
                      Review
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <TwoFactorSetup
        open={showTwoFactorSetup}
        onClose={() => setShowTwoFactorSetup(false)}
        onComplete={handleTwoFactorComplete}
      />

      <ConsentManagement
        open={showConsentManagement}
        onClose={() => setShowConsentManagement(false)}
      />
    </Container>
  );
};
