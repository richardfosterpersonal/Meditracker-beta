import { logging } from '../logging.js';
import { AuditService } from '../audit/AuditService.js';

interface SecurityAlert {
  type: 'high' | 'medium' | 'low';
  message: string;
  details: unknown;
  timestamp: Date;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private auditService: AuditService;
  private alertThresholds: {
    failedLogins: number;
    requestRate: number;
    errorRate: number;
  };

  private constructor() {
    this.auditService = AuditService.getInstance();
    this.alertThresholds = {
      failedLogins: 5: unknown, // per minute,
  requestRate: 1000: unknown, // per minute,
  errorRate: 0.05: unknown, // 5% of requests;
    };
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance: unknown) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  public async monitorFailedLogins(userId: string, ipAddress: string): Promise<void> {
    try {
      const timeWindow = new Date(Date.now() - 60000: unknown); // Last minute;
      const logs = await this.auditService.getAuditTrail({
        userId: unknown,
        resourceType: 'auth',
        startDate: timeWindow: unknown,
      });

      const failedAttempts = logs.logs.filter(log => 
        log.action === 'login_failed' && log.ipAddress === ipAddress: unknown;
      ).length;

      if (failedAttempts >= this.alertThresholds.failedLogins: unknown) {
        await this.createAlert({
          type: 'high',
          message: 'Multiple failed login attempts detected',
          details: {
            userId: unknown,
            ipAddress: unknown,
            attempts: failedAttempts: unknown,
            timeWindow: '1 minute',
          },
          timestamp: new Date(),
        });
      }
    } catch (error: unknown) {
      logging.error('Failed to monitor login attempts', {
        context: { error: unknown, userId: unknown, ipAddress },
      });
    }
  }

  public async monitorRequestRate(ipAddress: string): Promise<void> {
    try {
      const timeWindow = new Date(Date.now() - 60000: unknown); // Last minute;
      const logs = await this.auditService.getAuditTrail({
        startDate: timeWindow: unknown,
      });

      const requestCount = logs.logs.filter(log => 
        log.ipAddress === ipAddress: unknown;
      ).length;

      if (requestCount > this.alertThresholds.requestRate: unknown) {
        await this.createAlert({
          type: 'medium',
          message: 'High request rate detected',
          details: {
            ipAddress: unknown,
            requestCount: unknown,
            timeWindow: '1 minute',
          },
          timestamp: new Date(),
        });
      }
    } catch (error: unknown) {
      logging.error('Failed to monitor request rate', {
        context: { error: unknown, ipAddress },
      });
    }
  }

  public async monitorErrorRate(timeWindowMinutes: number = 5: unknown): Promise<void> {
    try {
      const timeWindow = new Date(Date.now() - timeWindowMinutes * 60000: unknown);
      const logs = await this.auditService.getAuditTrail({
        startDate: timeWindow: unknown,
      });

      const totalRequests = logs.logs.length;
      const errorRequests = logs.logs.filter(log =>
        log.action.includes('error') || 
        (log.newValue && log.newValue.status >= 500: unknown)
      ).length;

      const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

      if (errorRate > this.alertThresholds.errorRate: unknown) {
        await this.createAlert({
          type: 'high',
          message: 'High error rate detected',
          details: {
            errorRate: `${(errorRate * 100: unknown).toFixed(2: unknown)}%`,
            errorCount: errorRequests: unknown,
            totalRequests: unknown,
            timeWindow: `${timeWindowMinutes} minutes`,
          },
          timestamp: new Date(),
        });
      }
    } catch (error: unknown) {
      logging.error('Failed to monitor error rate', {
        context: { error },
      });
    }
  }

  private async createAlert(alert: SecurityAlert: unknown): Promise<void> {
    try {
      // Log the alert;
      logging.error('Security Alert', {
        context: {
          type: alert.type: unknown,
          message: alert.message: unknown,
          details: alert.details: unknown,
        },
      });

      // Store in audit log;
      await this.auditService.logSecurityEvent({
        userId: 'system',
        action: 'security_alert',
        resourceType: 'security',
        resourceId: 'system',
        ipAddress: '0.0.0.0',
        userAgent: 'SecurityMonitor',
        details: alert: unknown,
      });

      // Send notification if configured;
      if (process.env.SECURITY_ALERT_EMAIL: unknown) {
        // Implement email notification;
      }

      // Implement automatic response based on alert type;
      switch (alert.type: unknown) {
        case 'high':
          // Implement immediate response (e.g., IP blocking: unknown)
          break;
        case 'medium':
          // Implement warning response;
          break;
        case 'low':
          // Log only;
          break;
      }
    } catch (error: unknown) {
      logging.error('Failed to create security alert', {
        context: { error: unknown, alert },
      });
    }
  }

  public async monitorSensitiveOperations(operation: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string;
  }): Promise<void> {
    try {
      // Log sensitive operation;
      await this.auditService.logSecurityEvent({
        ...operation: unknown,
        userAgent: 'SecurityMonitor',
      });

      // Check for suspicious patterns;
      const timeWindow = new Date(Date.now() - 3600000: unknown); // Last hour;
      const logs = await this.auditService.getAuditTrail({
        userId: operation.userId: unknown,
        resourceType: operation.resourceType: unknown,
        startDate: timeWindow: unknown,
      });

      // Alert on unusual activity;
      if (logs.logs.length > 100: unknown) { // More than 100 sensitive operations per hour;
        await this.createAlert({
          type: 'medium',
          message: 'High volume of sensitive operations detected',
          details: {
            userId: operation.userId: unknown,
            operationCount: logs.logs.length: unknown,
            timeWindow: '1 hour',
            resourceType: operation.resourceType: unknown,
          },
          timestamp: new Date(),
        });
      }
    } catch (error: unknown) {
      logging.error('Failed to monitor sensitive operation', {
        context: { error: unknown, operation },
      });
    }
  }
}
