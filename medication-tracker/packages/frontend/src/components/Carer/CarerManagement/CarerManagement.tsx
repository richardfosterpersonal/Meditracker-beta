import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

interface CarerPermissions {
  view_medications: boolean;
  view_compliance: boolean;
  receive_alerts: boolean;
  emergency_contact: boolean;
  modify_schedule: boolean;
}

interface Carer {
  id: string;
  email: string;
  name: string;
  permissions: CarerPermissions;
  lastActive: string;
}

const CarerManagement: React.FC = () => {
  const { user } = useAuth();
  const [carers, setCarers] = useState<Carer[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCarer, setSelectedCarer] = useState<Carer | null>(null);
  const [carerEmail, setCarerEmail] = useState('');
  const [permissions, setPermissions] = useState<CarerPermissions>({
    view_medications: true,
    view_compliance: true,
    receive_alerts: true,
    emergency_contact: false,
    modify_schedule: false,
  });

  useEffect(() => {
    fetchCarers();
  }, []);

  const fetchCarers = async () => {
    try {
      const response = await axios.get<Carer[]>('/api/patient/carers');
      setCarers(response.data);
    } catch (error) {
      console.error('Error fetching carers:', error);
    }
  };

  const handleAddCarer = () => {
    setSelectedCarer(null);
    setCarerEmail('');
    setPermissions({
      view_medications: true,
      view_compliance: true,
      receive_alerts: true,
      emergency_contact: false,
      modify_schedule: false,
    });
    setOpenDialog(true);
  };

  const handleEditCarer = (carer: Carer) => {
    setSelectedCarer(carer);
    setCarerEmail(carer.email);
    setPermissions(carer.permissions);
    setOpenDialog(true);
  };

  const handleDeleteCarer = async (carerId: string) => {
    try {
      await axios.delete(`/api/patient/carers/${carerId}`);
      await fetchCarers();
    } catch (error) {
      console.error('Error deleting carer:', error);
    }
  };

  const handleSaveCarer = async () => {
    try {
      if (selectedCarer) {
        await axios.put(`/api/patient/carers/${selectedCarer.id}`, {
          email: carerEmail,
          permissions,
        });
      } else {
        await axios.post('/api/patient/carers', {
          email: carerEmail,
          permissions,
        });
      }
      await fetchCarers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving carer:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCarer(null);
    setCarerEmail('');
    setPermissions({
      view_medications: true,
      view_compliance: true,
      receive_alerts: true,
      emergency_contact: false,
      modify_schedule: false,
    });
  };

  const handlePermissionChange = (permission: keyof CarerPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Carer Management</Typography>
        <Button variant="contained" color="primary" onClick={handleAddCarer}>
          Add Carer
        </Button>
      </Box>

      <Card>
        <CardContent>
          <List>
            {carers.map((carer) => (
              <ListItem key={carer.id}>
                <ListItemText
                  primary={carer.name || carer.email}
                  secondary={`Last active: ${new Date(carer.lastActive).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleEditCarer(carer)} sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDeleteCarer(carer.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedCarer ? 'Edit Carer' : 'Add Carer'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Carer Email"
            type="email"
            fullWidth
            value={carerEmail}
            onChange={(e) => setCarerEmail(e.target.value)}
            disabled={!!selectedCarer}
          />
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Permissions
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.view_medications}
                  onChange={() => handlePermissionChange('view_medications')}
                />
              }
              label="View Medications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.view_compliance}
                  onChange={() => handlePermissionChange('view_compliance')}
                />
              }
              label="View Compliance"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.receive_alerts}
                  onChange={() => handlePermissionChange('receive_alerts')}
                />
              }
              label="Receive Alerts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.emergency_contact}
                  onChange={() => handlePermissionChange('emergency_contact')}
                />
              }
              label="Emergency Contact"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.modify_schedule}
                  onChange={() => handlePermissionChange('modify_schedule')}
                />
              }
              label="Modify Schedule"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCarer} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CarerManagement;
