import React from 'react';
import { render, screen, fireEvent } from '../../../tests/testUtils';
import { DashboardErrorBoundary } from '../DashboardErrorBoundary';

// Mock console.error to avoid test output noise
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

const ErrorComponent = () => {
  throw new Error('Test error');
};

describe('DashboardErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <DashboardErrorBoundary>
        <div data-testid="test-child">Test Content</div>
      </DashboardErrorBoundary>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <DashboardErrorBoundary>
        <ErrorComponent />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('Something went wrong in the dashboard')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('provides retry functionality', () => {
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div data-testid="recovered">Recovered</div>;
    };

    render(
      <DashboardErrorBoundary>
        <TestComponent />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('Something went wrong in the dashboard')).toBeInTheDocument();

    // Simulate fixing the error
    shouldThrow = false;

    // Click retry button
    fireEvent.click(screen.getByText('Retry Dashboard'));

    // Component should recover
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('shows stack trace in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <DashboardErrorBoundary>
        <ErrorComponent />
      </DashboardErrorBoundary>
    );

    expect(screen.getByRole('pre')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides stack trace in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <DashboardErrorBoundary>
        <ErrorComponent />
      </DashboardErrorBoundary>
    );

    expect(screen.queryByRole('pre')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
