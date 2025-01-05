import { analytics } from './analytics';
import { format } from 'date-fns';

interface UserConsent {
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  version: string;
  consents: {
    termsOfService: boolean;
    privacyPolicy: boolean;
    dataProcessing: boolean;
    healthDataHandling: boolean;
  };
}

interface AuditLog {
  timestamp: string;
  action: string;
  userId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
}

class LiabilityProtection {
  private static instance: LiabilityProtection;
  private auditLogs: AuditLog[] = [];
  private readonly CRITICAL_ACTIONS = [
    'MEDICATION_CHANGE',
    'DOSAGE_UPDATE',
    'PERMISSION_CHANGE',
    'HEALTH_DATA_ACCESS',
    'FAMILY_MEMBER_ADD',
    'EMERGENCY_CONTACT_UPDATE'
  ];

  private constructor() {}

  public static getInstance(): LiabilityProtection {
    if (!LiabilityProtection.instance) {
      LiabilityProtection.instance = new LiabilityProtection();
    }
    return LiabilityProtection.instance;
  }

  // Track explicit user consent with detailed metadata
  public recordUserConsent(userId: string, consents: UserConsent['consents']): void {
    const consentRecord: UserConsent = {
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      version: process.env.REACT_APP_VERSION || 'unknown',
      consents
    };

    // Store consent record securely
    this.logToSecureAudit('USER_CONSENT', userId, consentRecord);
    
    // Track for analytics
    analytics.track('user_consent_recorded', {
      userId,
      consentTypes: Object.keys(consents).filter(key => consents[key]),
      timestamp: consentRecord.timestamp
    });
  }

  // Log all critical actions for liability protection
  public logCriticalAction(
    action: string,
    userId: string,
    details: any,
    requiresAcknowledgment: boolean = false
  ): void {
    if (this.CRITICAL_ACTIONS.includes(action)) {
      const auditLog: AuditLog = {
        timestamp: new Date().toISOString(),
        action,
        userId,
        details,
        ipAddress: this.getClientIP(),
        userAgent: navigator.userAgent
      };

      // Secure audit logging
      this.logToSecureAudit(action, userId, auditLog);

      // For highly critical actions, require explicit acknowledgment
      if (requiresAcknowledgment) {
        this.requireExplicitAcknowledgment(action, userId, details);
      }

      // Real-time notification for critical health-related changes
      if (this.isHealthRelatedAction(action)) {
        this.notifyHealthDataChange(action, userId, details);
      }
    }
  }

  // Require explicit acknowledgment for critical changes
  private requireExplicitAcknowledgment(action: string, userId: string, details: any): void {
    const acknowledgment = {
      action,
      timestamp: new Date().toISOString(),
      userId,
      details,
      acknowledged: false
    };

    // Store pending acknowledgment
    this.storePendingAcknowledgment(acknowledgment);
  }

  // Verify and log health data access
  public logHealthDataAccess(
    userId: string,
    accessType: 'READ' | 'WRITE',
    dataType: string
  ): void {
    const accessLog = {
      timestamp: new Date().toISOString(),
      userId,
      accessType,
      dataType,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      permissionLevel: this.getUserPermissionLevel(userId)
    };

    // Log access attempt
    this.logToSecureAudit('HEALTH_DATA_ACCESS', userId, accessLog);

    // Additional logging for write operations
    if (accessType === 'WRITE') {
      this.logCriticalAction('HEALTH_DATA_MODIFICATION', userId, {
        dataType,
        timestamp: accessLog.timestamp
      }, true);
    }
  }

  // Generate liability waiver for specific actions
  public generateLiabilityWaiver(action: string, userId: string): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    return `
      LIABILITY WAIVER AND ACKNOWLEDGMENT
      
      Date: ${timestamp}
      User ID: ${userId}
      Action: ${action}
      
      I acknowledge and understand that:
      
      1. The medication tracking system is a support tool and not a replacement for professional medical advice.
      2. All medication decisions should be verified with healthcare providers.
      3. The system may experience technical issues or delays.
      4. I am responsible for verifying all information accuracy.
      5. Emergency services should be contacted for urgent medical situations.
      
      By proceeding with this action, I accept these terms and waive liability claims against the system provider
      for issues arising from proper system use.
      
      [User Electronic Signature]
      IP: ${this.getClientIP()}
      Timestamp: ${timestamp}
    `;
  }

  // Log potential liability issues
  public logLiabilityRisk(
    riskType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    details: any
  ): void {
    const risk = {
      timestamp: new Date().toISOString(),
      riskType,
      severity,
      details,
      systemState: this.captureSystemState()
    };

    this.logToSecureAudit('LIABILITY_RISK', 'SYSTEM', risk);

    // Immediate notification for high-severity risks
    if (severity === 'HIGH') {
      this.notifyLiabilityRisk(risk);
    }
  }

  private isHealthRelatedAction(action: string): boolean {
    return action.includes('MEDICATION') || 
           action.includes('HEALTH') || 
           action.includes('DOSAGE');
  }

  private logToSecureAudit(action: string, userId: string, details: any): void {
    const log = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      systemVersion: process.env.REACT_APP_VERSION,
      environment: process.env.NODE_ENV
    };

    // Store in secure audit log
    this.auditLogs.push(log);

    // Backup to secure storage
    this.backupAuditLog(log);
  }

  private getClientIP(): string {
    // Implement secure IP detection
    return 'IP_ADDRESS';
  }

  private getUserPermissionLevel(userId: string): string {
    // Implement permission level check
    return 'PERMISSION_LEVEL';
  }

  private captureSystemState(): any {
    // Capture relevant system state for liability documentation
    return {
      timestamp: new Date().toISOString(),
      version: process.env.REACT_APP_VERSION,
      environment: process.env.NODE_ENV
    };
  }

  private backupAuditLog(log: any): void {
    // Implement secure backup
    console.log('Backing up audit log:', log);
  }

  private storePendingAcknowledgment(acknowledgment: any): void {
    // Implement secure storage
    console.log('Storing pending acknowledgment:', acknowledgment);
  }

  private notifyHealthDataChange(action: string, userId: string, details: any): void {
    // Implement notification
    console.log('Health data change notification:', { action, userId, details });
  }

  private notifyLiabilityRisk(risk: any): void {
    // Implement notification
    console.log('Liability risk notification:', risk);
  }
}

export const liabilityProtection = LiabilityProtection.getInstance();
