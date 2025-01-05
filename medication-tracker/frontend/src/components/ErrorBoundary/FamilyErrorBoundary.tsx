import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { trackError } from '../../utils/analytics';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class FamilyErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Track error in analytics
    trackError(error, {
      component: 'FamilyManagement',
      errorInfo: errorInfo.componentStack,
    });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 3,
              maxWidth: 600,
              width: '100%',
              borderRadius: 2,
            }}
          >
            <Alert 
              severity="error"
              sx={{ mb: 2 }}
            >
              <AlertTitle>Something went wrong</AlertTitle>
              We encountered an error while managing your family settings.
            </Alert>

            <Typography variant="body1" paragraph>
              Don't worry, your data is safe. You can try:
            </Typography>

            <Box sx={{ mb: 3 }}>
              <ul>
                <li>
                  <Typography variant="body1">
                    Refreshing the page
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Checking your internet connection
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Trying again in a few minutes
                  </Typography>
                </li>
              </ul>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                sx={{ borderRadius: 2 }}
              >
                Try Again
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
                sx={{ borderRadius: 2 }}
              >
                Refresh Page
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Error Details (Development Only):
                </Typography>
                <pre style={{ 
                  overflow: 'auto',
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </Box>
            )}
          </Paper>

          <Typography variant="body2" color="text.secondary">
            If this problem persists, please contact our support team.
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}
