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
            auth: authReducer,
            family: familyReducer,
            [medicationScheduleApi.reducerPath]: medicationScheduleApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(medicationScheduleApi.middleware),
        preloadedState: {
            auth: initialAuthState,
            family: initialFamilyState,
            ...preloadedState,
        },
    });
};

// Wrapper component for all providers
const AllTheProviders = ({ 
    children,
    store = createTestStore()
}: {
    children: React.ReactNode;
    store?: ReturnType<typeof createTestStore>;
}) => {
    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <BrowserRouter>
                        {children}
                    </BrowserRouter>
                </LocalizationProvider>
            </ThemeProvider>
        </Provider>
    );
};

// Custom render function with async utilities
const render = (
    ui: ReactElement,
    { 
        preloadedState = {},
        store = createTestStore(preloadedState),
        ...renderOptions
    } = {}
) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <AllTheProviders store={store}>{children}</AllTheProviders>
    );

    const utils = rtlRender(ui, { wrapper: Wrapper, ...renderOptions });

    return {
        ...utils,
        store,
        findByTextWithMarkup: async (text: string) => {
            const matches = await utils.findAllByText((content, element) => {
                const hasText = (node: Element) => {
                    return node.textContent === text;
                };
                const elementHasText = hasText(element);
                const childrenHaveText = Array.from(element.children).some(hasText);
                return elementHasText || childrenHaveText;
            });
            return matches[0];
        }
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

export { render, mockWebSocket, mockLocalStorage };
export * from '@testing-library/react';
