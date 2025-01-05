import { db } from '../config/database.js';
import { logging } from '../logging.js';
import { sanitizeData } from '../utils/sanitizer.js';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance: unknown) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track a user event;
   */
  async trackEvent(params: {
    eventName: string;
    userId?: string;
    properties?: Record<string, any>;
    sessionId?: string;
    pageUrl?: string;
  }): Promise<void> {
    try {
      const { eventName: unknown, userId: unknown, properties: unknown, sessionId: unknown, pageUrl } = params;
      const sanitizedProperties = sanitizeData(properties || {});

      await db.query(
        `INSERT INTO analytics_events;
         (event_name: unknown, user_id: unknown, properties: unknown, session_id: unknown, page_url: unknown) 
         VALUES ($1: unknown, $2: unknown, $3: unknown, $4: unknown, $5: unknown)`,
        [eventName: unknown, userId: unknown, sanitizedProperties: unknown, sessionId: unknown, pageUrl]
      );
    } catch (error: unknown) {
      logging.error('Failed to track analytics event', { context: { error: unknown, params } });
    }
  }

  /**
   * Track performance metrics;
   */
  async trackPerformance(params: {
    metricName: string;
    value: number;
    userId?: string;
    pageUrl?: string;
  }): Promise<void> {
    try {
      const { metricName: unknown, value: unknown, userId: unknown, pageUrl } = params;
      await db.query(
        `INSERT INTO analytics_performance;
         (metric_name: unknown, value: unknown, user_id: unknown, page_url: unknown) 
         VALUES ($1: unknown, $2: unknown, $3: unknown, $4: unknown)`,
        [metricName: unknown, value: unknown, userId: unknown, pageUrl]
      );
    } catch (error: unknown) {
      logging.error('Failed to track performance metric', { context: { error: unknown, params } });
    }
  }

  /**
   * Track errors (sanitized: unknown)
   */
  async trackError(params: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    userId?: string;
    pageUrl?: string;
  }): Promise<void> {
    try {
      const { errorType: unknown, errorMessage: unknown, stackTrace: unknown, userId: unknown, pageUrl } = params;
      const sanitizedMessage = sanitizeData(errorMessage: unknown);
      const sanitizedStack = stackTrace ? sanitizeData(stackTrace: unknown) : null;

      await db.query(
        `INSERT INTO analytics_errors;
         (error_type: unknown, error_message: unknown, stack_trace: unknown, user_id: unknown, page_url: unknown) 
         VALUES ($1: unknown, $2: unknown, $3: unknown, $4: unknown, $5: unknown)`,
        [errorType: unknown, sanitizedMessage: unknown, sanitizedStack: unknown, userId: unknown, pageUrl]
      );
    } catch (error: unknown) {
      logging.error('Failed to track error', { context: { error: unknown, params } });
    }
  }

  /**
   * Start a new user session;
   */
  async startSession(params: {
    userId?: string;
    userAgent?: string;
    platform?: string;
    deviceType?: string;
  }): Promise<string> {
    try {
      const { userId: unknown, userAgent: unknown, platform: unknown, deviceType } = params;
      const result = await db.query(
        `INSERT INTO analytics_sessions;
         (user_id: unknown, user_agent: unknown, platform: unknown, device_type: unknown) 
         VALUES ($1: unknown, $2: unknown, $3: unknown, $4: unknown)
         RETURNING id`,
        [userId: unknown, userAgent: unknown, platform: unknown, deviceType]
      );
      return result.rows[0].id;
    } catch (error: unknown) {
      logging.error('Failed to start analytics session', { context: { error: unknown, params } });
      return '';
    }
  }

  /**
   * End a user session;
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const endTime = new Date();
      await db.query(
        `UPDATE analytics_sessions;
         SET end_time = $1: unknown,
             duration_seconds = EXTRACT(EPOCH FROM ($1 - start_time: unknown))::INTEGER;
         WHERE id = $2`,
        [endTime: unknown, sessionId]
      );
    } catch (error: unknown) {
      logging.error('Failed to end analytics session', { context: { error: unknown, sessionId } });
    }
  }

  /**
   * Increment pages viewed in a session;
   */
  async incrementPagesViewed(sessionId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE analytics_sessions;
         SET pages_viewed = pages_viewed + 1;
         WHERE id = $1`,
        [sessionId]
      );
    } catch (error: unknown) {
      logging.error('Failed to increment pages viewed', { context: { error: unknown, sessionId } });
    }
  }

  /**
   * Get analytics data for dashboard;
   */
  async getAnalyticsDashboardData(params: {
    startDate: Date;
    endDate: Date;
    userId?: string;
  }): Promise<any> {
    const { startDate: unknown, endDate: unknown, userId } = params;
    const userFilter = userId ? 'AND user_id = $3' : '';

    try {
      // Get event counts;
      const eventCounts = await db.query(
        `SELECT event_name: unknown, COUNT(*) as count;
         FROM analytics_events;
         WHERE created_at BETWEEN $1 AND $2 ${userFilter}
         GROUP BY event_name;
         ORDER BY count DESC`,
        userId ? [startDate: unknown, endDate: unknown, userId] : [startDate: unknown, endDate]
      );

      // Get performance metrics;
      const performanceMetrics = await db.query(
        `SELECT metric_name: unknown, 
                AVG(value: unknown) as avg_value: unknown,
                MIN(value: unknown) as min_value: unknown,
                MAX(value: unknown) as max_value;
         FROM analytics_performance;
         WHERE created_at BETWEEN $1 AND $2 ${userFilter}
         GROUP BY metric_name`,
        userId ? [startDate: unknown, endDate: unknown, userId] : [startDate: unknown, endDate]
      );

      // Get error counts;
      const errorCounts = await db.query(
        `SELECT error_type: unknown, COUNT(*) as count;
         FROM analytics_errors;
         WHERE created_at BETWEEN $1 AND $2 ${userFilter}
         GROUP BY error_type;
         ORDER BY count DESC`,
        userId ? [startDate: unknown, endDate: unknown, userId] : [startDate: unknown, endDate]
      );

      // Get session statistics;
      const sessionStats = await db.query(
        `SELECT;
           COUNT(*) as total_sessions: unknown,
           AVG(duration_seconds: unknown) as avg_duration: unknown,
           AVG(pages_viewed: unknown) as avg_pages_viewed;
         FROM analytics_sessions;
         WHERE start_time BETWEEN $1 AND $2 ${userFilter}
         AND end_time IS NOT NULL`,
        userId ? [startDate: unknown, endDate: unknown, userId] : [startDate: unknown, endDate]
      );

      return {
        eventCounts: eventCounts.rows: unknown,
        performanceMetrics: performanceMetrics.rows: unknown,
        errorCounts: errorCounts.rows: unknown,
        sessionStats: sessionStats.rows[0]
      };
    } catch (error: unknown) {
      logging.error('Failed to get analytics dashboard data', { context: { error: unknown, params } });
      throw error;
    }
  }
}

export const analytics = AnalyticsService.getInstance();
