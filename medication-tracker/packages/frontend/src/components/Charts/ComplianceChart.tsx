import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  Select,
  MenuItem,
  useTheme,
  SelectChangeEvent,
  Grid,
  Skeleton
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { api } from '../../services/api';

interface ComplianceData {
  date: string;
  compliance: number;
  missedDoses: number;
  takenDoses: number;
  totalDoses: number;
}

interface MedicationCompliance {
  medicationId: string;
  medicationName: string;
  data: ComplianceData[];
}

export const ComplianceChart: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<number>(7); // days
  const [selectedMedication, setSelectedMedication] = useState<string>('all');
  const [medications, setMedications] = useState<{ id: string; name: string; }[]>([]);
  const [complianceData, setComplianceData] = useState<MedicationCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch medications list
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        const response = await api.get('/api/v1/medications');
        setMedications(response.data.map((med: any) => ({
          id: med.id,
          name: med.name
        })));
      } catch (err) {
        console.error('Error fetching medications:', err);
        setError('Failed to load medications');
      }
    };

    fetchMedications();
  }, []);

  // Fetch compliance data
  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoading(true);
      try {
        const endDate = new Date();
        const startDate = subDays(endDate, timeRange);
        
        // Create array of all dates in range
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        
        let response;
        if (selectedMedication === 'all') {
          response = await api.get('/api/v1/medications/compliance', {
            params: {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            }
          });
        } else {
          response = await api.get(`/api/v1/medications/${selectedMedication}/compliance`, {
            params: {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            }
          });
        }

        // Process and format the data
        const processedData = medications.map(med => ({
          medicationId: med.id,
          medicationName: med.name,
          data: dateRange.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const medData = response.data.find((d: any) => 
              d.medication_id === med.id && format(new Date(d.date), 'yyyy-MM-dd') === dateStr
            );
            
            return {
              date: dateStr,
              compliance: medData?.compliance_rate * 100 || 0,
              missedDoses: medData?.doses_missed || 0,
              takenDoses: medData?.doses_taken || 0,
              totalDoses: medData?.doses_scheduled || 0
            };
          })
        }));

        setComplianceData(processedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching compliance data:', err);
        setError('Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    if (medications.length > 0) {
      fetchComplianceData();
    }
  }, [timeRange, selectedMedication, medications]);

  const handleTimeRangeChange = (event: SelectChangeEvent<number>) => {
    setTimeRange(event.target.value as number);
  };

  const handleMedicationChange = (event: SelectChangeEvent<string>) => {
    setSelectedMedication(event.target.value);
  };

  const getChartData = () => {
    if (selectedMedication === 'all') {
      // Aggregate data for all medications
      const dates = complianceData[0]?.data.map(d => d.date) || [];
      return dates.map(date => {
        const dayData = complianceData.map(med => {
          const dateData = med.data.find(d => d.date === date);
          return dateData || { compliance: 0, missedDoses: 0, takenDoses: 0, totalDoses: 0 };
        });

        const totalTaken = dayData.reduce((sum, d) => sum + d.takenDoses, 0);
        const totalScheduled = dayData.reduce((sum, d) => sum + d.totalDoses, 0);
        const compliance = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

        return {
          date,
          compliance: Math.round(compliance),
          missedDoses: dayData.reduce((sum, d) => sum + d.missedDoses, 0),
          takenDoses: totalTaken
        };
      });
    } else {
      // Return data for selected medication
      const medData = complianceData.find(med => med.medicationId === selectedMedication);
      return medData?.data || [];
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', height: 400 }}>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <Select
                value={selectedMedication}
                onChange={handleMedicationChange}
                displayEmpty
              >
                <MenuItem value="all">All Medications</MenuItem>
                {medications.map(med => (
                  <MenuItem key={med.id} value={med.id}>{med.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <Select
                value={timeRange}
                onChange={handleTimeRangeChange}
              >
                <MenuItem value={7}>Last 7 Days</MenuItem>
                <MenuItem value={14}>Last 14 Days</MenuItem>
                <MenuItem value={30}>Last 30 Days</MenuItem>
                <MenuItem value={90}>Last 90 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart
              data={getChartData()}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'compliance') {
                    return [`${value}%`, 'Compliance Rate'];
                  }
                  return [value, name];
                }}
                labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="compliance"
                stroke={theme.palette.primary.main}
                activeDot={{ r: 8 }}
                name="Compliance Rate"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="takenDoses"
                stroke={theme.palette.success.main}
                name="Doses Taken"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="missedDoses"
                stroke={theme.palette.error.main}
                name="Doses Missed"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            * Compliance rate is calculated as the percentage of scheduled doses taken on time
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
