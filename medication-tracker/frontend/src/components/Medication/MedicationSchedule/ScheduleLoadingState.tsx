import React from 'react';
import { Box, Skeleton, useTheme } from '@mui/material';
import { performanceMonitoring } from '../../../utils/performanceMonitoring';

interface Props {
  loadingId?: string;
}

const ScheduleLoadingState: React.FC<Props> = ({ loadingId }) => {
  const theme = useTheme();

  React.useEffect(() => {
    if (loadingId) {
      const startTime = performance.now();
      return () => {
        const duration = performance.now() - startTime;
        performanceMonitoring.recordMetric({
          name: 'schedule_loading_duration',
          value: duration,
          unit: 'milliseconds',
          tags: {
            loading_id: loadingId,
            component: 'MedicationSchedule',
          },
        });
      };
    }
  }, [loadingId]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" height={24} />
      </Box>

      {/* Schedule Grid */}
      <Box sx={{ display: 'grid', gap: 2, mb: 4 }}>
        {[...Array(7)].map((_, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              gap: 2,
              p: 2,
              borderRadius: 1,
              bgcolor: theme.palette.background.paper,
            }}
          >
            {/* Time */}
            <Skeleton variant="text" width={60} />
            
            {/* Medication Info */}
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="30%" />
            </Box>

            {/* Status */}
            <Skeleton variant="circular" width={24} height={24} />
          </Box>
        ))}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Skeleton variant="rectangular" width={120} height={36} />
        <Skeleton variant="rectangular" width={120} height={36} />
      </Box>
    </Box>
  );
};

export default ScheduleLoadingState;
