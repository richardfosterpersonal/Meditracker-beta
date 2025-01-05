import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolution } from '../ConflictResolution';
import '@testing-library/jest-dom';

// Mock Chakra components
jest.mock('@chakra-ui/react', () => ({
  Modal: ({ children, isOpen }) => isOpen ? <div data-testid="modal">{children}</div> : null,
  ModalOverlay: () => <div data-testid="modal-overlay" />,
  ModalContent: ({ children }) => <div data-testid="modal-content">{children}</div>,
  ModalHeader: ({ children }) => <div data-testid="modal-header">{children}</div>,
  ModalBody: ({ children }) => <div data-testid="modal-body">{children}</div>,
  ModalFooter: ({ children }) => <div data-testid="modal-footer">{children}</div>,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Text: ({ children }) => <span>{children}</span>,
  Box: ({ children }) => <div>{children}</div>,
  VStack: ({ children }) => <div>{children}</div>,
  HStack: ({ children }) => <div>{children}</div>,
  useToast: () => jest.fn()
}));

const mockSuggestions = [
  {
    type: 'time_shift',
    description: 'Move medication A to 9:00 AM',
    reason: 'Creates better spacing between medications',
    original_time: new Date('2024-12-11T08:00:00'),
    suggested_time: new Date('2024-12-11T09:00:00')
  },
  {
    type: 'interval_adjustment',
    description: 'Adjust interval to 8 hours',
    reason: 'Maintains therapeutic levels while avoiding conflicts',
    original_interval: 6,
    suggested_interval: 8
  }
];

const mockConflicts = [
  {
    medication1: 'Medication A',
    medication2: 'Medication B',
    time: new Date('2024-12-11T08:00:00').toISOString(),
    type: 'time_proximity',
    suggestions: mockSuggestions,
    timezone1: 'America/New_York',
    timezone2: 'America/Los_Angeles'
  }
];

describe('ConflictResolution', () => {
  const mockOnClose = jest.fn();
  const mockOnResolve = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <div>
        <ConflictResolution
          isOpen={true}
          onClose={mockOnClose}
          conflicts={mockConflicts}
          onResolve={mockOnResolve}
          scheduleName="Test Schedule"
          userTimezone="America/New_York"
        />
      </div>
    );
  };

  it('renders conflict information correctly', () => {
    renderComponent();
    expect(screen.getByText('Schedule Conflicts Detected')).toBeInTheDocument();
    expect(screen.getByText(/Medication A/)).toBeInTheDocument();
    expect(screen.getByText(/Medication B/)).toBeInTheDocument();
  });

  it('displays all suggestions', () => {
    renderComponent();
    expect(screen.getByText(/Move medication A to 9:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/Adjust interval to 8 hours/)).toBeInTheDocument();
  });

  it('handles suggestion selection', () => {
    renderComponent();
    const suggestion = screen.getByText(/Move medication A to 9:00 AM/);
    fireEvent.click(suggestion);
    const adjustButton = screen.getByText('Adjust Schedule');
    fireEvent.click(adjustButton);
    expect(mockOnResolve).toHaveBeenCalledWith('adjust', mockSuggestions[0]);
  });

  it('prevents adjustment without selection', () => {
    renderComponent();
    const adjustButton = screen.getByText('Adjust Schedule');
    expect(adjustButton).toBeDisabled();
  });

  it('shows warning when override is clicked', async () => {
    renderComponent();
    const overrideButton = screen.getByText('Override');
    fireEvent.click(overrideButton);
    expect(screen.getByText(/Please consult with your healthcare provider/)).toBeInTheDocument();
  });

  it('handles cancellation', () => {
    renderComponent();
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnResolve).toHaveBeenCalledWith('cancel', undefined);
  });

  it('displays correct badge for suggestion types', () => {
    renderComponent();
    expect(screen.getByText('Time Shift')).toBeInTheDocument();
    expect(screen.getByText('Interval')).toBeInTheDocument();
  });

  it('updates selection state correctly', () => {
    renderComponent();
    const suggestions = screen.getAllByText(/Move medication|Adjust interval/);
    fireEvent.click(suggestions[0]);
    const adjustButton = screen.getByText('Adjust Schedule');
    expect(adjustButton).not.toBeDisabled();
  });
});
