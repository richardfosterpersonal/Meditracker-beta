import { getAnalytics, logEvent } from 'firebase/analytics';
import * as firebase from 'firebase/analytics';

interface AnalyticsConfig {
  firebaseConfig: any;
  environment: string;
}

class AnalyticsManager {
  private static instance: AnalyticsManager;
  private initialized: boolean = false;
  private firebaseAnalytics: any = null;
  private environment: string = 'development';

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  public initialize(config: AnalyticsConfig): void {
    if (this.initialized) return;

    this.environment = config.environment;

    // Initialize Firebase Analytics
    const app = firebase.initializeApp(config.firebaseConfig);
    this.firebaseAnalytics = getAnalytics(app);

    this.initialized = true;
    this.trackAppOpen();
  }

  private trackAppOpen(): void {
    this.track('app_opened', {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      app_version: process.env.REACT_APP_VERSION,
    });
  }

  public track(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.initialized) return;

    const enrichedProperties = {
      ...properties,
      environment: this.environment,
      timestamp: new Date().toISOString(),
    };

    logEvent(this.firebaseAnalytics, eventName, enrichedProperties);
  }

  public trackError(error: Error): void {
    this.track('error_occurred', {
      error_message: error.message,
      error_type: error.name,
    });
  }
}

export const analytics = AnalyticsManager.getInstance();

// Core events only
export const AnalyticsEvents = {
  // User events
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // Family events
  FAMILY_MEMBER_INVITED: 'family_member_invited',
  FAMILY_MEMBER_JOINED: 'family_member_joined',

  // Medication events
  MEDICATION_ADDED: 'medication_added',
  MEDICATION_REMINDER_SET: 'medication_reminder_set',

  // Error events
  ERROR_OCCURRED: 'error_occurred',
} as const;
