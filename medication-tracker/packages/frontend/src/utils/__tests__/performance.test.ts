import { performanceMonitor } from '../performance';
import { trackEvent } from '../analytics';

// Mock analytics tracking
jest.mock('../analytics', () => ({
    trackEvent: jest.fn(),
}));

// Mock PerformanceObserver
class MockPerformanceObserver {
    constructor(callback: (list: { getEntries: () => any[] }) => void) {
        this.callback = callback;
    }
    callback: (list: { getEntries: () => any[] }) => void;
    observe = jest.fn();
    disconnect = jest.fn();
}

global.PerformanceObserver = MockPerformanceObserver as any;

describe('PerformanceMonitor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        performanceMonitor.clearMetrics();
    });

    afterEach(() => {
        performanceMonitor.destroy();
    });

    it('tracks component metrics correctly', () => {
        performanceMonitor.trackMetric('TestComponent', {
            type: 'mount',
            duration: 100
        });

        const metrics = performanceMonitor.getComponentMetrics('TestComponent');
        expect(metrics).toHaveLength(1);
        expect(metrics[0]).toMatchObject({
            type: 'mount',
            duration: 100,
            timestamp: expect.any(Number)
        });
    });

    it('maintains buffer size for component metrics', () => {
        const bufferSize = 100;
        for (let i = 0; i < bufferSize + 10; i++) {
            performanceMonitor.trackMetric('TestComponent', {
                type: 'update',
                duration: i
            });
        }

        const metrics = performanceMonitor.getComponentMetrics('TestComponent');
        expect(metrics).toHaveLength(bufferSize);
        expect(metrics[metrics.length - 1].duration).toBe(bufferSize + 9);
    });

    it('calculates average metrics correctly', () => {
        // Add mount metrics
        performanceMonitor.trackMetric('TestComponent', {
            type: 'mount',
            duration: 100
        });
        performanceMonitor.trackMetric('TestComponent', {
            type: 'mount',
            duration: 200
        });

        // Add update metrics
        performanceMonitor.trackMetric('TestComponent', {
            type: 'update',
            duration: 50
        });
        performanceMonitor.trackMetric('TestComponent', {
            type: 'update',
            duration: 150
        });

        // Add an error
        performanceMonitor.trackMetric('TestComponent', {
            type: 'error',
            error: 'Test error'
        });

        const averages = performanceMonitor.getAverageMetrics('TestComponent');
        expect(averages).toEqual({
            avgMountTime: 150,  // (100 + 200) / 2
            avgUpdateTime: 100, // (50 + 150) / 2
            totalUpdates: 2,
            errorCount: 1
        });
    });

    it('clears metrics correctly', () => {
        performanceMonitor.trackMetric('Component1', {
            type: 'mount',
            duration: 100
        });
        performanceMonitor.trackMetric('Component2', {
            type: 'mount',
            duration: 200
        });

        // Clear specific component
        performanceMonitor.clearMetrics('Component1');
        expect(performanceMonitor.getComponentMetrics('Component1')).toHaveLength(0);
        expect(performanceMonitor.getComponentMetrics('Component2')).toHaveLength(1);

        // Clear all metrics
        performanceMonitor.clearMetrics();
        expect(performanceMonitor.getComponentMetrics('Component2')).toHaveLength(0);
    });

    it('reports metrics to analytics', () => {
        performanceMonitor.trackMetric('TestComponent', {
            type: 'mount',
            duration: 100
        });

        expect(trackEvent).toHaveBeenCalledWith('component_performance', {
            component: 'TestComponent',
            type: 'mount',
            duration: 100,
            timestamp: expect.any(Number)
        });
    });

    it('handles performance observers correctly', () => {
        const mockCallback = jest.fn();
        const observer = new MockPerformanceObserver(mockCallback);

        expect(observer.observe).toHaveBeenCalled();
    });
});
