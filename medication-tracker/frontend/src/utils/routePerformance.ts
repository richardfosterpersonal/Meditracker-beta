interface PerformanceMetrics {
    loadTime: number;
    renderTime: number;
    timestamp: number;
}

class RoutePerformanceTracker {
    private static instance: RoutePerformanceTracker;
    private metrics: Map<string, PerformanceMetrics[]>;
    private readonly MAX_ENTRIES = 100;

    private constructor() {
        this.metrics = new Map();
    }

    public static getInstance(): RoutePerformanceTracker {
        if (!RoutePerformanceTracker.instance) {
            RoutePerformanceTracker.instance = new RoutePerformanceTracker();
        }
        return RoutePerformanceTracker.instance;
    }

    public trackRoutePerformance(route: string, loadTime: number, renderTime: number): void {
        const currentMetrics = this.metrics.get(route) || [];
        const newMetric: PerformanceMetrics = {
            loadTime,
            renderTime,
            timestamp: Date.now()
        };

        // Add new metric and maintain maximum size
        currentMetrics.push(newMetric);
        if (currentMetrics.length > this.MAX_ENTRIES) {
            currentMetrics.shift();
        }

        this.metrics.set(route, currentMetrics);
        this.logPerformanceMetric(route, newMetric);
    }

    public getRouteMetrics(route: string): PerformanceMetrics[] {
        return this.metrics.get(route) || [];
    }

    public getAverageMetrics(route: string): { avgLoadTime: number; avgRenderTime: number } {
        const metrics = this.getRouteMetrics(route);
        if (metrics.length === 0) {
            return { avgLoadTime: 0, avgRenderTime: 0 };
        }

        const sum = metrics.reduce(
            (acc, metric) => ({
                loadTime: acc.loadTime + metric.loadTime,
                renderTime: acc.renderTime + metric.renderTime
            }),
            { loadTime: 0, renderTime: 0 }
        );

        return {
            avgLoadTime: sum.loadTime / metrics.length,
            avgRenderTime: sum.renderTime / metrics.length
        };
    }

    private logPerformanceMetric(route: string, metric: PerformanceMetrics): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`Route Performance [${route}]:`, {
                loadTime: `${metric.loadTime}ms`,
                renderTime: `${metric.renderTime}ms`,
                timestamp: new Date(metric.timestamp).toISOString()
            });
        }
    }

    public clearMetrics(): void {
        this.metrics.clear();
    }
}

export const routePerformanceTracker = RoutePerformanceTracker.getInstance();
