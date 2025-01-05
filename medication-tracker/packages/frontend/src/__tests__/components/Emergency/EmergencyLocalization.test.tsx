import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyLocalization } from '../../../components/Emergency/EmergencyLocalization';
import { EmergencyLocalizationService } from '../../../services/EmergencyLocalizationService';

// Mock the service
jest.mock('../../../services/EmergencyLocalizationService');

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};
(global as any).navigator.geolocation = mockGeolocation;

describe('EmergencyLocalization', () => {
  const mockPosition = {
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  };

  const mockRegionInfo = {
    id: 'us-ca-sf',
    name: 'San Francisco, CA',
    countryCode: 'US',
    emergencyNumbers: {
      general: '911',
      police: '911',
      fire: '911',
      ambulance: '911',
    },
    services: [],
  };

  const mockNearbyServices = [
    {
      id: 'hospital-1',
      name: 'City Hospital',
      type: 'hospital',
      phoneNumbers: ['123-456-7890'],
      address: '123 Medical St',
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      operatingHours: '24/7',
      languages: ['English', 'Spanish'],
      specializations: ['Emergency Care', 'Trauma Center'],
    },
    {
      id: 'police-1',
      name: 'Central Police Station',
      type: 'police',
      phoneNumbers: ['123-456-7891'],
      address: '456 Police Ave',
      coordinates: {
        latitude: 37.7750,
        longitude: -122.4195,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGeolocation.getCurrentPosition.mockImplementation((success) =>
      success(mockPosition)
    );

    (EmergencyLocalizationService.getRegionInfo as jest.Mock).mockResolvedValue(
      mockRegionInfo
    );
    (EmergencyLocalizationService.getNearbyServices as jest.Mock).mockResolvedValue(
      mockNearbyServices
    );
  });

  describe('Initial Load', () => {
    it('should show loading state initially', () => {
      render(<EmergencyLocalization />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should load and display emergency numbers', async () => {
      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText(/911/)).toBeInTheDocument();
        expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
      });
    });

    it('should handle geolocation errors', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) =>
        error(new Error('Geolocation denied'))
      );

      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load emergency services information/))
          .toBeInTheDocument();
      });
    });
  });

  describe('Emergency Services Display', () => {
    it('should display nearby services with correct icons', async () => {
      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText('City Hospital')).toBeInTheDocument();
        expect(screen.getByText('Central Police Station')).toBeInTheDocument();
      });
    });

    it('should expand service details on click', async () => {
      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText('City Hospital')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('City Hospital'));

      expect(screen.getByText('123 Medical St')).toBeInTheDocument();
      expect(screen.getByText('24/7')).toBeInTheDocument();
    });

    it('should show languages and specializations for hospitals', async () => {
      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText('City Hospital')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('City Hospital'));

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('Emergency Care')).toBeInTheDocument();
      expect(screen.getByText('Trauma Center')).toBeInTheDocument();
    });
  });

  describe('Service Details Dialog', () => {
    it('should open service details dialog on view details click', async () => {
      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText('City Hospital')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('City Hospital'));
      fireEvent.click(screen.getByText('View Details'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    });

    it('should have working maps integration', async () => {
      const mockOpen = jest.fn();
      (global as any).window.open = mockOpen;

      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText('City Hospital')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('City Hospital'));
      fireEvent.click(screen.getByText('View Details'));
      fireEvent.click(screen.getByText('Open in Maps'));

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('google.com/maps'),
        '_blank'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service load errors', async () => {
      (EmergencyLocalizationService.getNearbyServices as jest.Mock).mockRejectedValue(
        new Error('Failed to load services')
      );

      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load emergency services information/))
          .toBeInTheDocument();
      });
    });

    it('should handle empty service list', async () => {
      (EmergencyLocalizationService.getNearbyServices as jest.Mock).mockResolvedValue([]);

      render(<EmergencyLocalization />);

      await waitFor(() => {
        expect(screen.getByText(/Nearby Emergency Services/)).toBeInTheDocument();
      });
    });
  });
});
