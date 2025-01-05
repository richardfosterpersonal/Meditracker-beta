import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';

interface MedicationStatsProps {
  totalMedications: number;
  activeMedications: number;
  upcomingRefills: number;
}

const MedicationStats: React.FC<MedicationStatsProps> = ({
  totalMedications,
  activeMedications,
  upcomingRefills,
}) => {
  const theme = useTheme();

  const stats = [
    {
      label: 'Total Medications',
      value: totalMedications,
      color: theme.palette.primary.main,
    },
    {
      label: 'Active Medications',
      value: activeMedications,
      color: theme.palette.success.main,
    },
    {
      label: 'Upcoming Refills',
      value: upcomingRefills,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Medication Statistics
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={totalMedications ? (stat.value / totalMedications) * 100 : 0}
                size={80}
                sx={{ color: stat.color }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" component="div">
                  {stat.value}
                </Typography>
              </Box>
            </Box>
            <Typography
              variant="body2"
              color="textSecondary"
              align="center"
              sx={{ mt: 1 }}
            >
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MedicationStats;
