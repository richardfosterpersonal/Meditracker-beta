import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Chip,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from '@mui/material';
import {
    Warning as WarningIcon,
    ExpandMore as ExpandMoreIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import axios from '../services/axiosConfig';

const DrugInteractions = ({ medications }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [interactions, setInteractions] = useState([]);
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [medicationDetails, setMedicationDetails] = useState(null);

    useEffect(() => {
        if (medications && medications.length >= 2) {
            checkInteractions();
        }
    }, [medications]);

    const checkInteractions = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.post('/drug-interactions/check', {
                medication_ids: medications.map(med => med.id)
            });
            
            setInteractions(response.data.interactions);
        } catch (error) {
            console.error('Error checking interactions:', error);
            setError('Failed to check medication interactions');
        } finally {
            setLoading(false);
        }
    };

    const getMedicationDetails = async (medicationId) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`/drug-interactions/info/${medicationId}`);
            setMedicationDetails(response.data);
            setDetailsOpen(true);
        } catch (error) {
            console.error('Error getting medication details:', error);
            setError('Failed to get medication details');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setMedicationDetails(null);
    };

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            default:
                return 'info';
        }
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                Drug Interactions
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {interactions.length > 0 ? (
                        <Grid container spacing={2}>
                            {interactions.map((interaction, index) => (
                                <Grid item xs={12} key={index}>
                                    <Card>
                                        <CardHeader
                                            title={
                                                <Typography variant="h6">
                                                    Interaction Found
                                                </Typography>
                                            }
                                            subheader={
                                                <>
                                                    {interaction.medication1.name} + {interaction.medication2.name}
                                                </>
                                            }
                                        />
                                        <CardContent>
                                            <List>
                                                {interaction.interactions.map((detail, idx) => (
                                                    <ListItem key={idx}>
                                                        <ListItemText
                                                            primary={
                                                                <Box display="flex" alignItems="center" gap={1}>
                                                                    <Chip
                                                                        label={detail.severity}
                                                                        color={getSeverityColor(detail.severity)}
                                                                        size="small"
                                                                    />
                                                                    <Typography variant="body1">
                                                                        {detail.description}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                            <Box display="flex" gap={1} mt={2}>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<InfoIcon />}
                                                    onClick={() => getMedicationDetails(interaction.medication1.id)}
                                                >
                                                    {interaction.medication1.name} Details
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<InfoIcon />}
                                                    onClick={() => getMedicationDetails(interaction.medication2.id)}
                                                >
                                                    {interaction.medication2.name} Details
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Alert severity="success">
                            No interactions found between the current medications.
                        </Alert>
                    )}
                </>
            )}

            <Dialog
                open={detailsOpen}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
            >
                {medicationDetails && (
                    <>
                        <DialogTitle>
                            {medicationDetails.brand_name?.[0] || medicationDetails.generic_name?.[0]}
                        </DialogTitle>
                        <DialogContent>
                            <Box sx={{ mt: 2 }}>
                                {medicationDetails.description?.[0] && (
                                    <Accordion defaultExpanded>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="h6">Description</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {medicationDetails.description[0]}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                )}

                                {medicationDetails.indications_and_usage?.[0] && (
                                    <Accordion>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="h6">Indications and Usage</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {medicationDetails.indications_and_usage[0]}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                )}

                                {medicationDetails.warnings?.[0] && (
                                    <Accordion>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="h6" color="error">
                                                Warnings
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {medicationDetails.warnings[0]}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                )}

                                {medicationDetails.drug_interactions?.[0] && (
                                    <Accordion>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="h6">Drug Interactions</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {medicationDetails.drug_interactions[0]}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                )}

                                {medicationDetails.adverse_reactions?.[0] && (
                                    <Accordion>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="h6">Adverse Reactions</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {medicationDetails.adverse_reactions[0]}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDetails}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default DrugInteractions;
