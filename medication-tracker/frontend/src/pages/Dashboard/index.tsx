import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  useTheme,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import { useGetFamilyMembersQuery } from '../../store/services/familyApi';
import { useGetMedicationsQuery } from '../../store/services/medicationApi';
import MedicationStats from './components/MedicationStats';
import FamilyOverview from './components/FamilyOverview';
import UpcomingMedications from './components/UpcomingMedications';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { data: familyMembers, isLoading: loadingFamily } = useGetFamilyMembersQuery();
  const { data: medications, isLoading: loadingMedications } = useGetMedicationsQuery();

  if (loadingFamily || loadingMedications) {
    return <LinearProgress />;
  }

  const totalMedications = medications?.length || 0;
  const activeMedications = medications?.filter((med: any) => med.status === 'active').length || 0;
  const upcomingRefills = medications?.filter((med: any) => {
    // Calculate refill date based on compliance and next dose
    const nextDoseDate = new Date(med.nextDose);
    const today = new Date();
    const daysUntilNextDose = Math.ceil(
      (nextDoseDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
    );
    // If compliance is low or next dose is within 7 days, consider it needing refill
    return med.compliance < 70 || daysUntilNextDose <= 7;
  }).length || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Medication Statistics */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              height: '100%',
              borderRadius: theme.shape.borderRadius,
            }}
          >
            <MedicationStats
              totalMedications={totalMedications}
              activeMedications={activeMedications}
              upcomingRefills={upcomingRefills}
            />
          </Paper>
        </Grid>

        {/* Family Overview */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              height: '100%',
              borderRadius: theme.shape.borderRadius,
            }}
          >
            <FamilyOverview familyMembers={familyMembers || []} />
          </Paper>
        </Grid>

        {/* Upcoming Medications */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              height: '100%',
              borderRadius: theme.shape.borderRadius,
            }}
          >
            <UpcomingMedications medications={medications || []} />
          </Paper>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: theme.shape.borderRadius,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Today's Schedule
            </Typography>
            <Timeline>
              {medications
                ?.filter((med: any) => {
                  const nextDose = new Date(med.nextDose);
                  return (
                    nextDose.getDate() === new Date().getDate() &&
                    nextDose.getMonth() === new Date().getMonth() &&
                    nextDose.getFullYear() === new Date().getFullYear()
                  );
                })
                .sort((a: any, b: any) => new Date(a.nextDose).getTime() - new Date(b.nextDose).getTime())
                .map((med: any, index) => (
                  <TimelineItem key={med.id}>
                    <TimelineSeparator>
                      <TimelineDot color="primary" />
                      {index < medications.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">
                          {format(new Date(med.nextDose), 'h:mm a')}
                        </Typography>
                        <Typography>{med.name}</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={med.dosage}
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            size="small"
                            label={med.frequency}
                          />
                        </Box>
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                ))}
            </Timeline>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
