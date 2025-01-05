import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Avatar,
    Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

function EditFamilyMember({ open, onClose, familyMember, onSave }) {
    const [formData, setFormData] = useState({
        name: familyMember?.name || '',
        relationship: familyMember?.relationship || '',
        email: familyMember?.email || '',
        phone: familyMember?.phone || '',
        dateOfBirth: familyMember?.dateOfBirth ? new Date(familyMember.dateOfBirth) : null,
        emergencyContact: familyMember?.emergencyContact || false,
        accessLevel: familyMember?.accessLevel || 'view',
        profilePicture: familyMember?.profilePicture || '',
        notes: familyMember?.notes || '',
    });

    const handleChange = (field) => (event) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleDateChange = (date) => {
        setFormData({
            ...formData,
            dateOfBirth: date,
        });
    };

    const handleSubmit = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {familyMember ? 'Edit Family Member' : 'Add Family Member'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Name"
                            fullWidth
                            required
                            value={formData.name}
                            onChange={handleChange('name')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Relationship"
                            fullWidth
                            value={formData.relationship}
                            onChange={handleChange('relationship')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Email"
                            fullWidth
                            required
                            type="email"
                            value={formData.email}
                            onChange={handleChange('email')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Phone"
                            fullWidth
                            value={formData.phone}
                            onChange={handleChange('phone')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Date of Birth"
                                value={formData.dateOfBirth}
                                onChange={handleDateChange}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Access Level</InputLabel>
                            <Select
                                value={formData.accessLevel}
                                label="Access Level"
                                onChange={handleChange('accessLevel')}
                            >
                                <MenuItem value="view">View Only</MenuItem>
                                <MenuItem value="edit">Edit</MenuItem>
                                <MenuItem value="none">No Access</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Profile Picture URL"
                            fullWidth
                            value={formData.profilePicture}
                            onChange={handleChange('profilePicture')}
                        />
                    </Grid>
                    {formData.profilePicture && (
                        <Grid item xs={12} display="flex" justifyContent="center">
                            <Avatar
                                src={formData.profilePicture}
                                alt={formData.name}
                                sx={{ width: 100, height: 100 }}
                            />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <TextField
                            label="Notes"
                            fullWidth
                            multiline
                            rows={4}
                            value={formData.notes}
                            onChange={handleChange('notes')}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    {familyMember ? 'Save Changes' : 'Add Family Member'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default EditFamilyMember;
