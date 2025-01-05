/**
 * Analytics Service Tests
 */

import { Container } from 'inversify';
import { Redis } from 'ioredis';
import { AnalyticsService } from '../AnalyticsService';
import { Logger } from '@/core/logging';
import { MetricsCollector } from '@/core/monitoring';
import { Config } from '@/core/config';
import { TYPES } from '@/core/types';
import {
    AnalyticsEventType,
    TimeRange,
    AggregationType,
    AnalyticsEvent,
    AnalyticsQuery
} from '../types';

describe('AnalyticsService', () => {
    let container: Container;
    let analyticsService: AnalyticsService;
    let redis: Redis;
    let logger: Logger;
    let metrics: MetricsCollector;

    beforeEach(() => {
        // Set up test container
        container = new Container();
        
        // Mock Redis
        redis = {
            zadd: jest.fn().mockResolvedValue(1),
            incr: jest.fn().mockResolvedValue(1),
            sadd: jest.fn().mockResolvedValue(1),
            get: jest.fn().mockResolvedValue(null),
            setex: jest.fn().mockResolvedValue('OK')
        } as unknown as Redis;

        // Mock Logger
        logger = {
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        } as unknown as Logger;

        // Mock MetricsCollector
        metrics = {
            increment: jest.fn(),
            gauge: jest.fn(),
            timing: jest.fn()
        } as unknown as MetricsCollector;

        // Mock Config
        const config = {
            get: jest.fn().mockReturnValue({
                redis: {
                    host: 'localhost',
                    port: 6379
                }
            })
        } as unknown as Config;

        // Bind services
        container.bind<Redis>(TYPES.Redis).toConstantValue(redis);
        container.bind<Logger>(TYPES.Logger).toConstantValue(logger);
        container.bind<MetricsCollector>(TYPES.MetricsCollector).toConstantValue(metrics);
        container.bind<Config>(TYPES.Config).toConstantValue(config);
        container.bind<AnalyticsService>(TYPES.AnalyticsService).to(AnalyticsService);

        // Get service instance
        analyticsService = container.get<AnalyticsService>(TYPES.AnalyticsService);
    });

    describe('trackEvent', () => {
        it('should store and process analytics event', async () => {
            const event: AnalyticsEvent = {
                eventType: AnalyticsEventType.MEDICATION_TAKEN,
                timestamp: new Date(),
                userId: 'test-user',
                medicationId: 'test-med',
                metadata: {}
            };

            await analyticsService.trackEvent(event);

            expect(redis.zadd).toHaveBeenCalled();
            expect(redis.incr).toHaveBeenCalled();
            expect(redis.sadd).toHaveBeenCalled();
        });

        it('should handle event without userId', async () => {
            const event: AnalyticsEvent = {
                eventType: AnalyticsEventType.ERROR_OCCURRED,
                timestamp: new Date(),
                metadata: { error: 'test error' }
            };

            await analyticsService.trackEvent(event);

            expect(redis.zadd).toHaveBeenCalled();
            expect(redis.incr).toHaveBeenCalled();
            expect(redis.sadd).not.toHaveBeenCalled();
        });

        it('should throw error for invalid event', async () => {
            const event = {} as AnalyticsEvent;

            await expect(analyticsService.trackEvent(event)).rejects.toThrow();
        });
    });

    describe('query', () => {
        it('should return cached result if available', async () => {
            const cachedResult = {
                timeRange: TimeRange.DAY,
                aggregationType: AggregationType.COUNT,
                data: [],
                metadata: { totalCount: 0 }
            };

            redis.get = jest.fn().mockResolvedValue(JSON.stringify(cachedResult));

            const query: AnalyticsQuery = {
                startTime: new Date(),
                endTime: new Date(),
                aggregation: AggregationType.COUNT,
                timeRange: TimeRange.DAY
            };

            const result = await analyticsService.query(query);

            expect(result).toEqual(cachedResult);
            expect(redis.get).toHaveBeenCalled();
        });

        it('should execute query if no cache available', async () => {
            const query: AnalyticsQuery = {
                startTime: new Date(),
                endTime: new Date(),
                aggregation: AggregationType.COUNT,
                timeRange: TimeRange.DAY
            };

            const result = await analyticsService.query(query);

            expect(result).toBeDefined();
            expect(redis.setex).toHaveBeenCalled();
        });

        it('should throw error for invalid query range', async () => {
            const query: AnalyticsQuery = {
                startTime: new Date(0),
                endTime: new Date(),
                aggregation: AggregationType.COUNT,
                timeRange: TimeRange.DAY
            };

            await expect(analyticsService.query(query)).rejects.toThrow();
        });
    });

    describe('getAdherenceMetrics', () => {
        it('should calculate adherence metrics correctly', async () => {
            const mockEvents = {
                timeRange: TimeRange.DAY,
                aggregationType: AggregationType.COUNT,
                data: [
                    { timestamp: new Date(), value: 1 }, // taken
                    { timestamp: new Date(), value: 0 }, // missed
                    { timestamp: new Date(), value: 1 }, // taken
                    { timestamp: new Date(), value: 2 }  // skipped
                ],
                metadata: { totalCount: 4 }
            };

            jest.spyOn(analyticsService, 'query').mockResolvedValue(mockEvents);

            const metrics = await analyticsService.getAdherenceMetrics(
                'test-user',
                'test-med',
                TimeRange.DAY
            );

            expect(metrics.takenCount).toBe(2);
            expect(metrics.missedCount).toBe(1);
            expect(metrics.skippedCount).toBe(1);
            expect(metrics.adherenceRate).toBe(50);
        });
    });

    describe('getRefillMetrics', () => {
        it('should calculate refill metrics correctly', async () => {
            const now = new Date();
            const hourAgo = new Date(now.getTime() - 3600000);
            
            const mockEvents = {
                timeRange: TimeRange.DAY,
                aggregationType: AggregationType.COUNT,
                data: [
                    { timestamp: hourAgo, value: 1 },
                    { timestamp: now, value: 1 }
                ],
                metadata: { totalCount: 2 }
            };

            jest.spyOn(analyticsService, 'query').mockResolvedValue(mockEvents);

            const metrics = await analyticsService.getRefillMetrics(
                'test-user',
                'test-med',
                TimeRange.DAY
            );

            expect(metrics.refillCount).toBe(2);
            expect(metrics.averageRefillInterval).toBe(3600000);
            expect(metrics.lastRefill).toEqual(now);
            expect(metrics.predictedNextRefill).toEqual(new Date(now.getTime() + 3600000));
        });
    });

    describe('getInteractionMetrics', () => {
        it('should calculate interaction metrics correctly', async () => {
            const mockEvents = {
                timeRange: TimeRange.DAY,
                aggregationType: AggregationType.COUNT,
                data: [
                    { 
                        timestamp: new Date(),
                        value: 1,
                        metadata: { detectionTime: Date.now() - 1000 }
                    },
                    {
                        timestamp: new Date(),
                        value: 2,
                        metadata: { detectionTime: Date.now() - 2000 }
                    }
                ],
                metadata: { totalCount: 2 }
            };

            jest.spyOn(analyticsService, 'query').mockResolvedValue(mockEvents);

            const metrics = await analyticsService.getInteractionMetrics(
                'test-user',
                TimeRange.DAY
            );

            expect(metrics.totalInteractions).toBe(2);
            expect(metrics.resolvedCount).toBe(1);
            expect(metrics.ignoredCount).toBe(1);
        });
    });

    describe('getSystemMetrics', () => {
        it('should calculate system metrics correctly', async () => {
            const mockEvents = {
                timeRange: TimeRange.HOUR,
                aggregationType: AggregationType.AVERAGE,
                data: [
                    { 
                        timestamp: new Date(),
                        value: 100,
                        metadata: { error: false, userId: 'user1' }
                    },
                    {
                        timestamp: new Date(),
                        value: 200,
                        metadata: { error: true, userId: 'user2' }
                    },
                    {
                        timestamp: new Date(),
                        value: 300,
                        metadata: { error: false, userId: 'user1' }
                    }
                ],
                metadata: { totalCount: 3 }
            };

            jest.spyOn(analyticsService, 'query').mockResolvedValue(mockEvents);

            const metrics = await analyticsService.getSystemMetrics(TimeRange.HOUR);

            expect(metrics.errorRate).toBe(33.33333333333333);
            expect(metrics.averageResponseTime).toBe(200);
            expect(metrics.uniqueUsers).toBe(2);
            expect(metrics.totalEvents).toBe(3);
        });
    });
});
