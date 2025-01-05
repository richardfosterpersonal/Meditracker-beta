import React from 'react';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subWeeks } from 'date-fns';
import type { DoseLog } from '../../store/services/medicationScheduleApi';

interface AdherenceTrendChartProps {
  doseLogs: DoseLog[];
  timeRange: 'week' | 'month';
  onTimeRangeChange: (range: 'week' | 'month') => void;
}

interface DailyStats {
  date: string;
  adherenceRate: number;
  taken: number;
  missed: number;
  late: number;
}

const AdherenceTrendChart: React.FC<AdherenceTrendChartProps> = ({
  doseLogs,
  timeRange,
  onTimeRangeChange,
}) => {
  const theme = useTheme();

  const calculateDailyStats = (date: Date): DailyStats => {
    const dayLogs = doseLogs.filter(log => 
      format(new Date(log.scheduledTime), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    const taken = dayLogs.filter(log => log.status === 'taken').length;
    const missed = dayLogs.filter(log => log.status === 'missed').length;
    const late = dayLogs.filter(log => log.status === 'late').length;
    const total = dayLogs.length;

    return {
      date: format(date, 'MMM dd'),
      adherenceRate: total > 0 ? (taken / total) * 100 : 0,
      taken,
      missed,
      late,
    };
  };

  const getDateRange = () => {
    const end = new Date();
    const start = timeRange === 'week' 
      ? startOfWeek(end, { weekStartsOn: 1 })
      : subWeeks(end, 4);

    return eachDayOfInterval({ start, end });
  };

  const data = getDateRange().map(date => calculateDailyStats(date));

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: { xs: 1, sm: 2, md: 3 }, borderRadius: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        gap: { xs: 2, sm: 0 },
        mb: 3 
      }}>
        <Typography variant="h6" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          Adherence Trend
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(e, value) => value && onTimeRangeChange(value)}
          size="small"
          sx={{ 
            alignSelf: { xs: 'center', sm: 'auto' },
            '& .MuiToggleButton-root': {
              px: { xs: 3, sm: 2 },
              py: { xs: 1, sm: 0.5 },
              fontSize: { xs: '0.9rem', sm: '0.875rem' }
            }
          }}
        >
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={data} 
          margin={{ 
            top: 5, 
            right: 10, 
            left: 0, 
            bottom: 5 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date"
            tick={{ 
              fill: theme.palette.text.secondary,
              fontSize: { xs: 12, sm: 14 }
            }}
            interval={'preserveStartEnd'}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ 
              fill: theme.palette.text.secondary,
              fontSize: { xs: 12, sm: 14 }
            }}
            domain={[0, 100]}
            unit="%"
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              fontSize: '0.875rem',
              padding: '8px 12px'
            }}
            wrapperStyle={{
              outline: 'none'
            }}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '0.875rem'
            }}
          />
          <Line
            type="monotone"
            dataKey="adherenceRate"
            name="Adherence Rate"
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <Box sx={{ 
        mt: 2, 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 3 }, 
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="textSecondary">Average Adherence</Typography>
          <Typography variant="h6">
            {Math.round(data.reduce((acc, curr) => acc + curr.adherenceRate, 0) / data.length)}%
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="textSecondary">Total Doses</Typography>
          <Typography variant="h6">
            {data.reduce((acc, curr) => acc + curr.taken + curr.missed + curr.late, 0)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="textSecondary">Doses Taken</Typography>
          <Typography variant="h6" color="success.main">
            {data.reduce((acc, curr) => acc + curr.taken, 0)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default AdherenceTrendChart;
