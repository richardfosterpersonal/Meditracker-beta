import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/test-utils';
import Dashboard from '../../components/Dashboard/Dashboard';
import { medicationScheduleApi } from '../../store/services/medicationScheduleApi';

// Mock the RTK Query hooks
jest.mock('../../store/services/medicationScheduleApi', () => ({
  ...jest.requireActual('../../store/services/medicationScheduleApi'),
  useGetSchedulesQuery: jest.fn(),
  useGetDoseLogsQuery: jest.fn(),
  useGetAdherenceStatsQuery: jest.fn(),
}));

describe('Dashboard Integration Tests', () => {
  const mockSchedules = [
    {
      id: '1',
      medicationName: 'Medication A',
      dosage: '10mg',
      frequency: { type: 'daily', times: ['08:00', '20:00'] },
      status: 'active',
    },
  ];

  const mockDoseLogs = [
    {
      id: '1',
      scheduleId: '1',
      status: 'taken',
      scheduledTime: '2024-12-08T08:00:00.000Z',
      takenTime: '2024-12-08T08:05:00.000Z',
    },
  ];

  const mockAdherenceStats = {
    adherenceRate: 85,
    taken: 17,
    missed: 2,
    late: 1,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (medicationScheduleApi.useGetSchedulesQuery as jest.Mock).mockReturnValue({
      data: mockSchedules,
      isLoading: false,
    });

    (medicationScheduleApi.useGetDoseLogsQuery as jest.Mock).mockReturnValue({
      data: mockDoseLogs,
      isLoading: false,
    });

    (medicationScheduleApi.useGetAdherenceStatsQuery as jest.Mock).mockReturnValue({
      data: mockAdherenceStats,
      isLoading: false,
    });
  });

  it('renders all major components and tabs', () => {
    renderWithProviders(<Dashboard />);
    
    // Check header
    expect(screen.getByText('Medication Dashboard')).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByRole('tab', { name: /schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /adherence/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /family/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
  });

  it('displays quick stats with correct data', () => {
    renderWithProviders(<Dashboard />);
    
    // Check active medications count
    expect(screen.getByText('1')).toBeInTheDocument(); // One active medication
    
    // Check adherence rate
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    renderWithProviders(<Dashboard />);
    
    // Start at Schedule tab
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    
    // Switch to Adherence tab
    const adherenceTab = screen.getByRole('tab', { name: /adherence/i });
    fireEvent.click(adherenceTab);
    await waitFor(() => {
      expect(screen.getByText('Medication Adherence')).toBeInTheDocument();
    });
    
    // Switch to Reports tab
    const reportsTab = screen.getByRole('tab', { name: /reports/i });
    fireEvent.click(reportsTab);
    await waitFor(() => {
      expect(screen.getByText('Adherence Trend')).toBeInTheDocument();
    });
  });

  it('opens medication form when add button is clicked', () => {
    renderWithProviders(<Dashboard />);
    
    const addButton = screen.getByRole('button', { name: /add medication/i });
    fireEvent.click(addButton);
    
    expect(screen.getByText('New Medication Schedule')).toBeInTheDocument();
  });

  it('displays loading state when data is being fetched', () => {
    // Mock loading state
    (medicationScheduleApi.useGetSchedulesQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderWithProviders(<Dashboard />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error states gracefully', () => {
    // Mock error state
    (medicationScheduleApi.useGetSchedulesQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    renderWithProviders(<Dashboard />);
    
    // Should still render the basic structure
    expect(screen.getByText('Medication Dashboard')).toBeInTheDocument();
  });

  it('updates view when time range is changed in reports', async () => {
    renderWithProviders(<Dashboard />);
    
    // Navigate to Reports tab
    const reportsTab = screen.getByRole('tab', { name: /reports/i });
    fireEvent.click(reportsTab);
    
    // Find and click the month toggle
    const monthButton = screen.getByRole('button', { name: /month/i });
    fireEvent.click(monthButton);
    
    // Verify the change
    expect(monthButton).toHaveAttribute('aria-pressed', 'true');
  });
});
