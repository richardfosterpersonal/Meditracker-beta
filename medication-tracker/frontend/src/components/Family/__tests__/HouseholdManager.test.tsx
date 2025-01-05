import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import HouseholdManager from '../HouseholdManager';
import { householdApi } from '../../../api/household';
import { theme } from '../../../theme';

// Mock the API
jest.mock('../../../api/household');

// Create a new QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

// Test wrapper with providers
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

describe('HouseholdManager', () => {
  const mockHousehold = {
    id: '123',
    managerId: 'user123',
    members: [
      {
        id: 'member1',
        name: 'John Doe',
        relationship: 'Son',
        medications: ['med1', 'med2'],
      },
      {
        id: 'member2',
        name: 'Jane Doe',
        relationship: 'Daughter',
        medications: ['med3'],
      },
    ],
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup default API responses
    (householdApi.getHousehold as jest.Mock).mockResolvedValue(mockHousehold);
  });

  it('renders loading state initially', () => {
    renderWithProviders(<HouseholdManager />);
    expect(screen.getByText('Loading household data...')).toBeInTheDocument();
  });

  it('renders household data after loading', async () => {
    renderWithProviders(<HouseholdManager />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Members: 2')).toBeInTheDocument();
    expect(screen.getByText('Active Medications: 3')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const errorMessage = 'Failed to fetch household data';
    (householdApi.getHousehold as jest.Mock).mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<HouseholdManager />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading household data/)).toBeInTheDocument();
    });
  });

  it('adds a new family member successfully', async () => {
    const newMember = {
      name: 'New Member',
      relationship: 'Sister',
    };

    (householdApi.addFamilyMember as jest.Mock).mockResolvedValue({
      ...newMember,
      id: 'member3',
      medications: [],
    });

    renderWithProviders(<HouseholdManager />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Add new member
    const addButton = screen.getByText('Add Family Member');
    userEvent.click(addButton);

    // Fill form (assuming AddFamilyMember component exists)
    const nameInput = screen.getByLabelText('Name');
    const relationshipInput = screen.getByLabelText('Relationship');
    
    await userEvent.type(nameInput, newMember.name);
    await userEvent.type(relationshipInput, newMember.relationship);
    
    const submitButton = screen.getByText('Submit');
    userEvent.click(submitButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('Family member added')).toBeInTheDocument();
    });
  });

  it('displays member medications correctly', async () => {
    renderWithProviders(<HouseholdManager />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const manageMedicationsButtons = screen.getAllByText('Manage Medications');
    expect(manageMedicationsButtons).toHaveLength(2);

    // Click first member's manage medications button
    userEvent.click(manageMedicationsButtons[0]);

    // Verify medication management modal opens
    await waitFor(() => {
      expect(screen.getByText('Manage Member Medications')).toBeInTheDocument();
    });
  });

  // Test performance tracking
  it('tracks component performance', async () => {
    const mockPerformance = jest.spyOn(performance, 'now');
    renderWithProviders(<HouseholdManager />);

    await waitFor(() => {
      expect(mockPerformance).toHaveBeenCalled();
    });
  });
});
