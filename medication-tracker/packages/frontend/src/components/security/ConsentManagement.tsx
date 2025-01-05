import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  Alert,
  Divider,
  Stack,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { 
  PrivacyTipOutlined as PrivacyIcon,
  SecurityOutlined as SecurityIcon,
  HealthAndSafetyOutlined as HealthIcon,
} from '@mui/icons-material';

interface ConsentSettings {
  dataCollection: boolean;
  dataSharing: boolean;
  marketingCommunications: boolean;
  researchParticipation: boolean;
  emergencyAccess: boolean;
}

interface ConsentManagementProps {
  open: boolean;
  onClose: () => void;
}

export const ConsentManagement: React.FC<ConsentManagementProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [consents, setConsents] = useState<ConsentSettings>({
    dataCollection: false,
    dataSharing: false,
    marketingCommunications: false,
    researchParticipation: false,
    emergencyAccess: false,
  });

  useEffect(() => {
    fetchCurrentConsents();
  }, []);

  const fetchCurrentConsents = async () => {
    try {
      const response = await fetch('/api/user/consents', {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setConsents(data.consents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consent settings');
    }
  };

  const handleConsentChange = (key: keyof ConsentSettings) => {
    setConsents(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/user/consents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consents }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update consent settings');
    } finally {
      setLoading(false);
    }
  };

  const ConsentSection = ({ 
    title, 
    description, 
    icon: Icon,
    consentKey,
  }: { 
    title: string;
    description: string;
    icon: React.ElementType;
    consentKey: keyof ConsentSettings;
  }) => (
    <Paper elevation={0} sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Icon color="primary" />
        <Box flex={1}>
          <Typography variant="subtitle1" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={consents[consentKey]}
                onChange={() => handleConsentChange(consentKey)}
                color="primary"
              />
            }
            label="I consent"
          />
        </Box>
      </Stack>
    </Paper>
  );

  return (
    <Dialog 
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <PrivacyIcon color="primary" />
          <Typography variant="h6">Privacy & Consent Settings</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your consent settings have been updated successfully!
          </Alert>
        )}

        <Typography paragraph>
          Please review and update your privacy preferences below. These settings
          help us protect your data and provide you with the best possible service
          while maintaining HIPAA compliance.
        </Typography>

        <Stack spacing={2}>
          <ConsentSection
            title="Data Collection and Processing"
            description="We collect and process your health information to provide medication tracking services. This includes storing your medication schedule, dose history, and related health data."
            icon={SecurityIcon}
            consentKey="dataCollection"
          />

          <ConsentSection
            title="Healthcare Provider Data Sharing"
            description="Allow us to share your medication data with your healthcare providers when necessary for your treatment. This helps ensure coordinated care."
            icon={HealthIcon}
            consentKey="dataSharing"
          />

          <ConsentSection
            title="Emergency Access"
            description="In case of emergency, authorized healthcare providers may need immediate access to your medication information. This could be life-saving in critical situations."
            icon={SecurityIcon}
            consentKey="emergencyAccess"
          />

          <ConsentSection
            title="Research Participation"
            description="Your de-identified data may be used for research to improve medication adherence and healthcare outcomes. No personally identifiable information will be shared."
            icon={PrivacyIcon}
            consentKey="researchParticipation"
          />

          <ConsentSection
            title="Communications"
            description="Receive important updates about your medications, refill reminders, and other health-related communications."
            icon={PrivacyIcon}
            consentKey="marketingCommunications"
          />
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            You can update these preferences at any time. For more information,
            please review our Privacy Policy and Terms of Service.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          onClick={handleSubmit}
          variant="contained"
          loading={loading}
        >
          Save Preferences
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
