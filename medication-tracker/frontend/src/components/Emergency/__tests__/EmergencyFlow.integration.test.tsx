import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyButton } from '../EmergencyButton';
import { EmergencyLocalization } from '../EmergencyLocalization';
import { MedicalInfoManager } from '../MedicalInfoManager';
import { EmergencyContactList } from '../EmergencyContactList';
import { medicalInfoService } from '../../../services/MedicalInfoService';
import { emergencyService } from '../../../services/EmergencyService';
import { liabilityProtection } from '../../../utils/liabilityProtection';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { MemoryRouter } from 'react-router-dom';
import { EmergencyProvider, useEmergency } from '../../../contexts/EmergencyContext';

// Mock all required services
jest.mock('../../../services/MedicalInfoService');
jest.mock('../../../services/EmergencyService');
jest.mock('../../../utils/liabilityProtection');
jest.mock('../../../contexts/EmergencyContext', () => ({
  ...jest.requireActual('../../../contexts/EmergencyContext'),
  useEmergency: jest.fn(),
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

global.navigator.geolocation = mockGeolocation;

const mockLocation = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  },
  timestamp: Date.now(),
};

describe('Emergency Flow Integration', () => {
  const mockEmergencyContext = {
    isEmergencyActive: false,
    activateEmergency: jest.fn(),
    deactivateEmergency: jest.fn(),
    emergencyStatus: null,
    emergencyInfo: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEmergency as jest.Mock).mockReturnValue(mockEmergencyContext);
    mockGeolocation.getCurrentPosition.mockImplementation((success) =>
      success(mockLocation)
    );
  });

  const renderEmergencyFlow = () => {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <EmergencyProvider>
            <div>
              <EmergencyButton />
              <EmergencyLocalization />
              <MedicalInfoManager />
              <EmergencyContactList />
            </div>
          </EmergencyProvider>
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  describe('Emergency Activation Flow', () => {
    it('should handle the complete emergency activation process', async () => {
      // Mock medical info
      const mockMedicalInfo = {
        medications: [
          {
            id: '1',
            name: 'Test Medication',
            dosage: '10mg',
            frequency: 'daily',
          },
        ],
        conditions: [],
        allergies: [],
      };

      (medicalInfoService.getMedicalInfoSnapshot as jest.Mock).mockResolvedValue(
        mockMedicalInfo
      );

      // Mock emergency contact
      const mockEmergencyContacts = [
        {
          id: '1',
          name: 'Emergency Contact',
          phone: '123-456-7890',
          relationship: 'Family',
          notificationPreference: 'sms',
        },
      ];

      (emergencyService.getEmergencyContacts as jest.Mock).mockResolvedValue(
        mockEmergencyContacts
      );

      renderEmergencyFlow();

      // 1. Verify initial state
      expect(screen.getByText(/activate emergency/i)).toBeInTheDocument();
      
      // 2. Activate emergency
      const emergencyButton = screen.getByRole('button', {
        name: /activate emergency/i,
      });
      await userEvent.click(emergencyButton);

      // 3. Verify confirmation dialog
      expect(
        screen.getByText(/are you sure you want to activate emergency mode/i)
      ).toBeInTheDocument();

      // 4. Confirm activation
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      // 5. Verify emergency services are called
      await waitFor(() => {
        expect(emergencyService.activateEmergency).toHaveBeenCalled();
        expect(emergencyService.sendLocation).toHaveBeenCalledWith({
          latitude: mockLocation.coords.latitude,
          longitude: mockLocation.coords.longitude,
          accuracy: mockLocation.coords.accuracy,
          timestamp: expect.any(String),
        });
      });

      // 6. Verify medical info is shared
      expect(medicalInfoService.shareMedicalInfo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          medications: true,
          conditions: true,
          allergies: true,
          fullAccess: true,
        })
      );

      // 7. Verify emergency contacts are notified
      expect(emergencyService.notifyEmergencyContacts).toHaveBeenCalled();

      // 8. Verify liability logging
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_ACTIVATED',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle location permission denial during emergency', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) =>
        error({ code: 1, message: 'User denied geolocation' })
      );

      renderEmergencyFlow();

      // Activate emergency
      const emergencyButton = screen.getByRole('button', {
        name: /activate emergency/i,
      });
      await userEvent.click(emergencyButton);
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      // Verify warning is shown
      await waitFor(() => {
        expect(screen.getByText(/location access denied/i)).toBeInTheDocument();
        expect(
          screen.getByText(/this may impact emergency response time/i)
        ).toBeInTheDocument();
      });

      // Verify emergency still activates without location
      expect(emergencyService.activateEmergency).toHaveBeenCalled();
    });

    it('should handle medical info sharing failure', async () => {
      (medicalInfoService.shareMedicalInfo as jest.Mock).mockRejectedValue(
        new Error('Failed to share medical info')
      );

      renderEmergencyFlow();

      // Activate emergency
      const emergencyButton = screen.getByRole('button', {
        name: /activate emergency/i,
      });
      await userEvent.click(emergencyButton);
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      // Verify error handling
      await waitFor(() => {
        expect(
          screen.getByText(/unable to share medical information/i)
        ).toBeInTheDocument();
      });

      // Verify error is logged
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'MEDICAL_INFO_SHARE_ERROR',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Emergency Contact Notification Flow', () => {
    it('should handle emergency contact notification failure gracefully', async () => {
      (emergencyService.notifyEmergencyContacts as jest.Mock).mockRejectedValue(
        new Error('Failed to notify contacts')
      );

      renderEmergencyFlow();

      // Activate emergency
      const emergencyButton = screen.getByRole('button', {
        name: /activate emergency/i,
      });
      await userEvent.click(emergencyButton);
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      // Verify error handling
      await waitFor(() => {
        expect(
          screen.getByText(/unable to notify all emergency contacts/i)
        ).toBeInTheDocument();
      });

      // Verify error is logged
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_CONTACT_NOTIFICATION_ERROR',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Emergency Deactivation Flow', () => {
    beforeEach(() => {
      (useEmergency as jest.Mock).mockReturnValue({
        ...mockEmergencyContext,
        isEmergencyActive: true,
      });
    });

    it('should handle emergency deactivation process', async () => {
      renderEmergencyFlow();

      // Find and click deactivate button
      const deactivateButton = screen.getByRole('button', {
        name: /deactivate emergency/i,
      });
      await userEvent.click(deactivateButton);

      // Verify confirmation dialog
      expect(
        screen.getByText(/are you sure you want to deactivate emergency mode/i)
      ).toBeInTheDocument();

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      // Verify emergency service is called
      await waitFor(() => {
        expect(emergencyService.deactivateEmergency).toHaveBeenCalled();
      });

      // Verify liability logging
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_DEACTIVATED',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Real-time Updates Flow', () => {
    it('should handle real-time location updates during emergency', async () => {
      const updatedLocation = {
        coords: {
          latitude: 37.7750,
          longitude: -122.4195,
          accuracy: 5,
        },
        timestamp: Date.now(),
      };

      renderEmergencyFlow();

      // Activate emergency
      const emergencyButton = screen.getByRole('button', {
        name: /activate emergency/i,
      });
      await userEvent.click(emergencyButton);
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      // Simulate location update
      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(updatedLocation);
        return 123; // watch ID
      });

      // Verify location update is sent
      await waitFor(() => {
        expect(emergencyService.sendLocation).toHaveBeenCalledWith({
          latitude: updatedLocation.coords.latitude,
          longitude: updatedLocation.coords.longitude,
          accuracy: updatedLocation.coords.accuracy,
          timestamp: expect.any(String),
        });
      });
    });
  });
});
