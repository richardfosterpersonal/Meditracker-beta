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
import axios from '../../../services/axiosConfig';
import DrugInteractionErrorBoundary from '../../ErrorBoundary/DrugInteractionErrorBoundary';
import DrugInteractionLoadingState from './DrugInteractionLoadingState';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    rxcui?: string;
}

interface Interaction {
    severity: 'high' | 'moderate' | 'low';
    description: string;
    medications: string[];
    mechanism?: string;
    recommendation?: string;
    references?: string[];
}

interface MedicationDetails {
    name: string;
    description: string;
    warnings: string[];
    sideEffects: string[];
    contraindications: string[];
    drugClass: string;
}

interface DrugInteractionsProps {
    medications: Medication[];
}

const DrugInteractions: React.FC<DrugInteractionsProps> = ({ medications }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [medicationDetails, setMedicationDetails] = useState<MedicationDetails | null>(null);

    useEffect(() => {
        if (medications && medications.length >= 2) {
            checkInteractions();
        }
    }, [medications]);

    const checkInteractions = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const medicationIds = medications.map(med => med.rxcui).filter(Boolean);
            
            if (medicationIds.length < 2) {
                throw new Error('Not enough medications with RxCUI identifiers to check interactions');
            }

            const response = await axios.post('/api/medications/interactions', {
                medications: medicationIds
            });

            setInteractions(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while checking drug interactions');
        } finally {
            setLoading(false);
        }
    };

    const fetchMedicationDetails = async (medication: Medication) => {
        try {
            setSelectedMedication(medication);
            setLoading(true);
            
            const response = await axios.get(`/api/medications/${medication.rxcui}/details`);
            setMedicationDetails(response.data);
            setDetailsOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while fetching medication details');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedMedication(null);
        setMedicationDetails(null);
    };

    const getSeverityColor = (severity: Interaction['severity']) => {
        switch (severity) {
            case 'high':
                return 'error';
            case 'moderate':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <DrugInteractionLoadingState loadingId="interactions_initial_load" />
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <DrugInteractionErrorBoundary>
            <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Drug Interactions Analysis
                    </Typography>
                    
                    {interactions.length === 0 ? (
                        <Alert severity="success">
                            No known interactions found between your medications.
                        </Alert>
                    ) : (
                        <Grid container spacing={3}>
                            {interactions.map((interaction, index) => (
                                <Grid item xs={12} key={index}>
                                    <Accordion>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Chip
                                                    label={interaction.severity.toUpperCase()}
                                                    color={getSeverityColor(interaction.severity)}
                                                    icon={<WarningIcon />}
                                                />
                                                <Typography>
                                                    {interaction.medications.join(' + ')}
                                                </Typography>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Box>
                                                <Typography paragraph>
                                                    {interaction.description}
                                                </Typography>
                                                
                                                {interaction.mechanism && (
                                                    <>
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            Mechanism
                                                        </Typography>
                                                        <Typography paragraph>
                                                            {interaction.mechanism}
                                                        </Typography>
                                                    </>
                                                )}
                                                
                                                {interaction.recommendation && (
                                                    <>
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            Recommendation
                                                        </Typography>
                                                        <Typography paragraph>
                                                            {interaction.recommendation}
                                                        </Typography>
                                                    </>
                                                )}
                                                
                                                {interaction.references && interaction.references.length > 0 && (
                                                    <>
                                                        <Divider sx={{ my: 2 }} />
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            References
                                                        </Typography>
                                                        <List dense>
                                                            {interaction.references.map((ref, idx) => (
                                                                <ListItem key={idx}>
                                                                    <ListItemText primary={ref} />
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    </>
                                                )}
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Paper>

                <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
                    {medicationDetails && (
                        <>
                            <DialogTitle>
                                {selectedMedication?.name} Details
                            </DialogTitle>
                            <DialogContent>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Description
                                        </Typography>
                                        <Typography paragraph>
                                            {medicationDetails.description}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Drug Class
                                        </Typography>
                                        <Chip label={medicationDetails.drugClass} />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Warnings
                                        </Typography>
                                        <List dense>
                                            {medicationDetails.warnings.map((warning, idx) => (
                                                <ListItem key={idx}>
                                                    <ListItemText primary={warning} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Side Effects
                                        </Typography>
                                        <List dense>
                                            {medicationDetails.sideEffects.map((effect, idx) => (
                                                <ListItem key={idx}>
                                                    <ListItemText primary={effect} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Contraindications
                                        </Typography>
                                        <List dense>
                                            {medicationDetails.contraindications.map((contra, idx) => (
                                                <ListItem key={idx}>
                                                    <ListItemText primary={contra} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Grid>
                                </Grid>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={handleCloseDetails}>Close</Button>
                            </DialogActions>
                        </>
                    )}
                </Dialog>
            </Box>
        </DrugInteractionErrorBoundary>
    );
};

export default DrugInteractions;
