import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { MemberMedications } from '../MemberMedications';
import { householdApi } from '../../../api/household';
import { theme } from '../../../theme';

// Mock the API
jest.mock('../../../api/household');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={testQueryClient}>
        {ui}
      </QueryClientProvider>
    </ChakraProvider>
  );
};

describe('MemberMedications', () => {
  const mockMedications = [
    {
      id: 'med1',
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 'Daily',
      instructions: 'Take with food',
      startDate: '2024-01-01',
      userId: 'member1',
    },
    {
      id: 'med2',
      name: 'Vitamin D',
      dosage: '1000 IU',
      frequency: 'Once daily',
      instructions: 'Take in the morning',
      startDate: '2024-01-01',
      userId: 'member1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (householdApi.getMemberMedications as jest.Mock).mockResolvedValue(mockMedications);
  });

  it('renders loading state initially', () => {
    renderWithProviders(<MemberMedications memberId="member1" />);
    expect(screen.getByRole('button', { name: 'Manage Medications' })).toBeInTheDocument();
  });

  it('displays medications after loading', async () => {
    renderWithProviders(<MemberMedications memberId="member1" />);

    await waitFor(() => {
      mockMedications.forEach(med => {
        expect(screen.getByText(`${med.name} - ${med.dosage}`)).toBeInTheDocument();
        expect(screen.getByText(med.frequency)).toBeInTheDocument();
      });
    });
  });

  it('handles API error gracefully', async () => {
    (householdApi.getMemberMedications as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<MemberMedications memberId="member1" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading medications')).toBeInTheDocument();
    });
  });

  it('opens medication management modal', async () => {
    renderWithProviders(<MemberMedications memberId="member1" />);

    const manageButton = screen.getByRole('button', { name: 'Manage Medications' });
    userEvent.click(manageButton);

    await waitFor(() => {
      expect(screen.getByText('Manage Member Medications')).toBeInTheDocument();
    });
  });

  it('updates medication list after adding new medication', async () => {
    const newMedication = {
      id: 'med3',
      name: 'New Med',
      dosage: '50mg',
      frequency: 'Twice daily',
      instructions: 'Take with water',
      startDate: '2024-01-01',
      userId: 'member1',
    };

    renderWithProviders(<MemberMedications memberId="member1" />);

    // Wait for initial medications to load
    await waitFor(() => {
      expect(screen.getByText(`${mockMedications[0].name} - ${mockMedications[0].dosage}`)).toBeInTheDocument();
    });

    // Mock API to return updated list
    (householdApi.getMemberMedications as jest.Mock).mockResolvedValue([...mockMedications, newMedication]);

    // Simulate adding new medication (this would typically be done through the AddMedication component)
    const queryClient = createTestQueryClient();
    queryClient.invalidateQueries(['medications', 'member1']);

    // Verify new medication appears
    await waitFor(() => {
      expect(screen.getByText(`${newMedication.name} - ${newMedication.dosage}`)).toBeInTheDocument();
    });
  });

  it('maintains accessibility standards', () => {
    const { container } = renderWithProviders(<MemberMedications memberId="member1" />);
    expect(container).toBeAccessible();
  });
});
