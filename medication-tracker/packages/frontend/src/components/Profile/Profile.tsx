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
import NotificationSubscription from '../NotificationSubscription';

interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
}

interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContact: EmergencyContact;
}

const Profile: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [userData, setUserData] = useState<UserData>({
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setUserData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent as keyof UserData],
                    [child]: value,
                },
            }));
        } else {
            setUserData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <Avatar
                        sx={{
                            width: 100,
                            height: 100,
                            mr: 3,
                            bgcolor: 'primary.main',
                        }}
                    >
                        {userData.firstName[0]}{userData.lastName[0]}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" component="h1">
                            {userData.firstName} {userData.lastName}
                        </Typography>
                        <Typography variant="subtitle1" color="textSecondary">
                            {userData.email}
                        </Typography>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Personal Information
                            {!isEditing && (
                                <Button
                                    startIcon={<EditIcon />}
                                    onClick={handleEdit}
                                    sx={{ ml: 2 }}
                                >
                                    Edit
                                </Button>
                            )}
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
                            type="email"
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

                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Name"
                            name="emergencyContact.name"
                            value={userData.emergencyContact.name}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Relationship"
                            name="emergencyContact.relationship"
                            value={userData.emergencyContact.relationship}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Phone"
                            name="emergencyContact.phone"
                            value={userData.emergencyContact.phone}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                    </Grid>

                    {isEditing && (
                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                sx={{ mt: 2 }}
                            >
                                Save Changes
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <NotificationSubscription />
            </Paper>
        </Container>
    );
};

export default Profile;
