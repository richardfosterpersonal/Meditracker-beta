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
import axiosInstance from '../../../services/api';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
    time: string;
}

interface ScheduleItem {
    id: string;
    medicationId: string;
    medicationName: string;
    dosage: string;
    time: string;
    status: 'pending' | 'taken' | 'missed';
    instructions?: string;
}

interface ScheduleData {
    [date: string]: ScheduleItem[];
}

interface ConfirmDialogState {
    open: boolean;
    medication: ScheduleItem | null;
    action: 'take' | 'miss' | null;
}

const MedicationSchedule: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [medications, setMedications] = useState<Medication[]>([]);
    const [scheduleData, setScheduleData] = useState<ScheduleData>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        open: false,
        medication: null,
        action: null,
    });

    const fetchMedications = async () => {
        try {
            const response = await axiosInstance.get('/medications');
            setMedications(response.data);
        } catch (err) {
            setError('Failed to fetch medications');
            console.error('Error fetching medications:', err);
        }
    };

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            
            const response = await axiosInstance.get('/medication-schedule', {
                params: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                },
            });
            
            setScheduleData(response.data);
        } catch (err) {
            setError('Failed to fetch schedule');
            console.error('Error fetching schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedications();
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [currentDate]);

    const handlePreviousWeek = () => {
        setCurrentDate(subWeeks(currentDate, 1));
    };

    const handleNextWeek = () => {
        setCurrentDate(addWeeks(currentDate, 1));
    };

    const handleDayClick = (day: Date) => {
        setSelectedDay(day);
    };

    const handleMedicationAction = (medication: ScheduleItem, action: 'take' | 'miss') => {
        setConfirmDialog({
            open: true,
            medication,
            action,
        });
    };

    const handleConfirmAction = async () => {
        if (!confirmDialog.medication || !confirmDialog.action) return;

        try {
            const action = confirmDialog.action === 'take' ? 'taken' : 'missed';
            await axiosInstance.post(`/medication-events/${confirmDialog.medication.id}/${action}`);
            await fetchSchedule();
            setConfirmDialog({ open: false, medication: null, action: null });
        } catch (err) {
            setError('Failed to update medication status');
            console.error('Error updating medication status:', err);
        }
    };

    const renderDaySchedule = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const daySchedule = scheduleData[dateKey] || [];

        return (
            <Card
                sx={{
                    height: '100%',
                    cursor: 'pointer',
                    bgcolor: isToday(day) ? 'primary.light' : 'background.paper',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
                onClick={() => handleDayClick(day)}
            >
                <CardContent>
                    <Typography
                        variant="h6"
                        align="center"
                        color={isToday(day) ? 'primary.contrastText' : 'text.primary'}
                    >
                        {format(day, 'EEE')}
                    </Typography>
                    <Typography
                        variant="h4"
                        align="center"
                        color={isToday(day) ? 'primary.contrastText' : 'text.primary'}
                    >
                        {format(day, 'd')}
                    </Typography>
                    <Box mt={2}>
                        {daySchedule.map((item) => (
                            <Chip
                                key={item.id}
                                icon={
                                    item.status === 'taken' ? (
                                        <CheckCircleIcon />
                                    ) : item.status === 'missed' ? (
                                        <CancelIcon />
                                    ) : (
                                        <ScheduleIcon />
                                    )
                                }
                                label={item.medicationName}
                                color={
                                    item.status === 'taken'
                                        ? 'success'
                                        : item.status === 'missed'
                                        ? 'error'
                                        : 'default'
                                }
                                size="small"
                                sx={{ m: 0.5 }}
                            />
                        ))}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Typography variant="h4">Medication Schedule</Typography>
                    <Box>
                        <IconButton onClick={handlePreviousWeek}>
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="h6" component="span" sx={{ mx: 2 }}>
                            {format(startOfWeek(currentDate), 'MMM d')} -{' '}
                            {format(endOfWeek(currentDate), 'MMM d, yyyy')}
                        </Typography>
                        <IconButton onClick={handleNextWeek}>
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={2}>
                    {eachDayOfInterval({
                        start: startOfWeek(currentDate),
                        end: endOfWeek(currentDate),
                    }).map((day) => (
                        <Grid item xs key={day.toISOString()}>
                            {renderDaySchedule(day)}
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            <Dialog
                open={Boolean(selectedDay)}
                onClose={() => setSelectedDay(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {selectedDay && format(selectedDay, 'EEEE, MMMM d, yyyy')}
                </DialogTitle>
                <DialogContent>
                    {selectedDay && (
                        <Box>
                            {scheduleData[format(selectedDay, 'yyyy-MM-dd')]?.map((item) => (
                                <Card key={item.id} sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item>
                                                <MedicineIcon color="primary" />
                                            </Grid>
                                            <Grid item xs>
                                                <Typography variant="h6">{item.medicationName}</Typography>
                                                <Typography color="textSecondary">
                                                    {item.dosage} - {format(parseISO(item.time), 'h:mm a')}
                                                </Typography>
                                                {item.instructions && (
                                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                                        {item.instructions}
                                                    </Typography>
                                                )}
                                            </Grid>
                                            <Grid item>
                                                {item.status === 'pending' && (
                                                    <Box>
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={() =>
                                                                handleMedicationAction(item, 'take')
                                                            }
                                                            sx={{ mr: 1 }}
                                                        >
                                                            Take
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() =>
                                                                handleMedicationAction(item, 'miss')
                                                            }
                                                        >
                                                            Miss
                                                        </Button>
                                                    </Box>
                                                )}
                                                {item.status !== 'pending' && (
                                                    <Chip
                                                        label={item.status.toUpperCase()}
                                                        color={
                                                            item.status === 'taken'
                                                                ? 'success'
                                                                : 'error'
                                                        }
                                                    />
                                                )}
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedDay(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmDialog.open}
                onClose={() =>
                    setConfirmDialog({ open: false, medication: null, action: null })
                }
            >
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography>
                        {confirmDialog.action === 'take'
                            ? 'Mark this medication as taken?'
                            : 'Mark this medication as missed?'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() =>
                            setConfirmDialog({ open: false, medication: null, action: null })
                        }
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmAction}
                        color={confirmDialog.action === 'take' ? 'primary' : 'error'}
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
