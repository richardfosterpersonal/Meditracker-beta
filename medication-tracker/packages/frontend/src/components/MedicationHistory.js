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
import axiosInstance from '../services/api';

const MedicationHistory = () => {
    const [history, setHistory] = useState([]);
    const [medications, setMedications] = useState([]);
    const [selectedMedication, setSelectedMedication] = useState('all');
    const [startDate, setStartDate] = useState(subDays(new Date(), 30));
    const [endDate, setEndDate] = useState(new Date());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        taken: 0,
        missed: 0,
        onTime: 0,
        late: 0,
    });

    const fetchMedications = async () => {
        try {
            const response = await axiosInstance.get('/medications/');
            setMedications(response.data);
        } catch (error) {
            console.error('Error fetching medications:', error);
            setError('Failed to fetch medications');
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            let url = '/medication-history/';
            if (selectedMedication !== 'all') {
                url += `?medication_id=${selectedMedication}`;
            }
            const response = await axiosInstance.get(url);
            
            // Filter by date range
            const filteredHistory = response.data.filter(record => {
                const recordDate = parseISO(record.scheduledTime);
                return isWithinInterval(recordDate, {
                    start: startOfDay(startDate),
                    end: endOfDay(endDate)
                });
            });

            // Calculate statistics
            const stats = filteredHistory.reduce((acc, record) => {
                acc.total++;
                if (record.action === 'taken') {
                    acc.taken++;
                    const timeDiff = differenceInMinutes(
                        parseISO(record.takenTime),
                        parseISO(record.scheduledTime)
                    );
                    if (Math.abs(timeDiff) <= 30) {
                        acc.onTime++;
                    } else {
                        acc.late++;
                    }
                } else if (record.action === 'missed') {
                    acc.missed++;
                }
                return acc;
            }, { total: 0, taken: 0, missed: 0, onTime: 0, late: 0 });

            setStats(stats);
            setHistory(filteredHistory);
            setError('');
        } catch (error) {
            console.error('Error fetching history:', error);
            setError('Failed to fetch medication history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedications();
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchHistory();
        }
    }, [selectedMedication, startDate, endDate]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusChip = (record) => {
        if (record.action === 'taken') {
            const timeDiff = differenceInMinutes(
                parseISO(record.takenTime),
                parseISO(record.scheduledTime)
            );
            const isOnTime = Math.abs(timeDiff) <= 30;

            return (
                <Chip
                    icon={<CheckCircleIcon />}
                    label={isOnTime ? 'Taken on time' : 'Taken late'}
                    color={isOnTime ? 'success' : 'warning'}
                    size="small"
                />
            );
        }
        return (
            <Chip
                icon={<CancelIcon />}
                label="Missed"
                color="error"
                size="small"
            />
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" color="primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon />
                Medication History
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="primary" gutterBottom>Total Records</Typography>
                            <Typography variant="h4">{stats.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="success.main" gutterBottom>Taken on Time</Typography>
                            <Typography variant="h4">{stats.onTime}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="warning.main" gutterBottom>Taken Late</Typography>
                            <Typography variant="h4">{stats.late}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="error.main" gutterBottom>Missed</Typography>
                            <Typography variant="h4">{stats.missed}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Medication</InputLabel>
                            <Select
                                value={selectedMedication}
                                label="Medication"
                                onChange={(e) => setSelectedMedication(e.target.value)}
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
                            onChange={setStartDate}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={setEndDate}
                            renderInput={(params) => <TextField {...params} fullWidth />}
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
                            <TableCell>Actual Time</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Notes</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>{record.medicationName}</TableCell>
                                    <TableCell>
                                        {format(parseISO(record.scheduledTime), 'PPp')}
                                    </TableCell>
                                    <TableCell>
                                        {record.takenTime
                                            ? format(parseISO(record.takenTime), 'PPp')
                                            : '-'}
                                    </TableCell>
                                    <TableCell>{getStatusChip(record)}</TableCell>
                                    <TableCell>
                                        {record.notes && (
                                            <Tooltip title={record.notes}>
                                                <IconButton size="small">
                                                    <InfoIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
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
