import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ErrorProvider } from '../contexts/ErrorContext';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock performance tracking
jest.mock('../utils/withPerformanceTracking', () => ({
  withPerformanceTracking: (Component: any) => Component,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

interface WrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

function AllTheProviders({ children, initialEntries = ['/'] }: WrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ChakraProvider>
          <ErrorProvider>
            {children}
          </ErrorProvider>
        </ChakraProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function render(
  ui: ReactElement,
  { initialEntries, ...options }: RenderOptions & { initialEntries?: string[] } = {}
) {
  return rtlRender(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} initialEntries={initialEntries} />
    ),
    ...options,
  });
}

// Mock API response generator
export function generateMockMedication(overrides = {}) {
  return {
    id: 'med-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Medication',
    dosage: '100mg',
    instructions: 'Take with water',
    schedule: {
      frequency: 'daily',
      times: [{ hour: 9, minute: 0 }],
      startDate: '2024-01-01',
    },
    ...overrides,
  };
}

export function generateMockSchedule(overrides = {}) {
  return {
    id: 'schedule-' + Math.random().toString(36).substr(2, 9),
    medicationId: 'med-' + Math.random().toString(36).substr(2, 9),
    times: [{ hour: 9, minute: 0 }],
    startDate: '2024-01-01',
    frequency: 'daily',
    ...overrides,
  };
}

// Performance testing utilities
export function measureRenderTime(Component: React.ComponentType<any>, props = {}) {
  const start = performance.now();
  const { unmount } = render(<Component {...props} />);
  const end = performance.now();
  unmount();
  return end - start;
}

// Mock API response delay
export function createDelayedResponse<T>(data: T, delay = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

// Mock error responses
export class MockApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'MockApiError';
  }
}

export function createErrorResponse(
  status = 500,
  message = 'Internal Server Error',
  data?: any
): Promise<never> {
  return Promise.reject(new MockApiError(message, status, data));
}

// Re-export everything from RTL
export * from '@testing-library/react';
export { render };
