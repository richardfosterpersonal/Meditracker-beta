import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { PrismaClient, User, Medication, EmergencyContact } from '@prisma/client';
import { DateTime } from 'luxon';
import { TYPES } from '@/config/types.js';
import { INotificationService } from '@/interfaces/INotificationService.js';
import { ApiError } from '@/utils/errors.js';
import { monitorPerformance } from '@/utils/monitoring.js';
import { EmergencyLevel, EmergencyStatus, EmergencyAction } from '@/types/emergency.js';

@injectable()
export class EmergencyService {
  private readonly prisma: PrismaClient;
  private readonly emergencyLevels: Record<number, EmergencyLevel> = {
    0: {
      name: 'normal',
      actions: ['notify_user']
    },
    1: {
      name: 'alert',
      actions: ['notify_user', 'notify_family']
    },
    2: {
      name: 'urgent',
      actions: ['notify_user', 'notify_family', 'notify_provider']
    },
    3: {
      name: 'emergency',
      actions: ['notify_all', 'activate_emergency_access']
    }
  };

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.NotificationService) private readonly notificationService: INotificationService
  ) {
    this.prisma = new PrismaClient();
  }

  @monitorPerformance('handle_missed_dose')
  public async handleMissedDose(
    userId: string,
    medicationId: string,
    scheduledTime: Date,
    currentTime: Date
  ): Promise<void> {
    try {
      const status = await this.getEmergencyStatus(userId, medicationId);
      const timeDifference = DateTime.fromJSDate(currentTime)
        .diff(DateTime.fromJSDate(scheduledTime))
        .as('minutes');

      // Escalate based on time difference and missed dose count
      let escalationLevel = 0;
      if (timeDifference > 120 || status.missedDoses > 2) {
        escalationLevel = 2;
      } else if (timeDifference > 60 || status.missedDoses > 1) {
        escalationLevel = 1;
      }

      await this.handleEscalation(userId, medicationId, escalationLevel, 'missed_dose');
    } catch (error) {
      this.logger.error('Error handling missed dose:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to handle missed dose', 500);
    }
  }

  @monitorPerformance('get_emergency_status')
  public async getEmergencyStatus(
    userId: string,
    medicationId: string
  ): Promise<EmergencyStatus> {
    try {
      const missedDoses = await this.prisma.missedDose.count({
        where: {
          userId,
          medicationId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return {
        escalationLevel: this.calculateEscalationLevel(missedDoses),
        missedDoses
      };
    } catch (error) {
      this.logger.error('Error getting emergency status:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to get emergency status', 500);
    }
  }

  @monitorPerformance('notify_emergency_contacts')
  private async notifyEmergencyContacts(
    userId: string,
    medicationId: string,
    reason: string
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { emergencyContacts: true }
      });

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      const medication = await this.prisma.medication.findUnique({
        where: { id: medicationId }
      });

      if (!medication) {
        throw new ApiError('Medication not found', 404);
      }

      for (const contact of user.emergencyContacts) {
        await this.notificationService.sendEmergencyNotification({
          userId: contact.id,
          medicationId,
          reason,
          data: {
            patientName: user.name,
            medicationName: medication.name,
            contactPhone: contact.phone
          }
        });
      }
    } catch (error) {
      this.logger.error('Error notifying emergency contacts:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to notify emergency contacts', 500);
    }
  }

  @monitorPerformance('handle_escalation')
  private async handleEscalation(
    userId: string,
    medicationId: string,
    level: number,
    reason: string
  ): Promise<void> {
    try {
      const actions = this.emergencyLevels[level]?.actions || [];
      
      for (const action of actions) {
        switch (action) {
          case 'notify_user':
            await this.notificationService.sendEmergencyNotification({
              userId,
              medicationId,
              reason,
              priority: 'high'
            });
            break;
          
          case 'notify_family':
            await this.notifyEmergencyContacts(userId, medicationId, reason);
            break;
          
          case 'notify_provider':
            await this.notificationService.sendEmergencyNotification({
              userId,
              medicationId,
              reason,
              priority: 'urgent',
              notifyProvider: true
            });
            break;
          
          case 'notify_all':
            await Promise.all([
              this.notificationService.sendEmergencyNotification({
                userId,
                medicationId,
                reason,
                priority: 'emergency'
              }),
              this.notifyEmergencyContacts(userId, medicationId, reason),
              this.notificationService.sendEmergencyNotification({
                userId,
                medicationId,
                reason,
                priority: 'emergency',
                notifyProvider: true
              })
            ]);
            break;
        }
      }
    } catch (error) {
      this.logger.error('Error handling escalation:', error);
      throw error instanceof ApiError ? error : new ApiError('Failed to handle escalation', 500);
    }
  }

  private calculateEscalationLevel(missedDoses: number): number {
    if (missedDoses >= 3) return 3;
    if (missedDoses >= 2) return 2;
    if (missedDoses >= 1) return 1;
    return 0;
  }
}
