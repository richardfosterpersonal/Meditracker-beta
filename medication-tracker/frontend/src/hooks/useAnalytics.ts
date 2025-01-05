import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analytics';

export const useAnalytics = () => {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  // Utility function to track custom events
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    analytics.trackEvent({ eventName, properties });
  }, []);

  // Utility function to track performance metrics
  const trackPerformance = useCallback((metricName: string, value: number) => {
    analytics.trackPerformance(metricName, value);
  }, []);

  return {
    trackEvent,
    trackPerformance
  };
};

// Common event names to ensure consistency across the app
export const AnalyticsEvents = {
  // Medication events
  MEDICATION_ADDED: 'medication_added',
  MEDICATION_UPDATED: 'medication_updated',
  MEDICATION_DELETED: 'medication_deleted',
  MEDICATION_TAKEN: 'medication_taken',
  MEDICATION_SKIPPED: 'medication_skipped',
  MEDICATION_REFILLED: 'medication_refilled',
  
  // User events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',
  USER_SETTINGS_UPDATED: 'user_settings_updated',
  
  // Notification events
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_DISABLED: 'notification_disabled',
  NOTIFICATION_SETTINGS_UPDATED: 'notification_settings_updated',
  
  // Feature usage events
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  REPORT_GENERATED: 'report_generated',
  EXPORT_DATA: 'export_data',
  
  // UI interaction events
  MODAL_OPENED: 'modal_opened',
  MODAL_CLOSED: 'modal_closed',
  BUTTON_CLICKED: 'button_clicked',
  FORM_SUBMITTED: 'form_submitted',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error'
} as const;
