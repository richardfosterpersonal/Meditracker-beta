import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { format, isToday, isPast, isFuture, startOfWeek, subWeeks, parseISO } from 'date-fns';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { selectSelectedMember } from '../store/slices/familySlice';
import { shallowEqual } from 'react-redux';
import { useGetSchedulesQuery,
  useGetDoseLogsQuery,
  useGetAdherenceStatsQuery,
  useMarkDoseTakenMutation
} from '../store/services/medicationScheduleApi';
import MedicationScheduleForm from './Medications/components/MedicationScheduleForm';
import MedicationAdherence from './Medications/components/MedicationAdherence';
import MedicationCalendar from './Medications/components/MedicationCalendar';
import AdherenceTrendChart from '../components/charts/AdherenceTrendChart';
import AdherenceReport from '../components/reports/AdherenceReport';
import { useTheme } from '@mui/material/styles';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Dashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [openScheduleForm, setOpenScheduleForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [calendarView, setCalendarView] = useState(false);
  const [timeRange, setTimeRange] = useState('week');

  const { user, selectedFamilyMember } = useSelector((state) => ({
    user: selectUser(state),
    selectedFamilyMember: selectSelectedMember(state),
  }), shallowEqual);
  const theme = useTheme();

  const { data: schedules, isLoading: loadingSchedules, error } = useGetSchedulesQuery();
  const { data: adherenceStats } = useGetAdherenceStatsQuery();
  const { data: doseLogs } = useGetDoseLogsQuery();
  const [markDoseTaken] = useMarkDoseTakenMutation();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const calculateQuickStats = () => {
    if (!schedules || !doseLogs) return null;
    
    const activeSchedules = schedules.filter(s => s.status === 'active');
    const todayDoses = doseLogs.filter(log => isToday(new Date(log.scheduledTime)));
    const takenDoses = todayDoses.filter(log => log.status === 'taken');
    const adherenceRate = adherenceStats?.adherenceRate || 0;
    
    return {
      activeSchedules: activeSchedules.length,
      todayTotal: todayDoses.length,
      todayTaken: takenDoses.length,
      adherenceRate
    };
  };

  const quickStats = calculateQuickStats();

  const renderQuickStats = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            textAlign: 'center',
            height: '100%',
            borderRadius: 2,
            bgcolor: theme.palette.background.default
          }}
        >
          <CalendarIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4">{quickStats?.activeSchedules || 0}</Typography>
          <Typography variant="body2" color="textSecondary">Active Medications</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            textAlign: 'center',
            height: '100%',
            borderRadius: 2,
            bgcolor: theme.palette.background.default
          }}
        >
          <CheckIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4">
            {quickStats?.todayTaken || 0}/{quickStats?.todayTotal || 0}
          </Typography>
          <Typography variant="body2" color="textSecondary">Today's Doses Taken</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            textAlign: 'center',
            height: '100%',
            borderRadius: 2,
            bgcolor: theme.palette.background.default
          }}
        >
          <TrendingUpIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4">{Math.round(quickStats?.adherenceRate || 0)}%</Typography>
          <Typography variant="body2" color="textSecondary">Adherence Rate</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            textAlign: 'center',
            height: '100%',
            borderRadius: 2,
            bgcolor: theme.palette.background.default
          }}
        >
          <NotificationsIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4">
            {schedules?.filter(s => s.refillReminder?.enabled && isFuture(new Date(s.refillReminder.nextRefillDate))).length || 0}
          </Typography>
          <Typography variant="body2" color="textSecondary">Upcoming Refills</Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderScheduleList = () => (
    <List>
      {schedules?.map((schedule) => (
        <ListItem
          key={schedule.id}
          sx={{
            mb: 1,
            borderRadius: 1,
            bgcolor: theme.palette.background.paper,
            '&:hover': { bgcolor: theme.palette.action.hover }
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle1" component="span">
                  {schedule.medicationName}
                </Typography>
                <Chip
                  size="small"
                  label={schedule.status}
                  color={schedule.status === 'active' ? 'success' : 'default'}
                  sx={{ ml: 1 }}
                />
              </Box>
            }
            secondary={
              <>
                <Typography variant="body2" color="textSecondary">
                  {`${schedule.dosage} - ${schedule.frequency.type}`}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Next dose: {format(new Date(`${new Date().toISOString().split('T')[0]}T${schedule.frequency.times[0]}`), 'p')}
                </Typography>
              </>
            }
          />
          <ListItemSecondaryAction>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => handleMarkDoseTaken(schedule.id)}
              sx={{ mr: 1 }}
            >
              Mark Taken
            </Button>
            <IconButton
              edge="end"
              onClick={() => {
                setSelectedSchedule(schedule);
                setOpenScheduleForm(true);
              }}
            >
              <EditIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );

  const handleScheduleFormClose = () => {
    setOpenScheduleForm(false);
    setSelectedSchedule(null);
  };

  const handleScheduleSubmit = async (data) => {
    try {
      // Handle schedule submission logic
      setShowSnackbar(true);
      setSnackbarMessage('Schedule updated successfully');
      handleScheduleFormClose();
    } catch (error) {
      setShowSnackbar(true);
      setSnackbarMessage('Error updating schedule');
    }
  };

  const handleMarkDoseTaken = async (scheduleId) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      const scheduledTime = new Date(`${new Date().toISOString().split('T')[0]}T${schedule.frequency.times[0]}`).toISOString();
      
      await markDoseTaken({
        scheduleId,
        scheduledTime
      });

      setShowSnackbar(true);
      setSnackbarMessage('Dose marked as taken');
    } catch (error) {
      setShowSnackbar(true);
      setSnackbarMessage('Error marking dose as taken');
    }
  };

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography color="error" data-testid="schedule-error">
          Error loading schedules: {error.data?.message || 'An unexpected error occurred'}
        </Typography>
      </Box>
    );
  }

  if (loadingSchedules) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress data-testid="schedule-loading" />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 2, sm: 0 },
        mb: 3 
      }}>
        <Typography 
          variant="h5" 
          component="h1"
          sx={{ 
            textAlign: { xs: 'center', sm: 'left' },
            fontSize: { xs: '1.5rem', sm: '1.75rem' }
          }}
        >
          Medication Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenScheduleForm(true)}
          sx={{ 
            alignSelf: { xs: 'stretch', sm: 'auto' },
            py: { xs: 1.5, sm: 1 }
          }}
        >
          Add Medication
        </Button>
      </Box>

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Main Content */}
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          borderRadius: { xs: 2, sm: 2 },
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: { xs: 64, sm: 48 },
              py: { xs: 1.5, sm: 1 },
              '& .MuiSvgIcon-root': {
                fontSize: { xs: '1.5rem', sm: '1.25rem' }
              }
            }
          }}
        >
          <Tab
            icon={<CalendarIcon />}
            label="Schedule"
            id="dashboard-tab-0"
            aria-controls="dashboard-tabpanel-0"
          />
          <Tab
            icon={<TrendingUpIcon />}
            label="Adherence"
            id="dashboard-tab-1"
            aria-controls="dashboard-tabpanel-1"
          />
          <Tab
            icon={<AssessmentIcon />}
            label="Reports"
            id="dashboard-tab-2"
            aria-controls="dashboard-tabpanel-2"
          />
          <Tab
            icon={<PersonIcon />}
            label="Family"
            id="dashboard-tab-3"
            aria-controls="dashboard-tabpanel-3"
          />
          <Tab
            icon={<NotificationsIcon />}
            label="Notifications"
            id="dashboard-tab-4"
            aria-controls="dashboard-tabpanel-4"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Today's Schedule</Typography>
          </Box>
          <Box sx={{ 
            '& .MuiListItem-root': {
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1, sm: 0 },
              py: { xs: 2, sm: 1.5 },
              px: { xs: 2, sm: 2 }
            },
            '& .MuiListItemText-root': {
              my: { xs: 0, sm: 1 }
            },
            '& .MuiListItemSecondaryAction-root': {
              position: { xs: 'relative', sm: 'absolute' },
              transform: { xs: 'none', sm: 'translateY(-50%)' },
              top: { xs: 'auto', sm: '50%' },
              right: { xs: 'auto', sm: 16 },
              mt: { xs: 1, sm: 0 }
            }
          }}>
            {renderScheduleList()}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Medication Adherence</Typography>
            <Button
              variant="outlined"
              startIcon={calendarView ? <ListIcon /> : <CalendarIcon />}
              onClick={() => setCalendarView(!calendarView)}
            >
              {calendarView ? 'List View' : 'Calendar View'}
            </Button>
          </Box>
          
          {calendarView ? (
            <MedicationCalendar schedules={schedules} doseLogs={doseLogs} />
          ) : (
            <Grid container spacing={3}>
              {schedules?.map((schedule) => (
                <Grid item xs={12} key={schedule.id}>
                  <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">{schedule.medicationName}</Typography>
                      <Chip
                        label={`${schedule.dosage}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                    <MedicationAdherence
                      scheduleId={schedule.id}
                      medicationName={schedule.medicationName}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <AdherenceTrendChart
              doseLogs={doseLogs || []}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
            
            <AdherenceReport
              schedules={schedules || []}
              doseLogs={doseLogs || []}
              startDate={timeRange === 'week' ? startOfWeek(new Date()) : subWeeks(new Date(), 4)}
              endDate={new Date()}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Family Members</Typography>
          </Box>
          {/* Family member management content will be implemented in the next phase */}
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Notifications</Typography>
          </Box>
          {/* Notifications content will be implemented in the next phase */}
        </TabPanel>
      </Paper>

      {/* Medication Schedule Form Dialog */}
      <Dialog
        open={openScheduleForm}
        onClose={handleScheduleFormClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedSchedule ? 'Edit Medication Schedule' : 'New Medication Schedule'}
        </DialogTitle>
        <DialogContent>
          <MedicationScheduleForm
            initialData={selectedSchedule}
            onSubmit={handleScheduleSubmit}
            onCancel={handleScheduleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setShowSnackbar(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
}

export default Dashboard;