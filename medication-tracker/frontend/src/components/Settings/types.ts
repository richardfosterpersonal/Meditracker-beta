export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    sms: boolean;
    reminderTime: number;
    missedDoseAlert: boolean;
    lowSupplyAlert: boolean;
    caregiverAlert: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
}

export interface GeneralPreferences {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    highContrastMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
}

export interface UserSettings {
    language: {
        preferred: string;
        fallback: string;
    };
    locale: {
        country: string;
        timezone: string;
        currency: string;
        numberFormat: string;
        dateFormat: string;
        timeFormat: '12h' | '24h';
    };
    emergency: {
        primaryNumber: string;
        showInternationalNumbers: boolean;
        preferredContactMethod: 'CALL' | 'SMS' | 'EMAIL';
    };
    notifications: {
        enabled: boolean;
        methods: {
            push: boolean;
            email: boolean;
            sms: boolean;
        };
        quiet: {
            enabled: boolean;
            start: string;
            end: string;
        };
        medicationReminders: {
            enabled: boolean;
            advance: number;
            repeat: number;
        };
    };
    accessibility: {
        fontSize: 'small' | 'medium' | 'large';
        highContrast: boolean;
        reduceMotion: boolean;
        screenReader: boolean;
    };
    privacy: {
        shareLocation: boolean;
        shareMedData: boolean;
        shareAnalytics: boolean;
        dataRetention: number;
    };
}
