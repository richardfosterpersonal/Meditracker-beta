import React from 'react';
import {
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    Avatar,
    IconButton,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Medication as MedicationIcon,
} from '@mui/icons-material';

const FamilyMembers = () => {
    // Placeholder data - will be replaced with actual data from backend
    const familyMembers = [
        {
            id: 1,
            name: 'John Doe',
            relationship: 'Father',
            age: 65,
            medications: ['Aspirin', 'Vitamin D'],
        },
        {
            id: 2,
            name: 'Jane Doe',
            relationship: 'Mother',
            age: 60,
            medications: ['Calcium', 'Vitamin B12'],
        },
    ];

    const generateColor = (name) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            color += `00${value.toString(16)}`.slice(-2);
        }
        return color;
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Family Members
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => console.log('Add family member clicked')}
                >
                    Add Family Member
                </Button>
            </Box>

            <Grid container spacing={3}>
                {familyMembers.map((member) => (
                    <Grid item xs={12} sm={6} md={4} key={member.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: generateColor(member.name),
                                            width: 56,
                                            height: 56,
                                            mr: 2,
                                        }}
                                    >
                                        {member.name.split(' ').map(n => n[0]).join('')}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" component="h2">
                                            {member.name}
                                        </Typography>
                                        <Typography color="textSecondary">
                                            {member.relationship}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography variant="body2" component="p">
                                    Age: {member.age}
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" component="p" gutterBottom>
                                        Medications:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {member.medications.map((med, index) => (
                                            <Chip
                                                key={index}
                                                label={med}
                                                size="small"
                                                icon={<MedicationIcon />}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions>
                                <IconButton
                                    size="small"
                                    onClick={() => console.log('Edit clicked', member.id)}
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => console.log('Delete clicked', member.id)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default FamilyMembers;
