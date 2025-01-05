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
import { useAuth } from '../contexts/AuthContext';

const CarerManagement = () => {
  const { user } = useAuth();
  const [carers, setCarers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCarer, setSelectedCarer] = useState(null);
  const [carerEmail, setCarerEmail] = useState('');
  const [permissions, setPermissions] = useState({
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
      const response = await axios.get('/api/patient/carers');
      setCarers(response.data);
    } catch (error) {
      console.error('Error fetching carers:', error);
    }
  };

  const handleAddCarer = async () => {
    try {
      await axios.post('/api/carer/assign', {
        email: carerEmail,
        permissions,
      });
      setOpenDialog(false);
      setCarerEmail('');
      fetchCarers();
    } catch (error) {
      console.error('Error adding carer:', error);
    }
  };

  const handleRemoveCarer = async (carerId) => {
    try {
      await axios.delete(`/api/carer/assignment/${carerId}`);
      fetchCarers();
    } catch (error) {
      console.error('Error removing carer:', error);
    }
  };

  const handleUpdatePermissions = async (carerId) => {
    try {
      await axios.put(`/api/carer/assignment/${carerId}/permissions`, {
        permissions,
      });
      setOpenDialog(false);
      setSelectedCarer(null);
      fetchCarers();
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Carer Management
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpenDialog(true)}
        sx={{ mb: 2 }}
      >
        Add New Carer
      </Button>

      <Card>
        <CardContent>
          <List>
            {carers.map((carer) => (
              <ListItem key={carer.id}>
                <ListItemText
                  primary={carer.name}
                  secondary={`Type: ${carer.type}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="edit"
                    onClick={() => {
                      setSelectedCarer(carer);
                      setPermissions(carer.permissions);
                      setOpenDialog(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveCarer(carer.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {selectedCarer ? 'Edit Carer Permissions' : 'Add New Carer'}
        </DialogTitle>
        <DialogContent>
          {!selectedCarer && (
            <TextField
              autoFocus
              margin="dense"
              label="Carer Email"
              type="email"
              fullWidth
              value={carerEmail}
              onChange={(e) => setCarerEmail(e.target.value)}
            />
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Permissions
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.view_medications}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      view_medications: e.target.checked,
                    })
                  }
                />
              }
              label="View Medications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.view_compliance}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      view_compliance: e.target.checked,
                    })
                  }
                />
              }
              label="View Compliance"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.receive_alerts}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      receive_alerts: e.target.checked,
                    })
                  }
                />
              }
              label="Receive Alerts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.emergency_contact}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      emergency_contact: e.target.checked,
                    })
                  }
                />
              }
              label="Emergency Contact"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.modify_schedule}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      modify_schedule: e.target.checked,
                    })
                  }
                />
              }
              label="Modify Schedule"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() =>
              selectedCarer
                ? handleUpdatePermissions(selectedCarer.id)
                : handleAddCarer()
            }
            color="primary"
          >
            {selectedCarer ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CarerManagement;
