import React from 'react';
import { render, act } from '@testing-library/react';
import { withPerformanceTracking } from '../withPerformanceTracking';
import { performanceMonitor } from '../performance';

// Mock performance.now
const mockNow = jest.fn();
global.performance.now = mockNow;

// Mock analytics tracking
jest.mock('../analytics', () => ({
    trackEvent: jest.fn(),
}));

describe('withPerformanceTracking', () => {
    let timeCounter = 0;
    const mockComponent = jest.fn(() => <div>Test Component</div>);

    beforeEach(() => {
        jest.clearAllMocks();
        timeCounter = 0;
        mockNow.mockImplementation(() => timeCounter++);
        performanceMonitor.clearMetrics();
    });

    it('tracks component mount time', () => {
        const WrappedComponent = withPerformanceTracking(mockComponent, 'TestComponent');
        render(<WrappedComponent />);

        const metrics = performanceMonitor.getComponentMetrics('TestComponent');
        expect(metrics).toHaveLength(1);
        expect(metrics[0]).toMatchObject({
            type: 'mount',
            duration: expect.any(Number)
        });
    });

    it('tracks component updates', async () => {
        const WrappedComponent = withPerformanceTracking(mockComponent, 'TestComponent');
        const { rerender } = render(<WrappedComponent />);

        // Force a re-render
        act(() => {
            rerender(<WrappedComponent />);
        });

        const metrics = performanceMonitor.getComponentMetrics('TestComponent');
        const updateMetrics = metrics.filter(m => m.type === 'update');
        expect(updateMetrics).toHaveLength(1);
        expect(updateMetrics[0]).toMatchObject({
            type: 'update',
            duration: expect.any(Number),
            updateCount: 1
        });
    });

    it('tracks component unmount', () => {
        const WrappedComponent = withPerformanceTracking(mockComponent, 'TestComponent');
        const { unmount } = render(<WrappedComponent />);

        act(() => {
            unmount();
        });

        const metrics = performanceMonitor.getComponentMetrics('TestComponent');
        const unmountMetrics = metrics.filter(m => m.type === 'unmount');
        expect(unmountMetrics).toHaveLength(1);
        expect(unmountMetrics[0]).toMatchObject({
            type: 'unmount',
            duration: expect.any(Number)
        });
    });

    it('tracks component errors', () => {
        const ErrorComponent = () => {
            throw new Error('Test error');
        };
        const WrappedComponent = withPerformanceTracking(ErrorComponent, 'ErrorComponent');

        expect(() => {
            render(<WrappedComponent />);
        }).toThrow('Test error');

        const metrics = performanceMonitor.getComponentMetrics('ErrorComponent');
        const errorMetrics = metrics.filter(m => m.type === 'error');
        expect(errorMetrics).toHaveLength(1);
        expect(errorMetrics[0]).toMatchObject({
            type: 'error',
            error: 'Test error'
        });
    });

    it('respects trackUpdates option', async () => {
        const WrappedComponent = withPerformanceTracking(
            mockComponent,
            'TestComponent',
            { trackUpdates: false }
        );
        const { rerender } = render(<WrappedComponent />);

        // Force a re-render
        act(() => {
            rerender(<WrappedComponent />);
        });

        const metrics = performanceMonitor.getComponentMetrics('TestComponent');
        const updateMetrics = metrics.filter(m => m.type === 'update');
        expect(updateMetrics).toHaveLength(0);
    });

    it('provides accurate average metrics', () => {
        const WrappedComponent = withPerformanceTracking(mockComponent, 'TestComponent');
        const { rerender, unmount } = render(<WrappedComponent />);

        // Force multiple updates
        act(() => {
            rerender(<WrappedComponent />);
            rerender(<WrappedComponent />);
        });

        act(() => {
            unmount();
        });

        const averages = performanceMonitor.getAverageMetrics('TestComponent');
        expect(averages).toMatchObject({
            avgMountTime: expect.any(Number),
            avgUpdateTime: expect.any(Number),
            totalUpdates: 2,
            errorCount: 0
        });
    });
});

import React from 'react';
import { render, act } from '@testing-library/react';
import { withPerformanceTracking } from '../withPerformanceTracking';
import { PerformanceMonitor } from '../PerformanceMonitor';

// Mock PerformanceMonitor
jest.mock('../PerformanceMonitor', () => ({
    PerformanceMonitor: {
        trackMount: jest.fn(),
        trackUnmount: jest.fn(),
        trackUpdate: jest.fn(),
        trackRender: jest.fn()
    }
}));

describe('withPerformanceTracking', () => {
    const TestComponent = () => <div>Test Component</div>;
    const ComponentName = 'TestComponent';
    const WrappedComponent = withPerformanceTracking(TestComponent, ComponentName);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('tracks component mount', () => {
        render(<WrappedComponent />);
        
        expect(PerformanceMonitor.trackMount).toHaveBeenCalledWith(ComponentName);
    });

    it('tracks component unmount', () => {
        const { unmount } = render(<WrappedComponent />);
        unmount();

        expect(PerformanceMonitor.trackUnmount).toHaveBeenCalledWith(ComponentName);
    });

    it('tracks component updates', () => {
        const { rerender } = render(<WrappedComponent testProp="initial" />);
        
        // Clear initial mount tracking
        (PerformanceMonitor.trackMount as jest.Mock).mockClear();
        
        // Trigger an update
        act(() => {
            rerender(<WrappedComponent testProp="updated" />);
        });

        expect(PerformanceMonitor.trackUpdate).toHaveBeenCalledWith(ComponentName);
    });

    it('tracks component render time', () => {
        render(<WrappedComponent />);

        expect(PerformanceMonitor.trackRender).toHaveBeenCalledWith(
            ComponentName,
            expect.any(Number)
        );
    });

    it('preserves component props', () => {
        const testProps = {
            testProp: 'test',
            onClick: jest.fn()
        };

        const { container } = render(<WrappedComponent {...testProps} />);
        
        expect(container).toHaveTextContent('Test Component');
    });

    it('handles errors during performance tracking', () => {
        // Mock console.error to prevent test output noise
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Make trackMount throw an error
        (PerformanceMonitor.trackMount as jest.Mock).mockImplementation(() => {
            throw new Error('Tracking error');
        });

        // Component should still render despite tracking error
        const { container } = render(<WrappedComponent />);
        expect(container).toHaveTextContent('Test Component');

        consoleError.mockRestore();
    });

    it('tracks multiple instances separately', () => {
        render(<WrappedComponent key="1" />);
        render(<WrappedComponent key="2" />);

        expect(PerformanceMonitor.trackMount).toHaveBeenCalledTimes(2);
        expect(PerformanceMonitor.trackRender).toHaveBeenCalledTimes(2);
    });

    it('maintains component display name', () => {
        expect(WrappedComponent.displayName).toBe(`WithPerformanceTracking(${ComponentName})`);
    });
});
