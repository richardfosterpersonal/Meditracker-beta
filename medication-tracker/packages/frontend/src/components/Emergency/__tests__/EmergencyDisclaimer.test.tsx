import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmergencyDisclaimer } from '../EmergencyDisclaimer';

describe('EmergencyDisclaimer', () => {
  const mockProps = {
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    accepted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    expect(screen.getByText(/Emergency Service Disclaimer/i)).toBeInTheDocument();
  });

  it('displays important disclaimer information', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    expect(screen.getByText(/This is not a substitute for emergency services/i)).toBeInTheDocument();
    expect(screen.getByText(/Call emergency services directly/i)).toBeInTheDocument();
  });

  it('handles accept action', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(mockProps.onAccept).toHaveBeenCalled();
  });

  it('handles decline action', () => {
    render(<EmergencyDisclaimer {...mockProps} onDecline={mockProps.onDecline} />);
    fireEvent.click(screen.getByRole('button', { name: /Decline/i }));
    expect(mockProps.onDecline).toHaveBeenCalled();
  });

  it('shows accepted state', () => {
    render(<EmergencyDisclaimer {...mockProps} accepted={true} />);
    expect(screen.getByText(/You have accepted the disclaimer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeDisabled();
  });

  it('displays all required legal information', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    
    // Check for important legal disclaimers
    expect(screen.getByText(/Limitation of Liability/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Use/i)).toBeInTheDocument();
  });

  it('has accessible content', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    
    // Check for ARIA labels and roles
    expect(screen.getByRole('heading', { name: /Emergency Service Disclaimer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toHaveAttribute('aria-label', 'Accept emergency disclaimer');
  });

  it('shows warning about data sharing', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    expect(screen.getByText(/Your medical information may be shared/i)).toBeInTheDocument();
  });

  it('emphasizes emergency services contact information', () => {
    render(<EmergencyDisclaimer {...mockProps} />);
    const emergencyText = screen.getByText(/In case of emergency, dial emergency services/i);
    expect(emergencyText).toHaveStyle({ fontWeight: expect.stringContaining('bold') });
  });
});
