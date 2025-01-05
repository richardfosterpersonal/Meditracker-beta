import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    IconButton,
    Tooltip,
    Card,
    CardContent,
    Grid,
    TextField,
    SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
    format,
    parseISO,
    isWithinInterval,
    startOfDay,
    endOfDay,
    subDays,
    differenceInMinutes,
} from 'date-fns';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    Assessment as AssessmentIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import axiosInstance from '../../../services/api';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
}

interface MedicationEvent {
    id: string;
    medicationId: string;
    medicationName: string;
    scheduledTime: string;
    takenTime?: string;
    status: 'taken' | 'missed' | 'scheduled' | 'late';
    notes?: string;
    dosage: string;
}

interface MedicationStats {
    totalDoses: number;
    takenOnTime: number;
    takenLate: number;
    missed: number;
    compliance: number;
}

const MedicationHistory: React.FC = () => {
    const [history, setHistory] = useState<MedicationEvent[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [selectedMedication, setSelectedMedication] = useState<string>('all');
    const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [stats, setStats] = useState<MedicationStats>({
        totalDoses: 0,
        takenOnTime: 0,
        takenLate: 0,
        missed: 0,
        compliance: 0,
    });

    useEffect(() => {
        fetchMedications();
        fetchHistory();
    }, [selectedMedication, startDate, endDate]);

    const fetchMedications = async () => {
        try {
            const response = await axiosInstance.get('/medications');
            setMedications(response.data);
        } catch (err) {
            setError('Failed to fetch medications');
            console.error('Error fetching medications:', err);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                medicationId: selectedMedication !== 'all' ? selectedMedication : undefined,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };

            const response = await axiosInstance.get('/medication-history', { params });
            setHistory(response.data.events);
            calculateStats(response.data.events);
        } catch (err) {
            setError('Failed to fetch medication history');
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (events: MedicationEvent[]) => {
        const stats = events.reduce(
            (acc, event) => {
                acc.totalDoses++;
                if (event.status === 'taken') {
                    if (event.takenTime) {
                        const scheduledTime = parseISO(event.scheduledTime);
                        const takenTime = parseISO(event.takenTime);
                        const minutesDiff = differenceInMinutes(takenTime, scheduledTime);
                        if (minutesDiff <= 30) {
                            acc.takenOnTime++;
                        } else {
                            acc.takenLate++;
                        }
                    }
                } else if (event.status === 'missed') {
                    acc.missed++;
                }
                return acc;
            },
            { totalDoses: 0, takenOnTime: 0, takenLate: 0, missed: 0 }
        );

        stats.compliance = stats.totalDoses > 0
            ? ((stats.takenOnTime + stats.takenLate) / stats.totalDoses) * 100
            : 0;

        setStats(stats);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleMedicationChange = (event: SelectChangeEvent<string>) => {
        setSelectedMedication(event.target.value);
        setPage(0);
    };

    const getStatusColor = (status: MedicationEvent['status']): string => {
        switch (status) {
            case 'taken':
                return 'success';
            case 'missed':
                return 'error';
            case 'scheduled':
                return 'info';
            case 'late':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: MedicationEvent['status']) => {
        switch (status) {
            case 'taken':
                return <CheckCircleIcon />;
            case 'missed':
                return <CancelIcon />;
            case 'scheduled':
                return <ScheduleIcon />;
            case 'late':
                return <AssessmentIcon />;
            default:
                return <InfoIcon />;
        }
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
            <Typography variant="h4" gutterBottom>
                Medication History
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Compliance Rate
                            </Typography>
                            <Typography variant="h3" color="primary">
                                {stats.compliance.toFixed(1)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={3}>
                                    <Typography variant="subtitle2">Total Doses</Typography>
                                    <Typography variant="h6">{stats.totalDoses}</Typography>
                                </Grid>
                                <Grid item xs={3}>
                                    <Typography variant="subtitle2">Taken On Time</Typography>
                                    <Typography variant="h6" color="success.main">
                                        {stats.takenOnTime}
                                    </Typography>
                                </Grid>
                                <Grid item xs={3}>
                                    <Typography variant="subtitle2">Taken Late</Typography>
                                    <Typography variant="h6" color="warning.main">
                                        {stats.takenLate}
                                    </Typography>
                                </Grid>
                                <Grid item xs={3}>
                                    <Typography variant="subtitle2">Missed</Typography>
                                    <Typography variant="h6" color="error.main">
                                        {stats.missed}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Medication</InputLabel>
                            <Select
                                value={selectedMedication}
                                onChange={handleMedicationChange}
                                label="Medication"
                            >
                                <MenuItem value="all">All Medications</MenuItem>
                                {medications.map((med) => (
                                    <MenuItem key={med.id} value={med.id}>
                                        {med.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <DatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={(date) => date && setStartDate(date)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                },
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={(date) => date && setEndDate(date)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                },
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Medication</TableCell>
                            <TableCell>Scheduled Time</TableCell>
                            <TableCell>Taken Time</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Dosage</TableCell>
                            <TableCell>Notes</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell>{event.medicationName}</TableCell>
                                    <TableCell>
                                        {format(parseISO(event.scheduledTime), 'PPp')}
                                    </TableCell>
                                    <TableCell>
                                        {event.takenTime
                                            ? format(parseISO(event.takenTime), 'PPp')
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={getStatusIcon(event.status)}
                                            label={event.status.toUpperCase()}
                                            color={getStatusColor(event.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{event.dosage}</TableCell>
                                    <TableCell>{event.notes || '-'}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={history.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </Box>
    );
};

export default MedicationHistory;
