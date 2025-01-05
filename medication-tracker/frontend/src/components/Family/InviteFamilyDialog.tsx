import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { FamilyRelationType } from '../../types/family';
import { Subscription } from '../../types/subscription';
import { useFamilyService } from '../../hooks/useFamilyService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription: Subscription;
}

interface FormData {
  name: string;
  email: string;
  relationship: FamilyRelationType;
}

export default function InviteFamilyDialog({ open, onClose, onSuccess, subscription }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { inviteFamilyMember } = useFamilyService();
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      email: '',
      relationship: 'OTHER',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);
      await inviteFamilyMember(data);
      reset();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite Family Member</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Remaining family members: {subscription.maxFamilyMembers - subscription.currentFamilyMembers}
            </Typography>
          </Box>

          <Controller
            name="name"
            control={control}
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Full Name"
                fullWidth
                margin="normal"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email Address"
                fullWidth
                margin="normal"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />

          <Controller
            name="relationship"
            control={control}
            rules={{ required: 'Relationship is required' }}
            render={({ field }) => (
              <FormControl fullWidth margin="normal">
                <InputLabel>Relationship</InputLabel>
                <Select
                  {...field}
                  label="Relationship"
                  error={!!errors.relationship}
                >
                  <MenuItem value="SPOUSE">Spouse</MenuItem>
                  <MenuItem value="CHILD">Child</MenuItem>
                  <MenuItem value="PARENT">Parent</MenuItem>
                  <MenuItem value="SIBLING">Sibling</MenuItem>
                  <MenuItem value="GRANDPARENT">Grandparent</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            They will receive an email invitation to join your family group.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
