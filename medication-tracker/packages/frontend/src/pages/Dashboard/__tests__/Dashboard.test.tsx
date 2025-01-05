import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../index';
import { familyApi } from '../../../store/services/familyApi';
import { medicationApi } from '../../../store/services/medicationApi';

const theme = createTheme();

// Create a mock store
const store = configureStore({
  reducer: {
    [familyApi.reducerPath]: familyApi.reducer,
    [medicationApi.reducerPath]: medicationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(familyApi.middleware, medicationApi.middleware),
});

// Mock the API hooks
jest.mock('../../../store/services/familyApi', () => ({
  ...jest.requireActual('../../../store/services/familyApi'),
  useGetFamilyMembersQuery: () => ({
    data: [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        relationship: 'Father',
      },
    ],
    isLoading: false,
  }),
}));

jest.mock('../../../store/services/medicationApi', () => ({
  ...jest.requireActual('../../../store/services/medicationApi'),
  useGetMedicationsQuery: () => ({
    data: [
      {
        id: '1',
        name: 'Test Medication',
        dosage: '10mg',
        status: 'active',
        nextDose: new Date().toISOString(),
      },
    ],
    isLoading: false,
  }),
}));

describe('Dashboard', () => {
  const renderDashboard = () => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <Dashboard />
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders dashboard title', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders all dashboard sections', () => {
    renderDashboard();
    
    // Check for section titles
    expect(screen.getByText('Medication Statistics')).toBeInTheDocument();
    expect(screen.getByText('Family Members')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Medications')).toBeInTheDocument();
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
  });

  it('displays family member information', () => {
    renderDashboard();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
  });

  it('displays medication information', () => {
    renderDashboard();
    expect(screen.getByText('Test Medication')).toBeInTheDocument();
    expect(screen.getByText('10mg')).toBeInTheDocument();
  });

  // Add more test cases as needed
});
