import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useFamilyService } from '../../hooks/useFamilyService';

const steps = [
  'Account Setup',
  'Notification Preferences',
  'App Download',
];

interface FormData {
  password: string;
  confirmPassword: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export default function FamilyOnboarding() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { acceptFamilyInvitation } = useFamilyService();

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      password: '',
      confirmPassword: '',
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
    },
  });

  const password = watch('password');

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (!token) {
        throw new Error('Invalid invitation token');
      }

      await acceptFamilyInvitation(token, {
        password: data.password,
        notificationPreferences: data.notificationPreferences,
      });

      // Move to app download step
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box component="form" noValidate sx={{ mt: 3 }}>
            <Controller
              name="password"
              control={control}
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: 'Please confirm your password',
                validate: value =>
                  value === password || 'Passwords do not match',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                />
              )}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Choose how you want to receive notifications:
            </Typography>

            <Controller
              name="notificationPreferences.email"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Email Notifications</InputLabel>
                  <Select {...field} label="Email Notifications">
                    <MenuItem value={true}>Enabled</MenuItem>
                    <MenuItem value={false}>Disabled</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="notificationPreferences.push"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Push Notifications</InputLabel>
                  <Select {...field} label="Push Notifications">
                    <MenuItem value={true}>Enabled</MenuItem>
                    <MenuItem value={false}>Disabled</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="notificationPreferences.sms"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>SMS Notifications</InputLabel>
                  <Select {...field} label="SMS Notifications">
                    <MenuItem value={true}>Enabled</MenuItem>
                    <MenuItem value={false}>Disabled</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              🎉 Setup Complete!
            </Typography>
            
            <Typography variant="body1" paragraph>
              Download our app to start managing medications with your family.
            </Typography>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                href={process.env.REACT_APP_APP_STORE_URL}
                target="_blank"
                sx={{ borderRadius: 2 }}
              >
                Download for iOS
              </Button>
              <Button
                variant="outlined"
                href={process.env.REACT_APP_PLAY_STORE_URL}
                target="_blank"
                sx={{ borderRadius: 2 }}
              >
                Download for Android
              </Button>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 4 }}>
              You can also access the app through your web browser
            </Typography>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 600,
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Welcome to Family Medication Management
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{ borderRadius: 2 }}
          >
            Back
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ borderRadius: 2 }}
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={activeStep === 1 ? handleSubmit(onSubmit) : handleNext}
              sx={{ borderRadius: 2 }}
            >
              {activeStep === 1 ? 'Complete Setup' : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
