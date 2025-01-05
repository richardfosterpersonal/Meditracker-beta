import React, { Component, ErrorInfo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { monitoring } from '../../utils/monitoring';
import { performanceMonitoring } from '../../utils/performanceMonitoring';

interface Props {
  children: React.ReactNode;
  componentName: string;
  handleError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    monitoring.captureError(error, {
      component: this.props.componentName,
      metadata: { errorInfo },
    });

    // Record performance metric
    performanceMonitoring.recordMetric({
      name: 'error_boundary_catch',
      value: 1,
      unit: 'count',
      tags: {
        component: this.props.componentName,
        error_type: error.name,
      },
    });

    // Call custom error handler if provided
    if (this.props.handleError) {
      this.props.handleError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Oops! Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            We apologize for the inconvenience. Our team has been notified and is working on a fix.
          </Typography>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ mt: 2, mb: 4 }}>
              <Typography variant="body2" color="error" component="pre" sx={{ textAlign: 'left' }}>
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleRetry}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
