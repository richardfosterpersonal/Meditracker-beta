import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmergencyButton from '../EmergencyButton';
import { liabilityProtection } from '../../../utils/liabilityProtection';
import { emergencyLocalizationService } from '../../../services/EmergencyLocalizationService';

// Mock the services
jest.mock('../../../utils/liabilityProtection');
jest.mock('../../../services/EmergencyLocalizationService');

describe('EmergencyButton', () => {
  const mockEmergencyNumbers = [
    {
      name: 'Emergency Medical Services',
      number: '911',
      type: 'AMBULANCE',
    },
    {
      name: 'Police',
      number: '911',
      type: 'POLICE',
    },
  ];

  const mockProps = {
    onEmergencyActivated: jest.fn(),
    disabled: false,
    active: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (emergencyLocalizationService.getEmergencyNumbers as jest.Mock).mockResolvedValue(mockEmergencyNumbers);
    localStorage.clear();
  });

  it('renders without crashing', () => {
    render(<EmergencyButton {...mockProps} />);
    expect(screen.getByRole('button', { name: /Get Help/i })).toBeInTheDocument();
  });

  it('shows disclaimer when clicked for the first time', () => {
    render(<EmergencyButton {...mockProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    expect(screen.getByText(/Emergency Support/)).toBeInTheDocument();
    expect(screen.getByText(/This is NOT an emergency service/)).toBeInTheDocument();
  });

  it('logs button press in liability protection', () => {
    render(<EmergencyButton {...mockProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
      'EMERGENCY_BUTTON_PRESSED',
      'current-user',
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });

  it('shows emergency numbers when activated', async () => {
    render(<EmergencyButton {...mockProps} />);
    
    // Click the emergency button
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    
    // Accept the disclaimer
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    
    // Wait for emergency numbers to load
    await waitFor(() => {
      expect(screen.getByText('Emergency Medical Services')).toBeInTheDocument();
      expect(screen.getByText('Police')).toBeInTheDocument();
    });
  });

  it('handles activation error gracefully', async () => {
    const mockError = new Error('Failed to activate emergency');
    mockProps.onEmergencyActivated.mockRejectedValue(mockError);
    
    render(<EmergencyButton {...mockProps} />);
    
    // Click the emergency button
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    
    // Accept the disclaimer
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    
    // Activate emergency
    fireEvent.click(screen.getByRole('button', { name: /Activate Emergency/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to notify emergency contacts/)).toBeInTheDocument();
    });
  });

  it('is disabled when prop is set', () => {
    render(<EmergencyButton {...mockProps} disabled={true} />);
    expect(screen.getByRole('button', { name: /Get Help/i })).toBeDisabled();
  });

  it('shows active state when emergency is activated', () => {
    render(<EmergencyButton {...mockProps} active={true} />);
    expect(screen.getByRole('button', { name: /Get Help/i })).toHaveClass('Mui-active');
  });

  it('logs emergency number views', async () => {
    render(<EmergencyButton {...mockProps} />);
    
    // Click the emergency button
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    
    // Accept the disclaimer
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    
    // Wait for emergency numbers to load
    await waitFor(() => {
      const showNumberButtons = screen.getAllByRole('button', { name: /Show Number/i });
      fireEvent.click(showNumberButtons[0]);
    });

    expect(liabilityProtection.logCriticalAction).toHaveBeenCalledWith(
      'EMERGENCY_NUMBER_VIEWED',
      'current-user',
      expect.objectContaining({
        service: mockEmergencyNumbers[0].name,
        number: mockEmergencyNumbers[0].number,
        timestamp: expect.any(String),
      })
    );
  });

  it('remembers disclaimer acceptance', () => {
    // First render - should show disclaimer
    const { unmount } = render(<EmergencyButton {...mockProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    unmount();

    // Second render - should not show disclaimer
    render(<EmergencyButton {...mockProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Get Help/i }));
    expect(screen.queryByText(/Emergency Support Disclaimer/)).not.toBeInTheDocument();
  });
});
