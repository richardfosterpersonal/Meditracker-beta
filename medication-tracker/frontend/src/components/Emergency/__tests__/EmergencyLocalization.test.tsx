import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmergencyLocalization } from '../EmergencyLocalization';
import { liabilityProtection } from '../../../utils/liabilityProtection';
import { emergencyService } from '../../../services/EmergencyService';

// Mock the services
jest.mock('../../../utils/liabilityProtection');
jest.mock('../../../services/EmergencyService');

describe('EmergencyLocalization', () => {
  const mockLocation = {
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock geolocation API
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn((success) => success(mockLocation)),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    };
  });

  it('should initialize and display location status', async () => {
    render(<EmergencyLocalization />);
    
    expect(screen.getByText(/Location Status/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Location Available/i)).toBeInTheDocument();
    });
  });

  it('should handle location permission denial', async () => {
    const mockError = {
      code: 1, // Permission denied
      message: 'User denied geolocation',
    };

    global.navigator.geolocation.getCurrentPosition = jest.fn((success, error) =>
      error(mockError)
    );

    render(<EmergencyLocalization />);

    await waitFor(() => {
      expect(screen.getByText(/Location access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/This may impact emergency response time/i)).toBeInTheDocument();
    });

    expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
      'LOCATION_PERMISSION_DENIED',
      'system',
      expect.any(Object)
    );
  });

  it('should update location when refresh button is clicked', async () => {
    render(<EmergencyLocalization />);

    const refreshButton = screen.getByRole('button', { name: /refresh location/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'LOCATION_REFRESH_REQUESTED',
        'user',
        expect.any(Object)
      );
    });
  });

  it('should handle location errors gracefully', async () => {
    const mockError = {
      code: 2, // Position unavailable
      message: 'Position unavailable',
    };

    global.navigator.geolocation.getCurrentPosition = jest.fn((success, error) =>
      error(mockError)
    );

    render(<EmergencyLocalization />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to determine location/i)).toBeInTheDocument();
      expect(screen.getByText(/Please ensure location services are enabled/i)).toBeInTheDocument();
    });
  });

  it('should send location to emergency services when activated', async () => {
    (emergencyService.sendLocation as jest.Mock).mockResolvedValue({ success: true });

    render(<EmergencyLocalization emergencyActivated={true} />);

    await waitFor(() => {
      expect(emergencyService.sendLocation).toHaveBeenCalledWith({
        latitude: mockLocation.coords.latitude,
        longitude: mockLocation.coords.longitude,
        accuracy: mockLocation.coords.accuracy,
        timestamp: expect.any(String),
      });

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_LOCATION_SENT',
        'system',
        expect.any(Object)
      );
    });
  });

  it('should display accuracy indicator when location is available', async () => {
    render(<EmergencyLocalization />);

    await waitFor(() => {
      expect(screen.getByText(/Accuracy:/i)).toBeInTheDocument();
      expect(screen.getByText(/10m/i)).toBeInTheDocument();
    });
  });

  it('should handle watch position updates', async () => {
    const updatedLocation = {
      coords: {
        latitude: 37.7750,
        longitude: -122.4195,
        accuracy: 5,
      },
      timestamp: Date.now(),
    };

    global.navigator.geolocation.watchPosition = jest.fn((success) => {
      success(updatedLocation);
      return 123; // watch ID
    });

    render(<EmergencyLocalization />);

    await waitFor(() => {
      expect(screen.getByText(/5m/i)).toBeInTheDocument();
    });

    expect(navigator.geolocation.watchPosition).toHaveBeenCalled();
  });

  it('should cleanup watch position on unmount', () => {
    const { unmount } = render(<EmergencyLocalization />);
    unmount();
    expect(navigator.geolocation.clearWatch).toHaveBeenCalled();
  });
});
