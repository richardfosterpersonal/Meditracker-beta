import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary/ErrorBoundary';

describe('ErrorBoundary', () => {
  const mockReset = jest.fn();
  const mockError = jest.fn();
  const consoleError = console.error;

  beforeAll(() => {
    // Suppress console.error during tests
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = consoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ErrorComponent = () => {
    throw new Error('Test error');
  };

  const NonErrorComponent = () => <div>No error</div>;

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary onReset={mockReset} onError={mockError}>
        <NonErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary onReset={mockReset} onError={mockError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('should show component name in error message when provided', () => {
    render(
      <ErrorBoundary componentName="TestComponent" onReset={mockReset} onError={mockError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('An error occurred in TestComponent')).toBeInTheDocument();
  });

  it('should call onReset when retry button is clicked', () => {
    render(
      <ErrorBoundary onReset={mockReset} onError={mockError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should render fallback UI when provided and error occurs', () => {
    const fallback = <div>Custom fallback UI</div>;
    render(
      <ErrorBoundary fallback={fallback} onReset={mockReset} onError={mockError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
  });

  it('should call onError with error details when error occurs', () => {
    render(
      <ErrorBoundary onReset={mockReset} onError={mockError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(mockError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });
});
