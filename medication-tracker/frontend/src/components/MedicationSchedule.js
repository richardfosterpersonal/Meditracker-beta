import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Grid,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Card,
    CardContent,
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    LocalHospital as MedicineIcon,
} from '@mui/icons-material';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isToday,
    isSameDay,
    addWeeks,
    subWeeks,
    parseISO,
    isBefore,
} from 'date-fns';
import axiosInstance from '../services/api';

const MedicationSchedule = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [medications, setMedications] = useState([]);
    const [scheduleData, setScheduleData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, medication: null, action: null });

    const fetchMedications = async () => {
        try {
            const response = await axiosInstance.get('/medications/');
            setMedications(response.data);
            generateSchedule(response.data);
        } catch (err) {
            console.error('Error fetching medications:', err);
            setError('Failed to fetch medications');
        } finally {
            setLoading(false);
        }
    };

    const generateSchedule = (meds) => {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start, end });

        const newSchedule = {};
        days.forEach(day => {
            newSchedule[format(day, 'yyyy-MM-dd')] = meds.filter(med => {
                const nextDose = med.nextDose ? parseISO(med.nextDose) : null;
                return nextDose && isSameDay(nextDose, day);
            });
        });

        setScheduleData(newSchedule);
    };

    useEffect(() => {
        fetchMedications();
    }, [currentDate]);

    const handlePreviousWeek = () => {
        setCurrentDate(prev => subWeeks(prev, 1));
    };

    const handleNextWeek = () => {
        setCurrentDate(prev => addWeeks(prev, 1));
    };

    const handleMedicationAction = async (medicationId, action) => {
        try {
            await axiosInstance.post(`/medications/${medicationId}/track`, { action });
            fetchMedications();
            setConfirmDialog({ open: false, medication: null, action: null });
        } catch (err) {
            console.error('Error tracking medication:', err);
            setError('Failed to track medication');
        }
    };

    const renderDayCell = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayMedications = scheduleData[dateStr] || [];
        const isCurrentDay = isToday(day);

        return (
            <Card 
                sx={{ 
                    height: '100%',
                    bgcolor: isCurrentDay ? 'primary.light' : 'background.paper',
                    '&:hover': { boxShadow: 3 }
                }}
            >
                <CardContent>
                    <Typography
                        variant="h6"
                        align="center"
                        sx={{
                            mb: 1,
                            color: isCurrentDay ? 'primary.contrastText' : 'text.primary'
                        }}
                    >
                        {format(day, 'EEE')}
                        <br />
                        {format(day, 'd')}
                    </Typography>
                    
                    {dayMedications.map(med => (
                        <Box
                            key={med.id}
                            sx={{
                                mb: 1,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                                boxShadow: 1
                            }}
                        >
                            <Typography variant="subtitle2" noWrap>
                                {med.name}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                                {med.dosage}
                            </Typography>
                            {isBefore(parseISO(med.nextDose), new Date()) ? (
                                <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                                    <Button
                                        size="small"
                                        startIcon={<CheckCircleIcon />}
                                        onClick={() => setConfirmDialog({ 
                                            open: true, 
                                            medication: med,
                                            action: 'taken'
                                        })}
                                        color="success"
                                        variant="outlined"
                                        fullWidth
                                    >
                                        Taken
                                    </Button>
                                    <Button
                                        size="small"
                                        startIcon={<CancelIcon />}
                                        onClick={() => setConfirmDialog({
                                            open: true,
                                            medication: med,
                                            action: 'missed'
                                        })}
                                        color="error"
                                        variant="outlined"
                                        fullWidth
                                    >
                                        Missed
                                    </Button>
                                </Box>
                            ) : (
                                <Chip
                                    icon={<ScheduleIcon />}
                                    label={format(parseISO(med.nextDose), 'p')}
                                    size="small"
                                    color="primary"
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                    ))}
                    
                    {dayMedications.length === 0 && (
                        <Typography 
                            variant="body2" 
                            color="text.secondary"
                            align="center"
                            sx={{ mt: 2 }}
                        >
                            No medications
                        </Typography>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    const days = eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 })
    });

    return (
        <Box sx={{ p: 3 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box 
                sx={{ 
                    mb: 3, 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Typography variant="h4" component="h1" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MedicineIcon />
                    Medication Schedule
                </Typography>
                <Box>
                    <IconButton onClick={handlePreviousWeek}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" component="span" sx={{ mx: 2 }}>
                        {format(days[0], 'MMM d')} - {format(days[6], 'MMM d, yyyy')}
                    </Typography>
                    <IconButton onClick={handleNextWeek}>
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            </Box>

            <Grid container spacing={2}>
                {days.map((day) => (
                    <Grid item xs key={day.toISOString()} sx={{ minHeight: 200 }}>
                        {renderDayCell(day)}
                    </Grid>
                ))}
            </Grid>

            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, medication: null, action: null })}
            >
                <DialogTitle>
                    Confirm {confirmDialog.action === 'taken' ? 'Taking' : 'Missing'} Medication
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {confirmDialog.action === 'taken' 
                            ? 'Have you taken this medication?' 
                            : 'Mark this medication as missed?'}
                    </Typography>
                    {confirmDialog.medication && (
                        <Typography color="primary" sx={{ mt: 1 }}>
                            {confirmDialog.medication.name} - {confirmDialog.medication.dosage}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setConfirmDialog({ open: false, medication: null, action: null })}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleMedicationAction(
                            confirmDialog.medication.id,
                            confirmDialog.action
                        )}
                        color={confirmDialog.action === 'taken' ? 'success' : 'error'}
                        variant="contained"
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MedicationSchedule;
