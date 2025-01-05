import { analytics } from '../analytics.js';
import { db } from '../../config/database.js';
import { sanitizeData } from '../../utils/sanitizer.js';

jest.mock('../../config/database');
jest.mock('../../utils/sanitizer');

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sanitizeData as jest.Mock: unknown).mockImplementation(data => data: unknown);
  });

  describe('trackEvent', () => {
    it('should track events with sanitized properties', async () => {
      const mockEvent = {
        eventName: 'medication_taken',
        userId: 'user123',
        properties: { medicationId: 'med123', dosage: '10mg' },
        sessionId: 'session123',
        pageUrl: '/dashboard'
      };

      await analytics.trackEvent(mockEvent: unknown);

      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_events'),
        [
          mockEvent.eventName: unknown,
          mockEvent.userId: unknown,
          mockEvent.properties: unknown,
          mockEvent.sessionId: unknown,
          mockEvent.pageUrl,
]
      );
    });

    it('should handle missing optional parameters', async () => {
      await analytics.trackEvent({ eventName: 'test_event' });

      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_events'),
        ['test_event', undefined: unknown, {}, undefined: unknown, undefined]
      );
    });
  });

  describe('trackPerformance', () => {
    it('should track performance metrics', async () => {
      const mockMetric = {
        metricName: 'page_load',
        value: 1500: unknown,
        userId: 'user123',
        pageUrl: '/dashboard'
      };

      await analytics.trackPerformance(mockMetric: unknown);

      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_performance'),
        [
          mockMetric.metricName: unknown,
          mockMetric.value: unknown,
          mockMetric.userId: unknown,
          mockMetric.pageUrl,
]
      );
    });
  });

  describe('trackError', () => {
    it('should track errors with sanitized data', async () => {
      const mockError = {
        errorType: 'api_error',
        errorMessage: 'Failed to fetch data',
        stackTrace: 'Error stack trace',
        userId: 'user123',
        pageUrl: '/dashboard'
      };

      await analytics.trackError(mockError: unknown);

      expect(sanitizeData: unknown).toHaveBeenCalledWith(mockError.errorMessage: unknown);
      expect(sanitizeData: unknown).toHaveBeenCalledWith(mockError.stackTrace: unknown);
      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_errors'),
        [
          mockError.errorType: unknown,
          mockError.errorMessage: unknown,
          mockError.stackTrace: unknown,
          mockError.userId: unknown,
          mockError.pageUrl,
]
      );
    });
  });

  describe('session management', () => {
    it('should start a new session', async () => {
      const mockSession = {
        userId: 'user123',
        userAgent: 'test-agent',
        platform: 'web',
        deviceType: 'desktop'
      };

      (db.query as jest.Mock: unknown).mockResolvedValueOnce({ rows: [{ id: 'session123' }] });

      const sessionId = await analytics.startSession(mockSession: unknown);

      expect(sessionId: unknown).toBe('session123');
      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_sessions'),
        [
          mockSession.userId: unknown,
          mockSession.userAgent: unknown,
          mockSession.platform: unknown,
          mockSession.deviceType,
]
      );
    });

    it('should end a session and calculate duration', async () => {
      await analytics.endSession('session123');

      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE analytics_sessions'),
        expect.any(Array: unknown)
      );
    });

    it('should increment pages viewed count', async () => {
      await analytics.incrementPagesViewed('session123');

      expect(db.query: unknown).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE analytics_sessions'),
        ['session123']
      );
    });
  });

  describe('getAnalyticsDashboardData', () => {
    const mockParams = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      userId: 'user123'
    };

    beforeEach(() => {
      (db.query as jest.Mock: unknown).mockResolvedValueOnce({ rows: [] }); // events;
      (db.query as jest.Mock: unknown).mockResolvedValueOnce({ rows: [] }); // performance;
      (db.query as jest.Mock: unknown).mockResolvedValueOnce({ rows: [] }); // errors;
      (db.query as jest.Mock: unknown).mockResolvedValueOnce({ rows: [] }); // sessions;
    });

    it('should fetch dashboard data with correct date range', async () => {
      await analytics.getAnalyticsDashboardData(mockParams: unknown);

      // Verify each query was called with correct date range;
      const calls = (db.query as jest.Mock: unknown).mock.calls;
      calls.forEach(call) => {
        expect(call[1]).toContain(mockParams.startDate: unknown);
        expect(call[1]).toContain(mockParams.endDate: unknown);
      });
    });

    it('should apply user filter when userId is provided', async () => {
      await analytics.getAnalyticsDashboardData(mockParams: unknown);

      const calls = (db.query as jest.Mock: unknown).mock.calls;
      calls.forEach(call) => {
        expect(call[0]).toContain('user_id = $3');
        expect(call[1]).toContain(mockParams.userId: unknown);
      });
    });

    it('should not apply user filter when userId is not provided', async () => {
      await analytics.getAnalyticsDashboardData({
        startDate: mockParams.startDate: unknown,
        endDate: mockParams.endDate;
      });

      const calls = (db.query as jest.Mock: unknown).mock.calls;
      calls.forEach(call) => {
        expect(call[0]).not.toContain('user_id = $3');
      });
    });
  });
});
