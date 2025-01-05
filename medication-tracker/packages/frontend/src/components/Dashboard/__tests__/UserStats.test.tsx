import React from 'react';
import { render, screen, waitFor } from '../../../tests/testUtils';
import { UserStats } from '../UserStats';
import { api } from '../../../services/api';

jest.mock('../../../services/api');

const mockStatsData = {
  adherenceRate: 85,
  missedDoses: 3,
  totalDoses: 45,
  streakDays: 7,
  upcomingRefills: 2,
  medicationsByTime: {
    morning: 3,
    afternoon: 2,
    evening: 2,
    night: 1
  },
  weeklyTrend: [
    { date: '2024-12-13', adherence: 100 },
    { date: '2024-12-14', adherence: 75 },
    { date: '2024-12-15', adherence: 100 },
    { date: '2024-12-16', adherence: 100 },
    { date: '2024-12-17', adherence: 50 },
    { date: '2024-12-18', adherence: 100 },
    { date: '2024-12-19', adherence: 100 }
  ]
};

describe('UserStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: mockStatsData });
  });

  it('renders loading state initially', () => {
    render(<UserStats userId="user123" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays adherence rate correctly', async () => {
    render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText(/Adherence Rate/)).toBeInTheDocument();
    });
  });

  it('shows streak information', async () => {
    render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText(/Day Streak/)).toBeInTheDocument();
    });
  });

  it('displays medication distribution by time', async () => {
    render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Morning: 3')).toBeInTheDocument();
      expect(screen.getByText('Evening: 2')).toBeInTheDocument();
    });
  });

  it('renders weekly trend chart', async () => {
    render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByTestId('weekly-trend-chart')).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch stats'));

    render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading statistics/)).toBeInTheDocument();
    });
  });

  it('updates when userId prop changes', async () => {
    const { rerender } = render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    // Mock different data for new user
    const newUserData = { ...mockStatsData, adherenceRate: 90 };
    (api.get as jest.Mock).mockResolvedValue({ data: newUserData });

    // Rerender with new userId
    rerender(<UserStats userId="user456" />);

    await waitFor(() => {
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  it('formats dates correctly in trend chart', async () => {
    render(<UserStats userId="user123" />);

    await waitFor(() => {
      // Check if dates are formatted properly in the chart
      const chart = screen.getByTestId('weekly-trend-chart');
      expect(chart).toHaveAttribute('data-dates', expect.stringContaining('Dec 13'));
    });
  });

  it('shows correct total doses information', async () => {
    render(<UserStats userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText(/Total Doses/)).toBeInTheDocument();
    });
  });
});
