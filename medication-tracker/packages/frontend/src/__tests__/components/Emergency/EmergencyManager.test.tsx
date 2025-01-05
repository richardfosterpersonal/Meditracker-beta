import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyManager } from '../../../components/Emergency/EmergencyManager';
import { emergencyContactService } from '../../../services/EmergencyContactService';
import { medicalInfoService } from '../../../services/MedicalInfoService';
import { liabilityProtection } from '../../../utils/liabilityProtection';

// Mock the services
jest.mock('../../../services/EmergencyContactService');
jest.mock('../../../services/MedicalInfoService');
jest.mock('../../../utils/liabilityProtection');

describe('EmergencyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (emergencyContactService.getAllContacts as jest.Mock).mockResolvedValue([]);
    (medicalInfoService.getMedicalInfoSnapshot as jest.Mock).mockResolvedValue({
      medications: [],
      conditions: [],
      allergies: [],
      lastUpdated: new Date().toISOString(),
    });
    (medicalInfoService.validateMedicalInfo as jest.Mock).mockResolvedValue({
      valid: true,
      issues: [],
    });
  });

  describe('Initial Render', () => {
    it('should show disclaimer on first render', async () => {
      render(<EmergencyManager />);
      
      expect(screen.getByText(/Important Disclaimer/i)).toBeInTheDocument();
      expect(screen.getByText(/Accept & Continue/i)).toBeInTheDocument();
    });

    it('should show warning if no emergency contacts exist', async () => {
      render(<EmergencyManager />);
      
      await waitFor(() => {
        expect(screen.getByText(/Please add at least one emergency contact/i))
          .toBeInTheDocument();
      });
    });

    it('should show warning if medical info is incomplete', async () => {
      (medicalInfoService.validateMedicalInfo as jest.Mock).mockResolvedValue({
        valid: false,
        issues: ['Incomplete medication info'],
      });

      render(<EmergencyManager />);
      
      await waitFor(() => {
        expect(screen.getByText(/Some medical information needs to be completed/i))
          .toBeInTheDocument();
      });
    });
  });

  describe('Disclaimer Handling', () => {
    it('should enable features after accepting disclaimer', async () => {
      render(<EmergencyManager />);
      
      const acceptButton = screen.getByText(/Accept & Continue/i);
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.queryByText(/Important Disclaimer/i)).not.toBeInTheDocument();
      });

      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_DISCLAIMER_ACCEPTED',
        'current-user',
        expect.any(Object)
      );
    });
  });

  describe('Emergency Activation', () => {
    beforeEach(() => {
      // Mock a contact for notification
      (emergencyContactService.getAllContacts as jest.Mock).mockResolvedValue([
        {
          id: '1',
          name: 'Emergency Contact',
          priority: 1,
        },
      ]);

      // Mock successful notification
      (emergencyContactService.notifyContacts as jest.Mock).mockResolvedValue({
        notified: ['1'],
        failed: [],
        pending: [],
      });
    });

    it('should activate emergency mode and notify contacts', async () => {
      render(<EmergencyManager />);
      
      // Accept disclaimer first
      const acceptButton = screen.getByText(/Accept & Continue/i);
      fireEvent.click(acceptButton);

      // Find and click emergency button
      const emergencyButton = await screen.findByRole('button', {
        name: /emergency/i,
      });
      fireEvent.click(emergencyButton);

      await waitFor(() => {
        expect(screen.getByText(/Emergency mode is active/i)).toBeInTheDocument();
      });

      expect(emergencyContactService.notifyContacts).toHaveBeenCalled();
      expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
        'EMERGENCY_MODE_ACTIVATED',
        'current-user',
        expect.any(Object)
      );
    });

    it('should handle failed notifications gracefully', async () => {
      (emergencyContactService.notifyContacts as jest.Mock).mockResolvedValue({
        notified: [],
        failed: ['1'],
        pending: [],
      });

      render(<EmergencyManager />);
      
      // Accept disclaimer
      const acceptButton = screen.getByText(/Accept & Continue/i);
      fireEvent.click(acceptButton);

      // Activate emergency
      const emergencyButton = await screen.findByRole('button', {
        name: /emergency/i,
      });
      fireEvent.click(emergencyButton);

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      render(<EmergencyManager />);
      
      // Accept disclaimer first
      const acceptButton = screen.getByText(/Accept & Continue/i);
      fireEvent.click(acceptButton);

      // Navigate to Medical Information tab
      const medicalInfoTab = screen.getByRole('tab', {
        name: /medical information/i,
      });
      fireEvent.click(medicalInfoTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute(
          'aria-labelledby',
          'emergency-tab-1'
        );
      });

      // Navigate to Disclaimer & Settings tab
      const disclaimerTab = screen.getByRole('tab', {
        name: /disclaimer & settings/i,
      });
      fireEvent.click(disclaimerTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute(
          'aria-labelledby',
          'emergency-tab-2'
        );
      });
    });
  });
});
