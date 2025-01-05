import React from 'react';
import { Box, Skeleton, Paper, useTheme } from '@mui/material';
import { performanceMonitoring } from '../../../utils/performanceMonitoring';

interface Props {
  loadingId?: string;
}

const InventoryLoadingState: React.FC<Props> = ({ loadingId }) => {
  const theme = useTheme();

  React.useEffect(() => {
    if (loadingId) {
      const startTime = performance.now();
      return () => {
        const duration = performance.now() - startTime;
        performanceMonitoring.recordMetric({
          name: 'inventory_loading_duration',
          value: duration,
          unit: 'milliseconds',
          tags: {
            loading_id: loadingId,
            component: 'InventoryTracker',
          },
        });
      };
    }
  }, [loadingId]);

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Supply Level Indicator */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={60} height={60} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
          </Box>
        </Box>

        {/* Refill History */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width="30%" height={28} />
          <Box sx={{ mt: 2 }}>
            {[...Array(3)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: theme.palette.background.default,
                }}
              >
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
                <Skeleton variant="rectangular" width={80} height={32} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Skeleton variant="rectangular" width={120} height={36} />
          <Skeleton variant="rectangular" width={120} height={36} />
        </Box>
      </Paper>

      {/* Upcoming Refills */}
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="35%" height={28} />
        <Box sx={{ mt: 2 }}>
          {[...Array(2)].map((_, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                p: 1,
                borderRadius: 1,
                bgcolor: theme.palette.background.default,
              }}
            >
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="50%" height={24} />
                <Skeleton variant="text" width="30%" height={20} />
              </Box>
              <Skeleton variant="text" width={100} height={24} />
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default InventoryLoadingState;
