import { trackEvent } from './analytics';

interface PerformanceMetrics {
    FCP: number;      // First Contentful Paint
    LCP: number;      // Largest Contentful Paint
    FID: number;      // First Input Delay
    CLS: number;      // Cumulative Layout Shift
    TTFB: number;     // Time to First Byte
    TTI: number;      // Time to Interactive
}

interface ComponentMetric {
    type: 'mount' | 'unmount' | 'update' | 'error';
    duration?: number;
    updateCount?: number;
    error?: string;
    timestamp: number;
}

interface ComponentMetrics {
    [componentName: string]: ComponentMetric[];
}

class PerformanceMonitor {
    private metrics: Partial<PerformanceMetrics> = {};
    private observers: PerformanceObserver[] = [];
    private componentMetrics: ComponentMetrics = {};
    private bufferSize: number = 100;  // Keep last 100 metrics per component

    constructor() {
        this.initializeObservers();
    }

    private initializeObservers() {
        // First Contentful Paint
        this.createObserver('paint', (entries) => {
            entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                    this.metrics.FCP = entry.startTime;
                    this.reportMetric('FCP', entry.startTime);
                }
            });
        });

        // Largest Contentful Paint
        this.createObserver('largest-contentful-paint', (entries) => {
            const lastEntry = entries.at(-1);
            if (lastEntry) {
                this.metrics.LCP = lastEntry.startTime;
                this.reportMetric('LCP', lastEntry.startTime);
            }
        });

        // First Input Delay
        this.createObserver('first-input', (entries) => {
            entries.forEach((entry) => {
                this.metrics.FID = entry.processingStart - entry.startTime;
                this.reportMetric('FID', this.metrics.FID);
            });
        });

        // Layout Shifts
        this.createObserver('layout-shift', (entries) => {
            let cumulativeScore = 0;
            entries.forEach((entry) => {
                if (!entry.hadRecentInput) {
                    cumulativeScore += entry.value;
                }
            });
            this.metrics.CLS = cumulativeScore;
            this.reportMetric('CLS', cumulativeScore);
        });

        // Navigation Timing
        this.measureNavigationTiming();
    }

    private createObserver(
        entryType: string,
        callback: (entries: PerformanceEntryList) => void
    ) {
        try {
            const observer = new PerformanceObserver((list) => {
                callback(list.getEntries());
            });
            observer.observe({ entryType });
            this.observers.push(observer);
        } catch (error) {
            console.warn(`Failed to create observer for ${entryType}:`, error);
        }
    }

    private measureNavigationTiming() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navigation) {
                    this.metrics.TTFB = navigation.responseStart - navigation.requestStart;
                    this.reportMetric('TTFB', this.metrics.TTFB);

                    this.metrics.TTI = navigation.domInteractive - navigation.requestStart;
                    this.reportMetric('TTI', this.metrics.TTI);
                }
            }, 0);
        });
    }

    public trackMetric(componentName: string, metric: Omit<ComponentMetric, 'timestamp'>) {
        const fullMetric: ComponentMetric = {
            ...metric,
            timestamp: performance.now()
        };

        if (!this.componentMetrics[componentName]) {
            this.componentMetrics[componentName] = [];
        }

        this.componentMetrics[componentName].push(fullMetric);

        // Keep buffer size in check
        if (this.componentMetrics[componentName].length > this.bufferSize) {
            this.componentMetrics[componentName] = this.componentMetrics[componentName].slice(-this.bufferSize);
        }

        // Report to analytics
        trackEvent('component_performance', {
            component: componentName,
            ...fullMetric
        });
    }

    public getComponentMetrics(componentName: string): ComponentMetric[] {
        return this.componentMetrics[componentName] || [];
    }

    public getAverageMetrics(componentName: string): {
        avgMountTime?: number;
        avgUpdateTime?: number;
        totalUpdates: number;
        errorCount: number;
    } {
        const metrics = this.componentMetrics[componentName] || [];
        const mounts = metrics.filter(m => m.type === 'mount' && m.duration);
        const updates = metrics.filter(m => m.type === 'update' && m.duration);
        const errors = metrics.filter(m => m.type === 'error');

        return {
            avgMountTime: mounts.length 
                ? mounts.reduce((sum, m) => sum + (m.duration || 0), 0) / mounts.length 
                : undefined,
            avgUpdateTime: updates.length
                ? updates.reduce((sum, m) => sum + (m.duration || 0), 0) / updates.length
                : undefined,
            totalUpdates: updates.length,
            errorCount: errors.length
        };
    }

    public clearMetrics(componentName?: string) {
        if (componentName) {
            delete this.componentMetrics[componentName];
        } else {
            this.componentMetrics = {};
        }
    }

    public destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.metrics = {};
        this.componentMetrics = {};
    }

    private reportMetric(name: keyof PerformanceMetrics, value: number) {
        trackEvent('performance_metric', {
            metric_name: name,
            value: Math.round(value),
            timestamp: new Date().toISOString()
        });
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();
