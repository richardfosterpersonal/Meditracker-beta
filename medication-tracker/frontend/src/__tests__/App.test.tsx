import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { performanceMonitor } from '../utils/performance';
import { trackEvent } from '../utils/analytics';

// Mock components
jest.mock('../pages/MedicationsPage', () => ({
    __esModule: true,
    default: () => <div>Medications Page</div>
}));

jest.mock('../components/Layout/Layout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <div>Layout {children}</div>
    )
}));

jest.mock('../pages/Login', () => ({
    __esModule: true,
    default: () => <div>Login Page</div>
}));

jest.mock('../pages/Register', () => ({
    __esModule: true,
    default: () => <div>Register Page</div>
}));

// Mock analytics and performance monitoring
jest.mock('../utils/analytics', () => ({
    trackEvent: jest.fn()
}));

jest.mock('../utils/performance', () => ({
    performanceMonitor: {
        trackMetric: jest.fn()
    }
}));

const renderWithRouter = (initialRoute: string) => {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <App />
        </MemoryRouter>
    );
};

describe('App', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('redirects to medications page by default', () => {
        renderWithRouter('/');
        expect(screen.getByText('Medications Page')).toBeInTheDocument();
    });

    it('renders login page on /login route', () => {
        renderWithRouter('/login');
        expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('renders register page on /register route', () => {
        renderWithRouter('/register');
        expect(screen.getByText('Register Page')).toBeInTheDocument();
    });

    it('tracks performance metrics for App component', () => {
        renderWithRouter('/');
        expect(performanceMonitor.trackMetric).toHaveBeenCalledWith(
            'App',
            expect.objectContaining({
                type: 'mount',
                duration: expect.any(Number)
            })
        );
    });

    it('handles errors gracefully', () => {
        const ErrorComponent = () => {
            throw new Error('Test error');
            return null;
        };

        // Mock MedicationsPage to throw an error
        jest.mock('../pages/MedicationsPage', () => ({
            __esModule: true,
            default: ErrorComponent
        }));

        renderWithRouter('/medications');

        // Error boundary should catch the error and display error message
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
        expect(trackEvent).toHaveBeenCalledWith(
            'error_boundary',
            expect.objectContaining({
                componentName: 'MedicationsPage',
                errorMessage: 'Test error'
            })
        );
    });

    it('tracks performance metrics for child components', () => {
        renderWithRouter('/medications');
        
        // Should track metrics for both Layout and MedicationsPage
        expect(performanceMonitor.trackMetric).toHaveBeenCalledWith(
            'Layout',
            expect.objectContaining({
                type: 'mount',
                duration: expect.any(Number)
            })
        );

        expect(performanceMonitor.trackMetric).toHaveBeenCalledWith(
            'MedicationsPage',
            expect.objectContaining({
                type: 'mount',
                duration: expect.any(Number)
            })
        );
    });
});
