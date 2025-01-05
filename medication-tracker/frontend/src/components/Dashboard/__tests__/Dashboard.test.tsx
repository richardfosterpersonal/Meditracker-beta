import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../../tests/testUtils';
import { Dashboard } from '../Dashboard';
import { api } from '../../../services/api';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useAuth } from '../../../hooks/useAuth';

// Mock the services and hooks
jest.mock('../../../services/api');
jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn()
}));
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

const mockStats = {
  totalMedications: 5,
  activeMedications: 3,
  complianceRate: 85,
  upcomingDoses: 2,
  missedDoses: 1,
  refillsNeeded: 1
};

const mockUser = {
  id: 'user123',
  name: 'Test User',
  email: 'test@example.com'
};

describe('Dashboard', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useWebSocket as jest.Mock).mockReturnValue({ lastMessage: null });
    (api.get as jest.Mock).mockResolvedValue({ data: mockStats });
  });

  it('renders loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fetches and displays dashboard statistics', async () => {
    render(<Dashboard />);

    // Wait for the stats to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify stats are displayed
    expect(screen.getByText(/5/)).toBeInTheDocument(); // Total medications
    expect(screen.getByText(/85%/)).toBeInTheDocument(); // Compliance rate
    expect(screen.getByText(/2/)).toBeInTheDocument(); // Upcoming doses
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (api.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard statistics/)).toBeInTheDocument();
    });
  });

  it('updates stats when receiving WebSocket message', async () => {
    const { rerender } = render(<Dashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Simulate WebSocket message
    (useWebSocket as jest.Mock).mockReturnValue({
      lastMessage: {
        type: 'STATS_UPDATE',
        data: {
          ...mockStats,
          upcomingDoses: 3 // Changed value
        }
      }
    });

    // Rerender with new WebSocket data
    rerender(<Dashboard />);

    // Verify updated stats
    await waitFor(() => {
      expect(screen.getByText(/3/)).toBeInTheDocument(); // Updated upcoming doses
    });
  });

  it('renders all dashboard sections', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify all major sections are present
    expect(screen.getByTestId('medication-overview')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('user-stats')).toBeInTheDocument();
    expect(screen.getByTestId('family-overview')).toBeInTheDocument();
  });

  it('handles user logout/session expiry', async () => {
    // Mock user being logged out
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    render(<Dashboard />);

    // Should show login required message
    expect(screen.getByText(/Please log in to view your dashboard/)).toBeInTheDocument();
    expect(screen.queryByTestId('medication-overview')).not.toBeInTheDocument();
  });
});
