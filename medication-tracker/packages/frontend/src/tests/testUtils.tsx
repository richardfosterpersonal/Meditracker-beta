import React, { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { theme } from '../theme';
import { Medication } from '../types/medication';
import { medicationScheduleApi } from '../store/services/medicationScheduleApi';
import authReducer, { selectUser, selectIsAuthenticated } from '../store/slices/authSlice';
import familyReducer, { selectSelectedMember } from '../store/slices/familySlice';

// Mock environment variables
process.env.REACT_APP_API_URL = 'http://localhost:5001';
process.env.REACT_APP_MIXPANEL_TOKEN = 'test-token';

// Mock initial auth state
const initialAuthState = {
    user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
};

// Mock initial family state
const initialFamilyState = {
    members: [{
        id: 'test-family-member-id',
        name: 'Test Family Member',
        relationship: 'self',
        email: 'family@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }],
    selectedMember: {
        id: 'test-family-member-id',
        name: 'Test Family Member',
        relationship: 'self',
        email: 'family@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    loading: false,
    error: null,
    inviteStatus: 'idle',
    canAddMembers: true,
};

// Mock initial medication state
const initialMedicationState = {
    schedules: [],
    adherenceStats: null,
    doseLogs: [],
    loading: false,
    error: null,
};

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};

// Set default behavior
mockLocalStorage.getItem.mockImplementation((key) => {
    if (key === 'token') return 'test-token';
    return null;
});

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock WebSocket
const mockWebSocket = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
};
global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock analytics
jest.mock('../utils/analytics', () => ({
    trackEvent: jest.fn(),
    initializeAnalytics: jest.fn(),
}));

// Create a test store with all required reducers
const createTestStore = (preloadedState = {}) => {
    return configureStore({
        reducer: {
            [medicationScheduleApi.reducerPath]: medicationScheduleApi.reducer,
            auth: authReducer,
            family: familyReducer,
            medication: (state = initialMedicationState) => state,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
            }).concat(medicationScheduleApi.middleware),
        preloadedState: {
            auth: initialAuthState,
            family: initialFamilyState,
            medication: initialMedicationState,
            ...preloadedState,
        },
    });
};

// Wrapper component for all providers
const AllTheProviders: React.FC<{ children: React.ReactNode; store?: any }> = ({ 
    children,
    store = createTestStore()
}) => {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <ThemeProvider theme={theme}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        {children}
                    </LocalizationProvider>
                </ThemeProvider>
            </BrowserRouter>
        </Provider>
    );
};

const render = (ui: ReactElement, { 
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
} = {}) => {
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AllTheProviders store={store}>{children}</AllTheProviders>
    );
    
    return {
        ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
        store,
    };
};

// Mock data
export const mockMedication: Medication = {
    id: 'test-med-id',
    name: 'Test Medication',
    dosage: '10mg',
    frequency: 'daily',
    startDate: new Date().toISOString(),
    endDate: null,
    instructions: 'Take with food',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'test-user-id',
};

export { render, mockWebSocket, mockLocalStorage, mockMedication };
export * from '@testing-library/react';
