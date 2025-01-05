import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as VerifiedIcon,
} from '@mui/icons-material';
import { EmergencyContact, emergencyContactService } from '../../services/EmergencyContactService';

export const EmergencyContactManager: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<EmergencyContact> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const allContacts = await emergencyContactService.getAllContacts();
      setContacts(allContacts.sort((a, b) => a.priority - b.priority));
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleAddContact = () => {
    setEditingContact({
      name: '',
      relationship: '',
      priority: contacts.length + 1,
      notificationMethods: {},
      availability: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      accessLevel: {
        canViewMedicalHistory: false,
        canViewCurrentLocation: false,
        canViewMedications: false,
        canUpdateEmergencyStatus: false,
      },
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await emergencyContactService.removeContact(id);
      await loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleSaveContact = async () => {
    try {
      if (!editingContact) return;

      if (isEditing && editingContact.id) {
        await emergencyContactService.updateContact(
          editingContact.id,
          editingContact as EmergencyContact
        );
      } else {
        await emergencyContactService.addContact(editingContact as Omit<EmergencyContact, 'id'>);
      }

      setOpenDialog(false);
      setEditingContact(null);
      await loadContacts();
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };

  const handleVerifyContact = async (
    contactId: string,
    method: 'email' | 'phone',
    value: string
  ) => {
    try {
      await emergencyContactService.verifyContactMethod(contactId, method, value);
      await loadContacts();
    } catch (error) {
      console.error('Failed to verify contact:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Emergency Contacts
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddContact}
        >
          Add Contact
        </Button>
      </Box>

      <List>
        {contacts.map((contact) => (
          <Card key={contact.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  {contact.name}
                  <Chip
                    size="small"
                    label={`Priority ${contact.priority}`}
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Box>
                  <IconButton
                    onClick={() => handleEditContact(contact)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteContact(contact.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>

              <Typography color="textSecondary" gutterBottom>
                {contact.relationship}
              </Typography>

              {contact.notificationMethods.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2">
                    Email: {contact.notificationMethods.email.address}
                  </Typography>
                  {contact.notificationMethods.email.verified ? (
                    <VerifiedIcon color="success" sx={{ ml: 1 }} />
                  ) : (
                    <Button
                      size="small"
                      onClick={() =>
                        handleVerifyContact(
                          contact.id,
                          'email',
                          contact.notificationMethods.email!.address
                        )
                      }
                    >
                      Verify
                    </Button>
                  )}
                </Box>
              )}

              {contact.notificationMethods.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2">
                    Phone: {contact.notificationMethods.phone.number}
                  </Typography>
                  {contact.notificationMethods.phone.verified ? (
                    <VerifiedIcon color="success" sx={{ ml: 1 }} />
                  ) : (
                    <Button
                      size="small"
                      onClick={() =>
                        handleVerifyContact(
                          contact.id,
                          'phone',
                          contact.notificationMethods.phone!.number
                        )
                      }
                    >
                      Verify
                    </Button>
                  )}
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Access Permissions:</Typography>
                <Typography variant="body2">
                  {Object.entries(contact.accessLevel)
                    .filter(([, value]) => value)
                    .map(([key]) =>
                      key
                        .replace('can', '')
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                    )
                    .join(', ')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={editingContact?.name || ''}
              onChange={(e) =>
                setEditingContact((prev) => ({ ...prev!, name: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Relationship"
              value={editingContact?.relationship || ''}
              onChange={(e) =>
                setEditingContact((prev) => ({
                  ...prev!,
                  relationship: e.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Priority"
              type="number"
              value={editingContact?.priority || ''}
              onChange={(e) =>
                setEditingContact((prev) => ({
                  ...prev!,
                  priority: parseInt(e.target.value),
                }))
              }
              fullWidth
            />

            <Typography variant="subtitle1">Notification Methods</Typography>
            <TextField
              label="Email"
              value={editingContact?.notificationMethods?.email?.address || ''}
              onChange={(e) =>
                setEditingContact((prev) => ({
                  ...prev!,
                  notificationMethods: {
                    ...prev!.notificationMethods,
                    email: {
                      address: e.target.value,
                      verified: false,
                    },
                  },
                }))
              }
              fullWidth
            />
            <TextField
              label="Phone"
              value={editingContact?.notificationMethods?.phone?.number || ''}
              onChange={(e) =>
                setEditingContact((prev) => ({
                  ...prev!,
                  notificationMethods: {
                    ...prev!.notificationMethods,
                    phone: {
                      number: e.target.value,
                      verified: false,
                      canReceiveSMS: true,
                    },
                  },
                }))
              }
              fullWidth
            />

            <Typography variant="subtitle1">Access Permissions</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={editingContact?.accessLevel?.canViewMedicalHistory || false}
                  onChange={(e) =>
                    setEditingContact((prev) => ({
                      ...prev!,
                      accessLevel: {
                        ...prev!.accessLevel,
                        canViewMedicalHistory: e.target.checked,
                      },
                    }))
                  }
                />
              }
              label="Can view medical history"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editingContact?.accessLevel?.canViewCurrentLocation || false}
                  onChange={(e) =>
                    setEditingContact((prev) => ({
                      ...prev!,
                      accessLevel: {
                        ...prev!.accessLevel,
                        canViewCurrentLocation: e.target.checked,
                      },
                    }))
                  }
                />
              }
              label="Can view current location"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editingContact?.accessLevel?.canViewMedications || false}
                  onChange={(e) =>
                    setEditingContact((prev) => ({
                      ...prev!,
                      accessLevel: {
                        ...prev!.accessLevel,
                        canViewMedications: e.target.checked,
                      },
                    }))
                  }
                />
              }
              label="Can view medications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={
                    editingContact?.accessLevel?.canUpdateEmergencyStatus || false
                  }
                  onChange={(e) =>
                    setEditingContact((prev) => ({
                      ...prev!,
                      accessLevel: {
                        ...prev!.accessLevel,
                        canUpdateEmergencyStatus: e.target.checked,
                      },
                    }))
                  }
                />
              }
              label="Can update emergency status"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveContact} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
