import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import type { MedicationSchedule, DoseLog } from '../../store/services/medicationScheduleApi';

interface AdherenceReportProps {
  schedules: MedicationSchedule[];
  doseLogs: DoseLog[];
  startDate: Date;
  endDate: Date;
}

interface MedicationStats {
  medicationName: string;
  total: number;
  taken: number;
  missed: number;
  late: number;
  adherenceRate: number;
}

const AdherenceReport: React.FC<AdherenceReportProps> = ({
  schedules,
  doseLogs,
  startDate,
  endDate,
}) => {
  const theme = useTheme();

  const calculateMedicationStats = (scheduleId: string): MedicationStats => {
    const schedule = schedules.find(s => s.id === scheduleId);
    const logs = doseLogs.filter(log => 
      log.scheduleId === scheduleId &&
      isWithinInterval(new Date(log.scheduledTime), { start: startDate, end: endDate })
    );

    const taken = logs.filter(log => log.status === 'taken').length;
    const missed = logs.filter(log => log.status === 'missed').length;
    const late = logs.filter(log => log.status === 'late').length;
    const total = logs.length;

    return {
      medicationName: schedule?.medicationName || 'Unknown',
      total,
      taken,
      missed,
      late,
      adherenceRate: total > 0 ? (taken / total) * 100 : 0,
    };
  };

  const medicationStats = schedules.map(schedule => 
    calculateMedicationStats(schedule.id)
  );

  const overallStats = {
    total: medicationStats.reduce((acc, curr) => acc + curr.total, 0),
    taken: medicationStats.reduce((acc, curr) => acc + curr.taken, 0),
    missed: medicationStats.reduce((acc, curr) => acc + curr.missed, 0),
    late: medicationStats.reduce((acc, curr) => acc + curr.late, 0),
  };

  const pieChartData = [
    { name: 'Taken', value: overallStats.taken, color: theme.palette.success.main },
    { name: 'Missed', value: overallStats.missed, color: theme.palette.error.main },
    { name: 'Late', value: overallStats.late, color: theme.palette.warning.main },
  ];

  const exportReport = () => {
    const reportData = {
      period: `${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`,
      overallStats,
      medicationStats,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adherence-report-${format(startDate, 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          Adherence Report ({format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={exportReport}
          sx={{ 
            alignSelf: { xs: 'stretch', sm: 'auto' },
            py: { xs: 1, sm: 'inherit' }
          }}
        >
          Export Report
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            height: { xs: 250, sm: 300 },
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
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
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box sx={{ 
            overflowX: 'auto',
            '& .MuiTable-root': {
              minWidth: { xs: 500, sm: 650 }
            }
          }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Total Doses</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Taken</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Missed</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Late</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Adherence Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medicationStats.map((stat) => (
                    <TableRow 
                      key={stat.medicationName}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        '& td': { 
                          py: { xs: 1, sm: 1.5 },
                          px: { xs: 1, sm: 2 },
                          fontSize: { xs: '0.875rem', sm: 'inherit' }
                        }
                      }}
                    >
                      <TableCell 
                        component="th" 
                        scope="row"
                        sx={{ 
                          fontWeight: 'medium',
                          whiteSpace: { xs: 'normal', sm: 'nowrap' }
                        }}
                      >
                        {stat.medicationName}
                      </TableCell>
                      <TableCell align="right">{stat.total}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {stat.taken}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {stat.missed}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {stat.late}
                      </TableCell>
                      <TableCell align="right">
                        {Math.round(stat.adherenceRate)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AdherenceReport;
