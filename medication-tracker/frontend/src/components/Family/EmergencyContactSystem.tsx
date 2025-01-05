import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEmergencyContacts } from '../../hooks/useEmergencyContacts';
import { liabilityProtection } from '../../utils/liabilityProtection';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isVerified: boolean;
}

interface EmergencyContactFormData {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export default function EmergencyContactSystem() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editContact, setEditContact] = useState<EmergencyContact | null>(null);
  const { contacts, addContact, updateContact, removeContact, loading, error } = useEmergencyContacts();
  
  const initialFormData: EmergencyContactFormData = {
    name: '',
    relationship: '',
    phone: '',
    email: '',
  };
  
  const [formData, setFormData] = useState<EmergencyContactFormData>(initialFormData);

  const handleSubmit = async () => {
    try {
      if (editContact) {
        await updateContact(editContact.id, formData);
        liabilityProtection.logCriticalAction(
          'EMERGENCY_CONTACT_UPDATE',
          'current-user',
          { oldContact: editContact, newContact: formData },
          true
        );
      } else {
        await addContact(formData);
        liabilityProtection.logCriticalAction(
          'EMERGENCY_CONTACT_ADD',
          'current-user',
          formData,
          true
        );
      }
      setOpenDialog(false);
      setFormData(initialFormData);
      setEditContact(null);
    } catch (err) {
      console.error('Error managing emergency contact:', err);
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setEditContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email,
    });
    setOpenDialog(true);
  };

  const handleDelete = async (contactId: string) => {
    try {
      await removeContact(contactId);
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_REMOVE',
        'current-user',
        { contactId },
        true
      );
    } catch (err) {
      console.error('Error removing emergency contact:', err);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Emergency Contacts</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Contact
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading emergency contacts. Please try again.
        </Alert>
      )}

      <List>
        {contacts?.map((contact) => (
          <ListItem
            key={contact.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemText
              primary={contact.name}
              secondary={
                <React.Fragment>
                  <Typography component="span" variant="body2" color="text.primary">
                    {contact.relationship}
                  </Typography>
                  <br />
                  {contact.phone} • {contact.email}
                  {contact.isVerified && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 1, color: 'success.main' }}
                    >
                      ✓ Verified
                    </Typography>
                  )}
                </React.Fragment>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleEdit(contact)} sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDelete(contact.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Relationship"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
              required
              type="tel"
            />
            <TextField
              fullWidth
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
              type="email"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editContact ? 'Update' : 'Add'} Contact
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
