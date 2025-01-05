import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyManager } from '../EmergencyManager';
import { emergencyContactService } from '../../../services/EmergencyContactService';
import { medicalInfoService } from '../../../services/MedicalInfoService';
import { liabilityProtection } from '../../../utils/liabilityProtection';

// Mock the services
jest.mock('../../../services/EmergencyContactService');
jest.mock('../../../services/MedicalInfoService');
jest.mock('../../../utils/liabilityProtection');

describe('EmergencyManager', () => {
  const mockContacts = [
    {
      id: '1',
      name: 'John Doe',
      relationship: 'Family',
      priority: 1,
      notificationMethods: {
        email: { address: 'john@example.com', verified: true },
      },
      availability: { timezone: 'UTC' },
      accessLevel: {
        canViewMedicalHistory: true,
        canViewCurrentLocation: true,
        canViewMedications: true,
        canUpdateEmergencyStatus: false,
      },
    },
  ];

  const mockMedicalInfo = {
    conditions: ['Asthma'],
    medications: ['Inhaler'],
    allergies: ['Peanuts'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    (emergencyContactService.getAllContacts as jest.Mock).mockResolvedValue(mockContacts);
    (medicalInfoService.getMedicalInfoSnapshot as jest.Mock).mockResolvedValue(mockMedicalInfo);
    (medicalInfoService.validateMedicalInfo as jest.Mock).mockResolvedValue({ issues: [] });
    (emergencyContactService.notifyContacts as jest.Mock).mockResolvedValue({
      notified: ['1'],
      failed: [],
      pending: [],
    });
  });

  it('renders without crashing', () => {
    render(<EmergencyManager />);
    expect(screen.getByText('Emergency Management')).toBeInTheDocument();
  });

  it('shows disclaimer warning when not accepted', () => {
    render(<EmergencyManager />);
    expect(screen.getByText(/Please review and accept the emergency disclaimer/)).toBeInTheDocument();
  });

  it('disables emergency button when disclaimer not accepted', () => {
    render(<EmergencyManager />);
    const button = screen.getByRole('button', { name: /Get Help/i });
    expect(button).toBeDisabled();
  });

  it('enables features after accepting disclaimer', async () => {
    render(<EmergencyManager />);
    
    // Accept the disclaimer
    const acceptButton = screen.getByRole('button', { name: /Accept & Continue/i });
    fireEvent.click(acceptButton);

    // Emergency button should be enabled
    const emergencyButton = screen.getByRole('button', { name: /Get Help/i });
    expect(emergencyButton).toBeEnabled();

    // Warning should be gone
    expect(screen.queryByText(/Please review and accept the emergency disclaimer/)).not.toBeInTheDocument();

    // Verify liability logging
    expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
      'EMERGENCY_DISCLAIMER_ACCEPTED',
      'current-user',
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });

  it('activates emergency mode and notifies contacts', async () => {
    render(<EmergencyManager />);
    
    // Accept disclaimer first
    fireEvent.click(screen.getByRole('button', { name: /Accept & Continue/i }));
    
    // Activate emergency mode
    const emergencyButton = screen.getByRole('button', { name: /Get Help/i });
    fireEvent.click(emergencyButton);

    // Wait for notifications to be sent
    await waitFor(() => {
      expect(screen.getByText(/Emergency contacts notified/)).toBeInTheDocument();
    });

    // Verify services were called
    expect(medicalInfoService.getMedicalInfoSnapshot).toHaveBeenCalled();
    expect(emergencyContactService.notifyContacts).toHaveBeenCalledWith({
      severity: 'HIGH',
      medicalInfo: mockMedicalInfo,
      message: 'Emergency assistance requested',
    });

    // Verify liability logging
    expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
      'EMERGENCY_MODE_ACTIVATED',
      'current-user',
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });

  it('handles tab navigation correctly', () => {
    render(<EmergencyManager />);
    
    // Check initial tab
    expect(screen.getByRole('tab', { name: /Emergency Contacts/i })).toHaveAttribute('aria-selected', 'true');
    
    // Switch to Medical Information tab
    fireEvent.click(screen.getByRole('tab', { name: /Medical Information/i }));
    expect(screen.getByRole('tab', { name: /Medical Information/i })).toHaveAttribute('aria-selected', 'true');
    
    // Switch to Disclaimer tab
    fireEvent.click(screen.getByRole('tab', { name: /Disclaimer & Settings/i }));
    expect(screen.getByRole('tab', { name: /Disclaimer & Settings/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows warning when no emergency contacts exist', async () => {
    (emergencyContactService.getAllContacts as jest.Mock).mockResolvedValue([]);
    
    render(<EmergencyManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Please add at least one emergency contact')).toBeInTheDocument();
    });
  });

  it('shows warning when medical info is incomplete', async () => {
    (medicalInfoService.validateMedicalInfo as jest.Mock).mockResolvedValue({
      issues: ['Missing allergies information'],
    });
    
    render(<EmergencyManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Some medical information needs to be completed')).toBeInTheDocument();
    });
  });
});
