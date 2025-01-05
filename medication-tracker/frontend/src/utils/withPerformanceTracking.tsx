import React, { useEffect, useRef, useState } from 'react';
import { performanceMonitor } from './performance';

interface PerformanceMetrics {
    renderTime: number;
    componentName: string;
    timestamp: number;
    operationName?: string;
    mountTime?: number;
    updateCount?: number;
    memoryUsage?: number;
}

interface PerformanceThresholds {
    renderTime?: number;
    memoryUsage?: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
    renderTime: 100, // ms
    memoryUsage: 50 * 1024 * 1024 // 50MB
};

const performanceLog: PerformanceMetrics[] = [];

export const getPerformanceLog = () => [...performanceLog];

export const clearPerformanceLog = () => {
    performanceLog.length = 0;
};

export const checkPerformanceThresholds = (
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS
): boolean => {
    if (thresholds.renderTime && metrics.renderTime > thresholds.renderTime) {
        console.warn(
            `Performance warning: ${metrics.componentName} took ${metrics.renderTime}ms to render (threshold: ${thresholds.renderTime}ms)`
        );
        return false;
    }
    
    if (thresholds.memoryUsage && metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) {
        console.warn(
            `Performance warning: ${metrics.componentName} used ${metrics.memoryUsage / 1024 / 1024}MB of memory (threshold: ${thresholds.memoryUsage / 1024 / 1024}MB)`
        );
        return false;
    }
    
    return true;
};

export function withPerformanceTracking<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName: string,
    options: {
        trackUpdates?: boolean;
        debugMode?: boolean;
        thresholds?: PerformanceThresholds;
        trackMemory?: boolean;
    } = {}
): React.FC<P> {
    const { trackUpdates = true, debugMode = false, thresholds, trackMemory = false } = options;

    return function WithPerformanceTracking(props: P) {
        const metricsRef = useRef<PerformanceMetrics>({
            mountTime: 0,
            renderTime: 0,
            updateCount: 0,
            componentName,
            timestamp: 0
        });
        
        const startTimeRef = useRef<number>(0);
        const [, forceUpdate] = useState({});

        // Track initial mount
        useEffect(() => {
            const mountDuration = performance.now() - startTimeRef.current;
            metricsRef.current.mountTime = mountDuration;
            
            performanceMonitor.trackMetric(componentName, {
                type: 'mount',
                duration: mountDuration
            });

            if (debugMode) {
                console.debug(`[Performance] ${componentName} mounted in ${mountDuration.toFixed(2)}ms`);
            }

            return () => {
                const unmountTime = performance.now();
                performanceMonitor.trackMetric(componentName, {
                    type: 'unmount',
                    duration: unmountTime - startTimeRef.current
                });
            };
        }, []);

        // Track updates
        useEffect(() => {
            if (!trackUpdates) return;

            const updateTime = performance.now();
            metricsRef.current.updateCount++;
            
            const updateDuration = updateTime - startTimeRef.current;
            metricsRef.current.renderTime = updateDuration;

            performanceMonitor.trackMetric(componentName, {
                type: 'update',
                duration: updateDuration,
                updateCount: metricsRef.current.updateCount
            });

            if (debugMode) {
                console.debug(
                    `[Performance] ${componentName} updated in ${updateDuration.toFixed(2)}ms`,
                    `(Update #${metricsRef.current.updateCount})`
                );
            }

            const metrics: PerformanceMetrics = {
                renderTime: updateDuration,
                componentName,
                timestamp: Date.now()
            };

            if (trackMemory) {
                // @ts-ignore: performance.memory is only available in Chrome
                const memory = performance.memory;
                if (memory) {
                    metrics.memoryUsage = memory.usedJSHeapSize;
                }
            }

            performanceLog.push(metrics);
            checkPerformanceThresholds(metrics, thresholds);
        });

        // Track render start
        startTimeRef.current = performance.now();
        
        return <WrappedComponent {...props} />;
    };
}

// Helper to wrap multiple components
export function withBatchPerformanceTracking<P extends object>(
    components: Array<[React.ComponentType<P>, string]>,
    options?: Parameters<typeof withPerformanceTracking>[2]
): Array<React.FC<P>> {
    return components.map(([Component, name]) => 
        withPerformanceTracking(Component, name, options)
    );
}

export const trackOperationPerformance = async <T extends any>(
    operation: () => Promise<T>,
    operationName: string,
    componentName: string,
    thresholds?: PerformanceThresholds
): Promise<T> => {
    const startTime = performance.now();
    let result: T;
    
    try {
        result = await operation();
    } finally {
        const endTime = performance.now();
        const metrics: PerformanceMetrics = {
            renderTime: endTime - startTime,
            componentName,
            operationName,
            timestamp: Date.now()
        };

        // @ts-ignore: performance.memory is only available in Chrome
        const memory = performance.memory;
        if (memory) {
            metrics.memoryUsage = memory.usedJSHeapSize;
        }

        performanceLog.push(metrics);
        checkPerformanceThresholds(metrics, thresholds);
    }

    return result;
};

export const getOperationMetrics = (operationName: string): PerformanceMetrics[] => {
    return performanceLog.filter(metric => metric.operationName === operationName);
};

export const getComponentMetrics = (componentName: string): PerformanceMetrics[] => {
    return performanceLog.filter(metric => metric.componentName === componentName);
};

export const getAverageMetrics = (metrics: PerformanceMetrics[]): Partial<PerformanceMetrics> => {
    if (metrics.length === 0) return {};
    
    return {
        renderTime: metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length,
        memoryUsage: metrics
            .filter(m => m.memoryUsage)
            .reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / metrics.length
    };
};
