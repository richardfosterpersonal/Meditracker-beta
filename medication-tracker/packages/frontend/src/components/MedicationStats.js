import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    LinearProgress,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { getMedicationStats } from '../services/medicationHistory';

const MedicationStats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
    });

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await getMedicationStats({
                startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
                endDate: format(dateRange.endDate, 'yyyy-MM-dd')
            });
            setStats(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch medication statistics');
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 2 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
                {/* Date Range Picker */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="Start Date"
                                    value={dateRange.startDate}
                                    onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="End Date"
                                    value={dateRange.endDate}
                                    onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Overall Statistics */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Overall Compliance
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={stats?.compliance_rate || 0}
                                        sx={{ height: 10, borderRadius: 5 }}
                                    />
                                </Box>
                                <Box sx={{ minWidth: 35 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {`${Math.round(stats?.compliance_rate || 0)}%`}
                                    </Typography>
                                </Box>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Total Medications
                                    </Typography>
                                    <Typography variant="h6">
                                        {stats?.total_medications || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Total Doses
                                    </Typography>
                                    <Typography variant="h6">
                                        {stats?.total_doses || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Doses Taken
                                    </Typography>
                                    <Typography variant="h6" color="success.main">
                                        {stats?.doses_taken || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Doses Missed
                                    </Typography>
                                    <Typography variant="h6" color="error.main">
                                        {stats?.doses_missed || 0}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Medication-specific Statistics */}
                <Grid item xs={12}>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Medication</TableCell>
                                    <TableCell align="right">Total Doses</TableCell>
                                    <TableCell align="right">Taken</TableCell>
                                    <TableCell align="right">Missed</TableCell>
                                    <TableCell align="right">Compliance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stats?.medications_stats.map((med) => (
                                    <TableRow key={med.medication_id}>
                                        <TableCell component="th" scope="row">
                                            {med.medication_name}
                                        </TableCell>
                                        <TableCell align="right">{med.total_doses}</TableCell>
                                        <TableCell align="right">{med.doses_taken}</TableCell>
                                        <TableCell align="right">{med.doses_missed}</TableCell>
                                        <TableCell align="right">
                                            {`${Math.round(med.compliance_rate)}%`}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MedicationStats;
