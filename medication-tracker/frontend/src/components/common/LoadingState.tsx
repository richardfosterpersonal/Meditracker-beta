import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';
import { performanceMonitoring } from '../../utils/performanceMonitoring';

interface Props {
  type?: 'full' | 'component' | 'skeleton';
  message?: string;
  height?: string | number;
  loadingId?: string;
}

const LoadingState: React.FC<Props> = ({
  type = 'component',
  message = 'Loading...',
  height = '200px',
  loadingId,
}) => {
  React.useEffect(() => {
    if (loadingId) {
      const startTime = performance.now();
      
      return () => {
        const duration = performance.now() - startTime;
        performanceMonitoring.recordMetric({
          name: 'loading_duration',
          value: duration,
          unit: 'milliseconds',
          tags: {
            loading_id: loadingId,
            component_type: type,
          },
        });
      };
    }
  }, [loadingId, type]);

  if (type === 'skeleton') {
    return (
      <Box sx={{ width: '100%', height }}>
        <Skeleton variant="rectangular" width="100%" height="60px" sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height="120px" sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rectangular" width="48%" height="40px" />
          <Skeleton variant="rectangular" width="48%" height="40px" />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: type === 'full' ? '100vh' : height,
        width: '100%',
      }}
    >
      <CircularProgress
        size={type === 'full' ? 60 : 40}
        thickness={4}
        sx={{ mb: 2 }}
      />
      <Typography
        variant={type === 'full' ? 'h6' : 'body1'}
        color="text.secondary"
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingState;
