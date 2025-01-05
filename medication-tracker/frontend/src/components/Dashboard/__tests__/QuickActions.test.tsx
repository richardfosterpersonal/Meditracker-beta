import React from 'react';
import { render, screen, fireEvent } from '../../../tests/testUtils';
import { QuickActions } from '../QuickActions';
import { useNavigate } from 'react-router-dom';
import { useQuickActionBadges } from '../../../hooks/useQuickActionBadges';

// Mock the hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('../../../hooks/useQuickActionBadges', () => ({
  useQuickActionBadges: jest.fn(),
}));

describe('QuickActions', () => {
  const mockNavigate = jest.fn();
  const mockBadges = {
    reminders: 2,
    refills: 1,
    interactions: 3,
  };

  beforeEach(() => {
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useQuickActionBadges as jest.Mock).mockReturnValue(mockBadges);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all quick action buttons', () => {
    render(<QuickActions />);
    
    expect(screen.getByText('Add Medication')).toBeInTheDocument();
    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText('Refills')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
    expect(screen.getByText('Interactions')).toBeInTheDocument();
  });

  it('displays correct badge counts', () => {
    render(<QuickActions />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Reminders
    expect(screen.getByText('1')).toBeInTheDocument(); // Refills
    expect(screen.getByText('3')).toBeInTheDocument(); // Interactions
  });

  it('navigates to correct routes when clicked', () => {
    render(<QuickActions />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Add Medication' }));
    expect(mockNavigate).toHaveBeenCalledWith('/medications/add');

    fireEvent.click(screen.getByRole('button', { name: 'Reminders' }));
    expect(mockNavigate).toHaveBeenCalledWith('/reminders');

    fireEvent.click(screen.getByRole('button', { name: 'Family' }));
    expect(mockNavigate).toHaveBeenCalledWith('/family');
  });

  it('renders without badges when counts are zero', () => {
    (useQuickActionBadges as jest.Mock).mockReturnValue({
      reminders: 0,
      refills: 0,
      interactions: 0,
    });

    render(<QuickActions />);
    
    const badges = screen.queryAllByText(/[0-9]+/);
    expect(badges).toHaveLength(0);
  });
});
