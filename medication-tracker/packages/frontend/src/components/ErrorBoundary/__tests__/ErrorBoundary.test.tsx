import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { trackEvent } from '../../../utils/analytics';

// Mock analytics
jest.mock('../../../utils/analytics', () => ({
    trackEvent: jest.fn()
}));

// Component that throws an error
const ErrorComponent = () => {
    throw new Error('Test error');
    return null;
};

// Normal component
const NormalComponent = () => <div>Normal component</div>;

describe('ErrorBoundary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear console.error to avoid test output noise
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.error as jest.Mock).mockRestore();
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary componentName="TestComponent">
                <NormalComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Normal component')).toBeInTheDocument();
    });

    it('renders error message when child component throws', () => {
        render(
            <ErrorBoundary componentName="ErrorComponent">
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again/i)).toBeInTheDocument();
    });

    it('tracks error events', () => {
        render(
            <ErrorBoundary componentName="ErrorComponent">
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(trackEvent).toHaveBeenCalledWith('error_boundary', {
            componentName: 'ErrorComponent',
            errorMessage: 'Test error',
            errorStack: expect.any(String)
        });
    });

    it('provides retry functionality', () => {
        const { rerender } = render(
            <ErrorBoundary componentName="ErrorComponent">
                <ErrorComponent />
            </ErrorBoundary>
        );

        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();

        // Simulate successful retry by rendering normal component
        rerender(
            <ErrorBoundary componentName="ErrorComponent">
                <NormalComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Normal component')).toBeInTheDocument();
    });

    it('handles multiple errors', () => {
        const { rerender } = render(
            <ErrorBoundary componentName="ErrorComponent">
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(trackEvent).toHaveBeenCalledTimes(1);

        // Trigger another error
        rerender(
            <ErrorBoundary componentName="ErrorComponent">
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(trackEvent).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });

    it('resets error state when children change', () => {
        const { rerender } = render(
            <ErrorBoundary componentName="ErrorComponent">
                <ErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();

        // Change to normal component
        rerender(
            <ErrorBoundary componentName="ErrorComponent">
                <NormalComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Normal component')).toBeInTheDocument();
    });
});
