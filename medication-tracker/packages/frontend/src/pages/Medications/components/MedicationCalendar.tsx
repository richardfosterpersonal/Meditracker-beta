import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
} from 'date-fns';
import type { MedicationSchedule, DoseLog } from '../../../store/services/medicationScheduleApi';

interface MedicationCalendarProps {
  schedules: MedicationSchedule[];
  doseLogs: DoseLog[];
}

const MedicationCalendar: React.FC<MedicationCalendarProps> = ({
  schedules,
  doseLogs,
}) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getDayStatus = (date: Date) => {
    const dayLogs = doseLogs?.filter((log) => isSameDay(new Date(log.scheduledTime), date));
    if (!dayLogs?.length) return null;

    const statuses = dayLogs.map((log) => log.status);
    if (statuses.every((status) => status === 'taken')) return 'taken';
    if (statuses.some((status) => status === 'missed')) return 'missed';
    if (statuses.some((status) => status === 'late')) return 'late';
    return 'partial';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'taken':
        return theme.palette.success.main;
      case 'missed':
        return theme.palette.error.main;
      case 'late':
        return theme.palette.warning.main;
      case 'partial':
        return theme.palette.info.main;
      default:
        return theme.palette.text.disabled;
    }
  };

  const getDoseCount = (date: Date) => {
    return doseLogs?.filter((log) => isSameDay(new Date(log.scheduledTime), date)).length || 0;
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6">
          {format(currentDate, 'MMMM yyyy')}
        </Typography>
        <IconButton onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      <Grid container spacing={1}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Grid item xs key={day}>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="subtitle2" color="textSecondary">
                {day}
              </Typography>
            </Box>
          </Grid>
        ))}

        {daysInMonth.map((date) => {
          const status = getDayStatus(date);
          const doseCount = getDoseCount(date);
          
          return (
            <Grid item xs key={date.toISOString()}>
              <Paper
                elevation={0}
                sx={{
                  p: 1,
                  height: '100px',
                  border: '1px solid',
                  borderColor: isToday(date) ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: isToday(date) ? 'primary.light' : 'background.default',
                  opacity: doseCount > 0 ? 1 : 0.7,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'right',
                    color: isToday(date) ? 'primary.main' : 'text.primary',
                    fontWeight: isToday(date) ? 'bold' : 'normal',
                  }}
                >
                  {format(date, 'd')}
                </Typography>
                
                {doseCount > 0 && (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tooltip title={`${doseCount} doses ${status}`}>
                      {status === 'taken' ? (
                        <CheckIcon sx={{ color: getStatusColor(status) }} />
                      ) : status === 'missed' ? (
                        <CloseIcon sx={{ color: getStatusColor(status) }} />
                      ) : (
                        <WarningIcon sx={{ color: getStatusColor(status) }} />
                      )}
                    </Tooltip>
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckIcon sx={{ color: getStatusColor('taken') }} />
          <Typography variant="body2">All Taken</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloseIcon sx={{ color: getStatusColor('missed') }} />
          <Typography variant="body2">Missed</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: getStatusColor('late') }} />
          <Typography variant="body2">Late/Partial</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default MedicationCalendar;
