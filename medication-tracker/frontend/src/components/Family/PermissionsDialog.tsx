import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { FamilyMember } from '../../types/family';
import { useFamilyService } from '../../hooks/useFamilyService';

interface Props {
  open: boolean;
  onClose: () => void;
  member: FamilyMember;
}

export default function PermissionsDialog({ open, onClose, member }: Props) {
  const [permissions, setPermissions] = useState(member.permissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateFamilyMemberPermissions } = useFamilyService();

  const handlePermissionChange = (permission: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: event.target.checked,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await updateFamilyMemberPermissions(member.id, permissions);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Permissions for {member.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            Customize what {member.name} can view and manage
          </Typography>
        </Box>

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={permissions.canViewMedications}
                onChange={handlePermissionChange('canViewMedications')}
              />
            }
            label="View Medications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={permissions.canEditMedications}
                onChange={handlePermissionChange('canEditMedications')}
              />
            }
            label="Edit Medications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={permissions.canViewSchedule}
                onChange={handlePermissionChange('canViewSchedule')}
              />
            }
            label="View Schedule"
          />
          <FormControlLabel
            control={
              <Switch
                checked={permissions.canEditSchedule}
                onChange={handlePermissionChange('canEditSchedule')}
              />
            }
            label="Edit Schedule"
          />
          <FormControlLabel
            control={
              <Switch
                checked={permissions.canViewReports}
                onChange={handlePermissionChange('canViewReports')}
              />
            }
            label="View Reports"
          />
          <FormControlLabel
            control={
              <Switch
                checked={permissions.canManageInventory}
                onChange={handlePermissionChange('canManageInventory')}
              />
            }
            label="Manage Inventory"
          />
        </FormGroup>

        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            Note: Family members will always have access to their own medication data.
            These permissions only affect their access to your medication information.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
