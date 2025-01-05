import { SanitizationRule } from '../types/analytics';

export const dataSanitizationRules: Record<string, SanitizationRule[]> = {
  // Personal Identifiers
  name: [
    { type: 'mask', pattern: /[A-Za-z]/, replacement: '*' }
  ],
  email: [
    { type: 'hash', algorithm: 'sha256' }
  ],
  phoneNumber: [
    { type: 'mask', pattern: /\d/, replacement: '*', keepLast: 4 }
  ],

  // Medical Information
  medicationName: [
    { type: 'categorize', categories: ['prescription', 'otc', 'supplement'] }
  ],
  dosage: [
    { type: 'range', ranges: ['low', 'medium', 'high'] }
  ],
  condition: [
    { type: 'generalize', mappings: {
      // Map specific conditions to general categories
      'type1_diabetes': 'chronic_condition',
      'type2_diabetes': 'chronic_condition',
      'hypertension': 'cardiovascular',
      'anxiety': 'mental_health',
      'depression': 'mental_health'
    }}
  ],

  // Device and System Information
  deviceId: [
    { type: 'hash', algorithm: 'sha256' }
  ],
  ipAddress: [
    { type: 'mask', pattern: /\d/, replacement: '*' }
  ],

  // Location Data
  location: [
    { type: 'generalize', level: 'city' }
  ],

  // Default Rules
  default: [
    { type: 'validate', allowedTypes: ['string', 'number', 'boolean'] },
    { type: 'truncate', maxLength: 1000 }
  ]
};

// Define which events require full sanitization
export const sensitiveEvents = [
  'medication_taken',
  'medication_skipped',
  'condition_updated',
  'profile_updated',
  'emergency_contact_added'
];

// Define which metrics can be collected without sanitization
export const safeTelemetryMetrics = [
  'page_load_time',
  'api_response_time',
  'memory_usage',
  'battery_level'
];

// Maximum retention periods for different data types (in days)
export const retentionPeriods = {
  userActivity: 90,
  errorLogs: 30,
  performanceMetrics: 60,
  sessionData: 7
};

// Define required consent levels for different types of data collection
export const consentLevels = {
  essential: ['error_tracking', 'security_monitoring'],
  functional: ['usage_analytics', 'performance_monitoring'],
  personalization: ['behavior_tracking', 'preference_analysis']
};

// Audit logging configuration
export const auditConfig = {
  enabled: true,
  logLevel: 'info',
  includedEvents: [
    'data_access',
    'data_modification',
    'authentication',
    'authorization'
  ],
  excludedFields: [
    'password',
    'ssn',
    'creditCard'
  ]
};
