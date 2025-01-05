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
    SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

interface FamilyMember {
    id?: string;
    name: string;
    relationship: string;
    email: string;
    phone: string;
    dateOfBirth: Date | null;
    emergencyContact: boolean;
    accessLevel: 'view' | 'edit' | 'admin';
    profilePicture?: string;
    notes?: string;
}

interface EditFamilyMemberProps {
    open: boolean;
    onClose: () => void;
    familyMember?: FamilyMember;
    onSave: (member: FamilyMember) => void;
}

const EditFamilyMember: React.FC<EditFamilyMemberProps> = ({ open, onClose, familyMember, onSave }) => {
    const [formData, setFormData] = useState<FamilyMember>({
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

    const handleChange = (field: keyof FamilyMember) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
    ) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleDateChange = (date: Date | null) => {
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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {familyMember ? 'Edit Family Member' : 'Add Family Member'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} display="flex" justifyContent="center">
                        <Avatar
                            src={formData.profilePicture}
                            sx={{ width: 100, height: 100 }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Name"
                            value={formData.name}
                            onChange={handleChange('name')}
                            required
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel>Relationship</InputLabel>
                            <Select
                                value={formData.relationship}
                                onChange={handleChange('relationship')}
                                label="Relationship"
                            >
                                <MenuItem value="spouse">Spouse</MenuItem>
                                <MenuItem value="child">Child</MenuItem>
                                <MenuItem value="parent">Parent</MenuItem>
                                <MenuItem value="sibling">Sibling</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange('email')}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Phone"
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
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                    },
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Access Level</InputLabel>
                            <Select
                                value={formData.accessLevel}
                                onChange={handleChange('accessLevel')}
                                label="Access Level"
                            >
                                <MenuItem value="view">View Only</MenuItem>
                                <MenuItem value="edit">Can Edit</MenuItem>
                                <MenuItem value="admin">Administrator</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Profile Picture URL"
                            value={formData.profilePicture}
                            onChange={handleChange('profilePicture')}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Notes"
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
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditFamilyMember;
