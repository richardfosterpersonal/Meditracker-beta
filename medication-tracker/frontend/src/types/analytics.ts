export interface SanitizationRule {
  type: 'mask' | 'hash' | 'categorize' | 'range' | 'generalize' | 'validate' | 'truncate';
  pattern?: RegExp;
  replacement?: string;
  keepLast?: number;
  algorithm?: string;
  categories?: string[];
  ranges?: string[];
  mappings?: Record<string, string>;
  level?: 'city' | 'state' | 'country';
  allowedTypes?: string[];
  maxLength?: number;
}

export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: string;
  sessionId?: string;
  userId?: string;
}

export interface PerformanceMetric {
  metricName: string;
  value: number;
  timestamp?: string;
  sessionId?: string;
}

export interface ErrorEvent {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  timestamp?: string;
  sessionId?: string;
}

export interface AnalyticsSession {
  id: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  platform?: string;
  deviceType?: string;
  pagesViewed?: number;
}

export interface AnalyticsConsent {
  essential: boolean;
  functional: boolean;
  personalization: boolean;
  lastUpdated: string;
}

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface EventProcessingOptions {
  priority?: EventPriority;
  requiresConsent?: boolean;
  retentionPeriod?: number;
  sanitizationLevel?: 'none' | 'partial' | 'full';
}
