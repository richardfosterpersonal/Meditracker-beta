import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Tabs,
    Tab,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    LocalHospital as MedicineIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Notifications as NotificationsIcon,
    TrendingUp as TrendingUpIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, subDays } from 'date-fns';
import Medications from './Medications';
import MedicationSchedule from './MedicationSchedule';
import axiosInstance from '../services/api';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`medication-tabpanel-${index}`}
            aria-labelledby={`medication-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const Dashboard = () => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overview, setOverview] = useState({
        totalMedications: 0,
        activeMedications: 0,
        upcomingDoses: [],
        adherenceRate: 0,
        recentHistory: [],
        notifications: [],
    });

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            
            const [medicationsRes, historyRes, notificationsRes] = await Promise.all([
                axiosInstance.get('/medications/'),
                axiosInstance.get('/medication-history/'),
                axiosInstance.get('/notifications/')
            ]).catch(error => {
                console.error('API call failed:', error);
                throw new Error('Failed to fetch dashboard data');
            });

            const medications = medicationsRes.data;
            const history = historyRes.data;
            const notifications = notificationsRes.data;

            // Calculate active medications
            const active = medications.filter(med => 
                !med.endDate || isAfter(parseISO(med.endDate), new Date())
            );

            // Get upcoming doses for next 24 hours
            const upcoming = medications
                .filter(med => med.nextDose && isAfter(parseISO(med.nextDose), new Date()))
                .sort((a, b) => parseISO(a.nextDose) - parseISO(b.nextDose))
                .slice(0, 5);

            // Calculate adherence rate for last 30 days
            const recentHistory = history.filter(h => 
                isAfter(parseISO(h.scheduledTime), subDays(new Date(), 30))
            );
            const takenOnTime = recentHistory.filter(h => h.status === 'taken').length;
            const adherenceRate = recentHistory.length > 0
                ? (takenOnTime / recentHistory.length) * 100
                : 0;

            setOverview({
                totalMedications: medications.length,
                activeMedications: active.length,
                upcomingDoses: upcoming,
                adherenceRate: Math.round(adherenceRate),
                recentHistory: recentHistory.slice(0, 5),
                notifications: notifications,
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const getAdherenceColor = (rate) => {
        if (rate >= 80) return 'success.main';
        if (rate >= 60) return 'warning.main';
        return 'error.main';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg">
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    {/* Overview Cards */}
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Medications
                                </Typography>
                                <Typography variant="h3">
                                    {overview.totalMedications}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {overview.activeMedications} active
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    30-Day Adherence
                                </Typography>
                                <Typography 
                                    variant="h3" 
                                    sx={{ color: getAdherenceColor(overview.adherenceRate) }}
                                >
                                    {overview.adherenceRate}%
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Last 30 days
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Quick Actions
                                </Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<MedicineIcon />}
                                            fullWidth
                                            onClick={() => setTabValue(0)}
                                        >
                                            Add Medication
                                        </Button>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<PersonIcon />}
                                            fullWidth
                                            onClick={() => setTabValue(2)}
                                        >
                                            Family Members
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Upcoming Doses */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Upcoming Doses
                                </Typography>
                                <List>
                                    {overview.upcomingDoses.map((med) => (
                                        <ListItem key={med.id}>
                                            <ListItemIcon>
                                                <ScheduleIcon color="primary" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={med.name}
                                                secondary={`${med.dosage} - ${format(parseISO(med.nextDose), 'p')}`}
                                            />
                                        </ListItem>
                                    ))}
                                    {overview.upcomingDoses.length === 0 && (
                                        <ListItem>
                                            <ListItemText
                                                primary="No upcoming doses"
                                                secondary="You're all caught up!"
                                            />
                                        </ListItem>
                                    )}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Recent Activity */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Recent Activity
                                </Typography>
                                <List>
                                    {overview.recentHistory.map((record) => (
                                        <ListItem key={record.id}>
                                            <ListItemIcon>
                                                {record.status === 'taken' ? (
                                                    <CheckCircleIcon color="success" />
                                                ) : (
                                                    <WarningIcon color="error" />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={record.medicationName}
                                                secondary={format(parseISO(record.scheduledTime), 'PPp')}
                                            />
                                        </ListItem>
                                    ))}
                                    {overview.recentHistory.length === 0 && (
                                        <ListItem>
                                            <ListItemText
                                                primary="No recent activity"
                                                secondary="Start tracking your medications!"
                                            />
                                        </ListItem>
                                    )}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>

            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab label="Medications" />
                    <Tab label="Schedule" />
                    <Tab label="Family Members" />
                </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
                <Medications />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
                <MedicationSchedule />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
                <Typography variant="h6">Family Members Management</Typography>
            </TabPanel>
        </Container>
    );
};

export default Dashboard;
