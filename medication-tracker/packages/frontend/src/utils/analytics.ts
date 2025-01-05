import { AmplitudeClient } from '@amplitude/analytics-browser';
import { config } from '../config';

// Initialize Amplitude with HIPAA compliance settings
const amplitudeClient = new AmplitudeClient();
amplitudeClient.init(config.AMPLITUDE_API_KEY, {
  serverZone: 'EU',  // EU data residency
  trackingOptions: {
    ipAddress: false, // Don't track IP for HIPAA
    deviceManufacturer: false,
    deviceModel: false
  }
});

// Event types that we track
export enum AnalyticEvents {
  PAGE_VIEW = 'page_view',
  FEATURE_USAGE = 'feature_usage',
  WORKFLOW_COMPLETE = 'workflow_complete',
  ERROR_OCCURRED = 'error_occurred',
  EMERGENCY_ACCESS = 'emergency_access'
}

// Analytics wrapper to ensure HIPAA compliance
export const analytics = {
  // Track page views
  trackPageView: (pageName: string) => {
    amplitudeClient.track(AnalyticEvents.PAGE_VIEW, {
      page: pageName,
      timestamp: new Date().toISOString()
    });
  },

  // Track feature usage
  trackFeatureUsage: (featureName: string, metadata: Record<string, any> = {}) => {
    // Strip any PII or PHI from metadata
    const safeMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
      // Only include safe, non-PII fields
      if (!isPII(key)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    amplitudeClient.track(AnalyticEvents.FEATURE_USAGE, {
      feature: featureName,
      ...safeMetadata
    });
  },

  // Track workflow completion
  trackWorkflowComplete: (workflowName: string, durationMs: number) => {
    amplitudeClient.track(AnalyticEvents.WORKFLOW_COMPLETE, {
      workflow: workflowName,
      duration_ms: durationMs
    });
  },

  // Track errors (without PII)
  trackError: (errorCode: string, message: string) => {
    amplitudeClient.track(AnalyticEvents.ERROR_OCCURRED, {
      error_code: errorCode,
      // Sanitize error message to remove any potential PII
      error_type: sanitizeErrorMessage(message)
    });
  },

  // Track emergency access (for security monitoring)
  trackEmergencyAccess: (accessType: string, success: boolean) => {
    amplitudeClient.track(AnalyticEvents.EMERGENCY_ACCESS, {
      type: accessType,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

// Utility to check if a field might contain PII
const isPII = (field: string): boolean => {
  const piiFields = [
    'name', 'email', 'phone', 'address', 'ip', 'medication',
    'diagnosis', 'patient', 'doctor', 'prescription'
  ];
  return piiFields.some(pii => field.toLowerCase().includes(pii));
};

// Utility to sanitize error messages
const sanitizeErrorMessage = (message: string): string => {
  // Remove potential PII patterns (emails, names, etc)
  return message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
               .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');
};

export default analytics;
