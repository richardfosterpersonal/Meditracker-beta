import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { api } from '../../../services/api';

// Mock dependencies
jest.mock('../../../hooks/useAnalytics');
jest.mock('../../../services/api');
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockAnalyticsData = {
  adherenceData: [
    {
      date: '2024-01-01',
      adherenceRate: 95,
      missedDoses: 1,
      totalDoses: 20,
    },
  ],
  familyActivity: [
    {
      userId: '1',
      userName: 'John Doe',
      activityCount: 50,
      adherenceRate: 90,
      lastActive: '2024-01-01T12:00:00Z',
    },
  ],
  systemHealth: {
    metrics: [
      {
        name: 'API Response Time',
        value: 200,
        threshold: 1000,
        unit: 'ms',
      },
    ],
    lastUpdated: '2024-01-01T12:00:00Z',
  },
  complianceByMedication: [
    {
      medicationName: 'Med A',
      compliance: 95,
      totalDoses: 20,
      missedDoses: 1,
    },
  ],
  timeOfDayDistribution: [
    {
      timeSlot: '08:00',
      count: 10,
      compliance: 90,
    },
  ],
};

describe('AnalyticsDashboard', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    (useAnalytics as jest.Mock).mockReturnValue({ trackEvent: mockTrackEvent });
    (api.get as jest.Mock).mockResolvedValue({ data: mockAnalyticsData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('tracks dashboard view on mount', async () => {
    render(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('analytics_dashboard_viewed', { timeRange: '7d' });
    });
  });

  it('loads and displays analytics data', async () => {
    render(<AnalyticsDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Check if main components are rendered
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Family Activity')).toBeInTheDocument();
    expect(screen.getByText('Detailed Analysis')).toBeInTheDocument();
  });

  it('handles time range changes', async () => {
    render(<AnalyticsDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Change time range
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '30d' } });

    // Verify API call with new time range
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/analytics/dashboard', {
        params: { timeRange: '30d' }
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to load analytics data';
    (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('tracks tab changes', async () => {
    render(<AnalyticsDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Click on Family Activity tab
    fireEvent.click(screen.getByText('Family Activity'));

    expect(mockTrackEvent).toHaveBeenCalledWith('analytics_tab_changed', { tabIndex: 1 });
  });

  it('displays adherence chart in overview tab', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Medication Adherence')).toBeInTheDocument();
  });

  it('displays family activity in family tab', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Switch to Family Activity tab
    fireEvent.click(screen.getByText('Family Activity'));

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });
});
