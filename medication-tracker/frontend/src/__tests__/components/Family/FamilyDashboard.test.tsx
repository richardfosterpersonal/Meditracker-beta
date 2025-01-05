import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FamilyDashboard from '../../../components/Family/FamilyDashboard';
import familyReducer from '../../../store/slices/familySlice';
import { mockFamilyMembers } from '../../__mocks__/familyData';
import { ThemeProvider } from '@mui/material';
import theme from '../../../theme';

// Mock hooks
jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: {
      tier: 'FAMILY',
      maxFamilyMembers: 4,
    },
    loading: false,
  }),
}));

jest.mock('../../../hooks/useFamilyMembers', () => ({
  useFamilyMembers: () => ({
    members: mockFamilyMembers,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('FamilyDashboard', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        family: familyReducer,
      },
      preloadedState: {
        family: {
          members: mockFamilyMembers,
          loading: false,
          error: null,
        },
      },
    });
  });

  const renderDashboard = () => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <FamilyDashboard />
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders dashboard with family members', () => {
    renderDashboard();
    
    // Check title
    expect(screen.getByText('Family Management')).toBeInTheDocument();
    
    // Check if members are displayed
    mockFamilyMembers.forEach(member => {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    });
  });

  it('shows add member button when under member limit', () => {
    renderDashboard();
    
    const addButton = screen.getByText('Add Family Member');
    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeEnabled();
  });

  it('opens invite dialog when add button is clicked', () => {
    renderDashboard();
    
    fireEvent.click(screen.getByText('Add Family Member'));
    
    expect(screen.getByText('Invite Family Member')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('shows member actions menu when clicking more options', async () => {
    renderDashboard();
    
    // Click the more options button for the first member
    const moreButtons = screen.getAllByRole('button', { name: /more/i });
    fireEvent.click(moreButtons[0]);
    
    // Check if menu items are shown
    await waitFor(() => {
      expect(screen.getByText('Edit Permissions')).toBeInTheDocument();
      expect(screen.getByText('Remove Access')).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog when removing member', async () => {
    renderDashboard();
    
    // Open more menu and click remove
    const moreButtons = screen.getAllByRole('button', { name: /more/i });
    fireEvent.click(moreButtons[0]);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Remove Access'));
    });
    
    // Check if confirmation dialog is shown
    expect(screen.getByText('Remove Family Member?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Remove Access')).toBeInTheDocument();
  });

  it('shows upgrade prompt for free tier users', () => {
    // Mock free tier subscription
    jest.spyOn(require('../../../hooks/useSubscription'), 'useSubscription')
      .mockImplementation(() => ({
        subscription: {
          tier: 'FREE',
          maxFamilyMembers: 0,
        },
        loading: false,
      }));

    renderDashboard();
    
    expect(screen.getByText(/upgrade to add family members/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching members', () => {
    // Mock loading state
    jest.spyOn(require('../../../hooks/useFamilyMembers'), 'useFamilyMembers')
      .mockImplementation(() => ({
        members: [],
        loading: true,
        error: null,
        refetch: jest.fn(),
      }));

    renderDashboard();
    
    // Check for loading skeletons
    const skeletons = screen.getAllByRole('progressbar');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when fetching fails', () => {
    // Mock error state
    jest.spyOn(require('../../../hooks/useFamilyMembers'), 'useFamilyMembers')
      .mockImplementation(() => ({
        members: [],
        loading: false,
        error: 'Failed to fetch family members',
        refetch: jest.fn(),
      }));

    renderDashboard();
    
    expect(screen.getByText(/failed to fetch family members/i)).toBeInTheDocument();
  });
});
