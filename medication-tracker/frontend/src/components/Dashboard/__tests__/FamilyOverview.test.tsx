import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/testUtils';
import { FamilyOverview } from '../FamilyOverview';
import { familyMemberService } from '../../../services/familyMemberService';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Mock the services and hooks
jest.mock('../../../services/familyMemberService');
jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn()
}));
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
    loading: false,
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn()
  })
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockFamilyMembers = [
  {
    id: '1',
    name: 'John Doe',
    relationship: 'Father',
    avatar: 'path/to/avatar1.jpg',
  },
  {
    id: '2',
    name: 'Jane Doe',
    relationship: 'Mother',
    avatar: 'path/to/avatar2.jpg',
  },
];

const mockMedications: Record<string, Array<{ id: string; name: string; hasReminders: boolean; hasWarnings: boolean }>> = {
  '1': [
    { id: '1', name: 'Med1', hasReminders: true, hasWarnings: true },
    { id: '2', name: 'Med2', hasReminders: false, hasWarnings: false },
  ],
  '2': [
    { id: '3', name: 'Med3', hasReminders: false, hasWarnings: false },
  ],
};

describe('FamilyOverview', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Mock service methods
    (familyMemberService.getAllFamilyMembers as jest.Mock).mockResolvedValue(mockFamilyMembers);
    (familyMemberService.getFamilyMemberMedications as jest.Mock).mockImplementation(
      (id: string) => Promise.resolve(mockMedications[id])
    );

    // Mock hooks
    (useWebSocket as jest.Mock).mockReturnValue({ lastMessage: null });
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<FamilyOverview />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders family members after loading', async () => {
    render(<FamilyOverview />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Father')).toBeInTheDocument();
    expect(screen.getByText('Mother')).toBeInTheDocument();
  });

  it('displays correct medication counts and warnings', async () => {
    render(<FamilyOverview />);

    await waitFor(() => {
      expect(screen.getByText('2 meds')).toBeInTheDocument(); // John's medications
      expect(screen.getByText('1 meds')).toBeInTheDocument(); // Jane's medications
      expect(screen.getByText('1 reminders')).toBeInTheDocument(); // John's reminders
      expect(screen.getByText('Warnings')).toBeInTheDocument(); // John's warnings
    });
  });

  it('navigates to family member details when clicked', async () => {
    render(<FamilyOverview />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('John Doe'));
    expect(mockNavigate).toHaveBeenCalledWith('/family/1');
  });

  it('navigates to add family member page when add button clicked', async () => {
    render(<FamilyOverview />);

    const addButton = screen.getByRole('button', { name: /add family member/i });
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/family/add');
  });

  it('handles service errors gracefully', async () => {
    (familyMemberService.getAllFamilyMembers as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch')
    );

    render(<FamilyOverview />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load family overview')).toBeInTheDocument();
    });
  });

  it('updates when receiving WebSocket message', async () => {
    const { rerender } = render(<FamilyOverview />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Simulate WebSocket message
    (useWebSocket as jest.Mock).mockReturnValue({
      lastMessage: {
        data: JSON.stringify({
          type: 'FAMILY_UPDATE',
          payload: { memberId: '1' },
        }),
      },
    });

    rerender(<FamilyOverview />);

    await waitFor(() => {
      expect(familyMemberService.getAllFamilyMembers).toHaveBeenCalledTimes(2);
    });
  });
});
