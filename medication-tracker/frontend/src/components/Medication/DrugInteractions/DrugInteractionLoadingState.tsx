import React from 'react';
import { Box, Skeleton, useTheme, Paper } from '@mui/material';
import { performanceMonitoring } from '../../../utils/performanceMonitoring';

interface Props {
  loadingId?: string;
}

const DrugInteractionLoadingState: React.FC<Props> = ({ loadingId }) => {
  const theme = useTheme();

  React.useEffect(() => {
    if (loadingId) {
      const startTime = performance.now();
      return () => {
        const duration = performance.now() - startTime;
        performanceMonitoring.recordMetric({
          name: 'drug_interaction_loading_duration',
          value: duration,
          unit: 'milliseconds',
          tags: {
            loading_id: loadingId,
            component: 'DrugInteractions',
          },
        });
      };
    }
  }, [loadingId]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="70%" height={40} />
        <Skeleton variant="text" width="50%" height={24} />
      </Box>

      {/* Safety Score */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Skeleton variant="circular" width={80} height={80} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="60%" height={24} />
          </Box>
        </Box>
      </Paper>

      {/* Interaction List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[...Array(3)].map((_, index) => (
          <Paper key={index} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Severity Icon */}
              <Skeleton variant="circular" width={40} height={40} />
              
              {/* Content */}
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="text" width="80%" height={20} />
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="85%" />
                  <Skeleton variant="text" width="70%" />
                </Box>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Skeleton variant="rectangular" width={120} height={36} />
        <Skeleton variant="rectangular" width={150} height={36} />
      </Box>
    </Box>
  );
};

export default DrugInteractionLoadingState;
