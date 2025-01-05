import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import api from '../services/api';
import AddMedication from './AddMedication';
import EditMedication from './EditMedication';
import MedicationStats from './MedicationStats';
import DrugInteractions from './DrugInteractions';
import NaturalAlternatives from './NaturalAlternatives';
import { format } from 'date-fns';

const Medications = () => {
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [medicationToDelete, setMedicationToDelete] = useState(null);
    const [showNaturalAlternatives, setShowNaturalAlternatives] = useState(false);

    const fetchMedications = async () => {
        try {
            const response = await api.get('/medications/');
            setMedications(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching medications:', err);
            setError(err.response?.data?.error || 'Failed to fetch medications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedications();
    }, []);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/medications/${id}`);
            setMedicationToDelete(null);
            fetchMedications();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete medication');
        }
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
        </Box>
    );

    if (error) return (
        <Box m={2}>
            <Alert severity="error">{error}</Alert>
        </Box>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1" color="primary">
                    Your Medications
                </Typography>
                <Fab
                    color="primary"
                    aria-label="add medication"
                    onClick={() => setAddDialogOpen(true)}
                >
                    <AddIcon />
                </Fab>
            </Box>

            {medications.length === 0 ? (
                <Card sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                        No medications added yet
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                        sx={{ mt: 2 }}
                    >
                        Add Your First Medication
                    </Button>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {medications.map((medication) => (
                        <Grid item xs={12} md={6} lg={4} key={medication.id}>
                            <Card 
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3
                                    }
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Typography variant="h6" component="h2" gutterBottom>
                                            {medication.name}
                                        </Typography>
                                        <Chip
                                            label={medication.status || 'Active'}
                                            color={medication.status === 'Active' ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        {medication.dosage} - {medication.frequency}
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        Next dose: {medication.nextDose ? format(new Date(medication.nextDose), 'PPp') : 'Not scheduled'}
                                    </Typography>
                                    <MedicationStats medicationId={medication.id} />
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setSelectedMedication(medication)}
                                        color="primary"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => setMedicationToDelete(medication)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                    <Button
                                        variant="outline-info"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => {
                                          setSelectedMedication(medication);
                                          setShowNaturalAlternatives(true);
                                        }}
                                    >
                                        Natural Alternatives
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {medications.length >= 2 && (
                <Box mt={4}>
                    <DrugInteractions medications={medications} />
                </Box>
            )}

            {/* Add Medication Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Add New Medication</DialogTitle>
                <DialogContent>
                    <AddMedication
                        onSuccess={() => {
                            setAddDialogOpen(false);
                            fetchMedications();
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Medication Dialog */}
            <Dialog
                open={Boolean(selectedMedication)}
                onClose={() => setSelectedMedication(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Edit Medication</DialogTitle>
                <DialogContent>
                    {selectedMedication && (
                        <EditMedication
                            medication={selectedMedication}
                            onSuccess={() => {
                                setSelectedMedication(null);
                                fetchMedications();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={Boolean(medicationToDelete)}
                onClose={() => setMedicationToDelete(null)}
            >
                <DialogTitle>Delete Medication</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete {medicationToDelete?.name}? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMedicationToDelete(null)}>Cancel</Button>
                    <Button
                        onClick={() => handleDelete(medicationToDelete.id)}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Natural Alternatives Modal */}
            <Dialog
                open={showNaturalAlternatives}
                onClose={() => setShowNaturalAlternatives(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>Natural Alternatives</DialogTitle>
                <DialogContent>
                    {selectedMedication && (
                        <NaturalAlternatives
                            medication={selectedMedication}
                            onClose={() => setShowNaturalAlternatives(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default Medications;
