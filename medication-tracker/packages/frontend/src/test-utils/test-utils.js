import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import { theme } from '../theme';
import { medicationScheduleApi } from '../store/services/medicationScheduleApi';

export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        [medicationScheduleApi.reducerPath]: medicationScheduleApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(medicationScheduleApi.middleware),
      preloadedState,
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export const mockDoseLogs = [
  {
    id: '1',
    scheduleId: '1',
    status: 'taken',
    scheduledTime: '2024-12-08T08:00:00.000Z',
    takenTime: '2024-12-08T08:05:00.000Z',
  },
  {
    id: '2',
    scheduleId: '1',
    status: 'missed',
    scheduledTime: '2024-12-08T20:00:00.000Z',
  },
  {
    id: '3',
    scheduleId: '2',
    status: 'late',
    scheduledTime: '2024-12-07T14:00:00.000Z',
    takenTime: '2024-12-07T16:00:00.000Z',
  },
];

export const mockSchedules = [
  {
    id: '1',
    medicationName: 'Medication A',
    dosage: '10mg',
    frequency: {
      type: 'daily',
      times: ['08:00', '20:00'],
    },
    status: 'active',
  },
  {
    id: '2',
    medicationName: 'Medication B',
    dosage: '5mg',
    frequency: {
      type: 'daily',
      times: ['14:00'],
    },
    status: 'active',
  },
];
