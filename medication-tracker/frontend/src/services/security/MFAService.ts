import { api } from '../../api/api';
import { EventTrackingService } from '../monitoring/EventTrackingService';

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerifyResponse {
  valid: boolean;
  remainingAttempts?: number;
}

export class MFAService {
  private static instance: MFAService;
  private eventTracking: EventTrackingService;
  private readonly MAX_ATTEMPTS = 3;
  private attemptCounts: Map<string, number>;

  private constructor() {
    this.eventTracking = EventTrackingService.getInstance();
    this.attemptCounts = new Map();
  }

  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  /**
   * Set up MFA for a user
   * @param userId User ID
   * @returns MFA setup information including secret and backup codes
   */
  public async setupMFA(userId: string): Promise<MFASetupResponse> {
    try {
      const response = await api.post('/auth/mfa/setup', { userId });
      
      await this.eventTracking.trackEvent({
        type: 'MFA_SETUP',
        category: 'security',
        action: 'setup',
        metadata: {
          userId,
          timestamp: new Date().toISOString()
        }
      });

      return response.data;
    } catch (error) {
      console.error('MFA setup failed:', error);
      throw new Error('Failed to set up MFA');
    }
  }

  /**
   * Verify MFA code
   * @param userId User ID
   * @param code MFA code
   * @returns Verification result
   */
  public async verifyCode(userId: string, code: string): Promise<MFAVerifyResponse> {
    try {
      const attempts = this.attemptCounts.get(userId) || 0;
      
      if (attempts >= this.MAX_ATTEMPTS) {
        await this.eventTracking.trackEvent({
          type: 'MFA_LOCKED',
          category: 'security',
          action: 'locked',
          metadata: {
            userId,
            timestamp: new Date().toISOString()
          }
        });
        
        throw new Error('Too many failed attempts. Please try again later.');
      }

      const response = await api.post('/auth/mfa/verify', { userId, code });
      
      if (response.data.valid) {
        this.attemptCounts.delete(userId);
        await this.eventTracking.trackEvent({
          type: 'MFA_SUCCESS',
          category: 'security',
          action: 'verify',
          metadata: {
            userId,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        this.attemptCounts.set(userId, attempts + 1);
        await this.eventTracking.trackEvent({
          type: 'MFA_FAILED',
          category: 'security',
          action: 'verify',
          metadata: {
            userId,
            attempts: attempts + 1,
            timestamp: new Date().toISOString()
          }
        });
      }

      return {
        valid: response.data.valid,
        remainingAttempts: this.MAX_ATTEMPTS - (attempts + 1)
      };
    } catch (error) {
      console.error('MFA verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify backup code
   * @param userId User ID
   * @param backupCode Backup code
   * @returns Verification result
   */
  public async verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
    try {
      const response = await api.post('/auth/mfa/verify-backup', { userId, backupCode });
      
      await this.eventTracking.trackEvent({
        type: 'MFA_BACKUP_USED',
        category: 'security',
        action: 'verify_backup',
        metadata: {
          userId,
          timestamp: new Date().toISOString()
        }
      });

      return response.data.valid;
    } catch (error) {
      console.error('Backup code verification failed:', error);
      throw new Error('Failed to verify backup code');
    }
  }

  /**
   * Reset MFA attempts counter
   * @param userId User ID
   */
  public resetAttempts(userId: string): void {
    this.attemptCounts.delete(userId);
  }

  /**
   * Disable MFA for a user
   * @param userId User ID
   * @returns Success status
   */
  public async disableMFA(userId: string): Promise<boolean> {
    try {
      const response = await api.post('/auth/mfa/disable', { userId });
      
      await this.eventTracking.trackEvent({
        type: 'MFA_DISABLED',
        category: 'security',
        action: 'disable',
        metadata: {
          userId,
          timestamp: new Date().toISOString()
        }
      });

      return response.data.success;
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      throw new Error('Failed to disable MFA');
    }
  }
}
