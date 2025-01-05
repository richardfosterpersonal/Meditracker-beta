import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorProvider } from '../../contexts/ErrorContext';

const ThrowError = () => {
  throw new Error('Test error');
};

const TestComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Test Component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ChakraProvider>
        <ErrorProvider>
          <ErrorBoundary>
            <div>Test Content</div>
          </ErrorBoundary>
        </ErrorProvider>
      </ChakraProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders error fallback when there is an error', () => {
    render(
      <ChakraProvider>
        <ErrorProvider>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorProvider>
      </ChakraProvider>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Test error/i)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom Error View</div>;

    render(
      <ChakraProvider>
        <ErrorProvider>
          <ErrorBoundary fallback={<CustomFallback />}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorProvider>
      </ChakraProvider>
    );

    expect(screen.getByText('Custom Error View')).toBeInTheDocument();
  });

  it('provides reload functionality in error fallback', () => {
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true
    });

    render(
      <ChakraProvider>
        <ErrorProvider>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorProvider>
      </ChakraProvider>
    );

    const reloadButton = screen.getByText(/Reload Application/i);
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });
});
