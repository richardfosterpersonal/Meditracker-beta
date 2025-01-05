import React, { Component, ErrorInfo } from 'react';
import { Box, Button, Heading, Text, VStack, useToast } from '@chakra-ui/react';
import { ErrorSeverity, ErrorCategory } from '../types/errors';
import { useError } from '../contexts/ErrorContext';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundaryClass extends Component<Props & { addError: Function }, State> {
  constructor(props: Props & { addError: Function }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.addError({
      message: error.message,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.SYSTEM,
      error,
      componentStack: errorInfo.componentStack,
      context: {
        componentStack: errorInfo.componentStack,
        name: error.name,
        stack: error.stack
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error }: { error?: Error }) {
  const toast = useToast();
  const handleReload = () => {
    toast({
      title: 'Reloading application',
      description: 'Attempting to recover from error',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    window.location.reload();
  };

  return (
    <Box p={4} borderRadius="md" bg="red.50" color="red.900">
      <VStack spacing={4} align="stretch">
        <Heading size="md">Something went wrong</Heading>
        <Text>{error?.message || 'An unexpected error occurred'}</Text>
        <Button colorScheme="red" onClick={handleReload}>
          Reload Application
        </Button>
      </VStack>
    </Box>
  );
}

export function ErrorBoundary(props: Props) {
  const { addError } = useError();
  return <ErrorBoundaryClass {...props} addError={addError} />;
}
