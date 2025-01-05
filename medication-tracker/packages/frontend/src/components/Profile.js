import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Grid,
    Avatar,
    Divider,
    Container
} from '@mui/material';
import {
    Save as SaveIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import NotificationSubscription from './NotificationSubscription';

const Profile = () => {
    const [isEditing, setIsEditing] = useState(false);
    // Placeholder data - will be replaced with actual user data from context/backend
    const [userData, setUserData] = useState({
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        emergencyContact: {
            name: 'Jane Smith',
            relationship: 'Spouse',
            phone: '(555) 987-6543',
        },
    });

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        setIsEditing(false);
        // TODO: Implement save functionality
        console.log('Saving profile data:', userData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setUserData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setUserData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Profile Settings
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <Avatar
                        sx={{
                            width: 100,
                            height: 100,
                            mr: 3,
                            fontSize: '2.5rem',
                            bgcolor: 'primary.main',
                        }}
                    >
                        {userData.firstName[0]}{userData.lastName[0]}
                    </Avatar>
                    <Box>
                        <Typography variant="h5">
                            {userData.firstName} {userData.lastName}
                        </Typography>
                        <Typography color="textSecondary">
                            {userData.email}
                        </Typography>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Personal Information
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="First Name"
                            name="firstName"
                            value={userData.firstName}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Last Name"
                            name="lastName"
                            value={userData.lastName}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            value={userData.email}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Phone"
                            name="phone"
                            value={userData.phone}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom>
                            Emergency Contact
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Contact Name"
                            name="emergencyContact.name"
                            value={userData.emergencyContact.name}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Relationship"
                            name="emergencyContact.relationship"
                            value={userData.emergencyContact.relationship}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Emergency Contact Phone"
                            name="emergencyContact.phone"
                            value={userData.emergencyContact.phone}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Notification Settings
                    </Typography>
                    <NotificationSubscription />
                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    {isEditing ? (
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                        >
                            Save Changes
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={handleEdit}
                        >
                            Edit Profile
                        </Button>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default Profile;
