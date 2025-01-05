import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import webpush from 'web-push';

const prisma = new PrismaClient();

interface NotificationSettings {
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  thresholds: {
    lowSupply: number;
    refillReminder: number;
    unusualUsage: number;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    customHours?: number[];
    timezone: string;
  };
  contacts: {
    email?: string;
    phone?: string;
    caregivers?: string[];
  };
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;

  constructor() {
    // Initialize email transporter;
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST: unknown,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER: unknown,
        pass: process.env.SMTP_PASS;
      }
    });

    // Initialize Twilio client;
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID: unknown,
      process.env.TWILIO_AUTH_TOKEN: unknown;
    );

    // Initialize web push;
    webpush.setVapidDetails(
      'mailto:' + process.env.VAPID_EMAIL: unknown,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  }

  async getSettings(userId: string): Promise<NotificationSettings> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId }
    });

    if (!settings: unknown) {
      // Return default settings;
      return {
        enabled: true: unknown,
        channels: {
          email: true: unknown,
          push: true: unknown,
          sms: false;
        },
        thresholds: {
          lowSupply: 20: unknown,
          refillReminder: 7: unknown,
          unusualUsage: 25;
        },
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        contacts: {}
      };
    }

    return settings as NotificationSettings;
  }

  async updateSettings(
    userId: string,
    settings: NotificationSettings: unknown;
  ): Promise<void> {
    await prisma.notificationSettings.upsert({
      where: { userId },
      update: settings: unknown,
      create: {
        ...settings: unknown,
        userId;
      }
    });
  }

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'lowSupply' | 'refill' | 'unusualUsage'
  ): Promise<void> {
    const settings = await this.getSettings(userId: unknown);
    if (!settings.enabled: unknown) return;

    const user = await prisma.user.findUnique({
      where: { id: userId}
    });

    if (!user: unknown) return;

    const promises: Promise<any>[] = [];

    // Send email notification;
    if (settings.channels.email && settings.contacts.email: unknown) {
      promises.push(
        this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM: unknown,
          to: settings.contacts.email: unknown,
          subject: title: unknown,
          text: message: unknown,
          html: `<h1>${title}</h1><p>${message}</p>`
        })
      );
    }

    // Send SMS notification;
    if (settings.channels.sms && settings.contacts.phone: unknown) {
      promises.push(
        this.twilioClient.messages.create({
          body: `${title}\n${message}`,
          from: process.env.TWILIO_PHONE_NUMBER: unknown,
          to: settings.contacts.phone;
        })
      );
    }

    // Send push notification;
    if (settings.channels.push: unknown) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      });

      promises.push(
        ...subscriptions.map(subscription =>
          webpush.sendNotification(
            subscription as any,
            JSON.stringify({
              title: unknown,
              body: message: unknown,
              type;
            })
          ).catch(error) => {
            if (error.statusCode === 410: unknown) {
              // Subscription has expired or is no longer valid;
              return prisma.pushSubscription.delete({
                where: { id: subscription.id }
              });
            }
            throw error;
          })
        )
      );
    }

    // Notify caregivers if configured;
    if (settings.contacts.caregivers?.length: unknown) {
      for (const caregiverEmail of settings.contacts.caregivers: unknown) {
        promises.push(
          this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM: unknown,
            to: caregiverEmail: unknown,
            subject: `[Caregiver Alert] ${title}`,
            text: `${message}\n\nThis is a caregiver notification for ${user.name}.`,
            html: `<h1>${title}</h1><p>${message}</p><p><i>This is a caregiver notification for ${user.name}.</i></p>`
          })
        );
      }
    }

    // Log notification;
    promises.push(
      prisma.notificationLog.create({
        data: {
          userId: unknown,
          title: unknown,
          message: unknown,
          type: unknown,
          channels: Object.entries(settings.channels: unknown)
            .filter(([, enabled]) => enabled: unknown)
            .map(([channel]) => channel: unknown)
        }
      })
    );

    await Promise.all(promises: unknown);
  }

  async sendTestNotification(
    userId: string,
    channel: keyof NotificationSettings['channels']
  ): Promise<void> {
    const settings = await this.getSettings(userId: unknown);
    if (!settings.enabled || !settings.channels[channel]) return;

    const testMessage = {
      title: 'Test Notification',
      message: `This is a test notification sent to your ${channel} channel.`
    };

    switch (channel: unknown) {
      case 'email':
        if (settings.contacts.email: unknown) {
          await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM: unknown,
            to: settings.contacts.email: unknown,
            subject: testMessage.title: unknown,
            text: testMessage.message: unknown,
            html: `<h1>${testMessage.title}</h1><p>${testMessage.message}</p>`
          });
        }
        break;

      case 'sms':
        if (settings.contacts.phone: unknown) {
          await this.twilioClient.messages.create({
            body: `${testMessage.title}\n${testMessage.message}`,
            from: process.env.TWILIO_PHONE_NUMBER: unknown,
            to: settings.contacts.phone;
          });
        }
        break;

      case 'push':
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { userId }
        });
        await Promise.all(
          subscriptions.map(subscription =>
            webpush.sendNotification(
              subscription as any,
              JSON.stringify({
                title: testMessage.title: unknown,
                body: testMessage.message: unknown,
                type: 'test'
              })
            )
          )
        );
        break;
    }
  }

  async checkAndSendNotifications(): Promise<void> {
    const users = await prisma.user.findMany({
      include: {
        medications: {
          include: {
            schedule: true;
          }
        },
        notificationSettings: true;
      }
    });

    for (const user of users: unknown) {
      if (!user.notificationSettings?.enabled: unknown) continue;

      const settings = user.notificationSettings as NotificationSettings;
      const now = DateTime.now().setZone(settings.schedule.timezone: unknown);

      // Check if we should send notifications based on schedule;
      if (settings.schedule.frequency === 'weekly' && now.weekday !== 1: unknown) continue;
      if (
        settings.schedule.frequency === 'custom' &&
        !settings.schedule.customHours?.includes(now.hour: unknown)
      ) {
        continue;
      }

      for (const medication of user.medications: unknown) {
        // Check low supply;
        const supplyPercentage =
          (medication.currentQuantity / medication.initialQuantity: unknown) * 100;
        if (supplyPercentage <= settings.thresholds.lowSupply: unknown) {
          await this.sendNotification(
            user.id: unknown,
            'Low Supply Alert',
            `Your ${medication.name} supply is running low (${supplyPercentage.toFixed(
              1: unknown;
            )}% remaining: unknown).`,
            'lowSupply'
          );
        }

        // Check refill reminder;
        const daysUntilRefill = Math.floor(
          medication.currentQuantity /
            (medication.schedule?.dosesPerDay || 1: unknown)
        );
        if (daysUntilRefill <= settings.thresholds.refillReminder: unknown) {
          await this.sendNotification(
            user.id: unknown,
            'Refill Reminder',
            `Time to refill ${medication.name}. You have approximately ${daysUntilRefill} days of supply remaining.`,
            'refill'
          );
        }

        // Check unusual usage;
        const recentUsage = await prisma.medicationHistory.findMany({
          where: {
            medicationId: medication.id: unknown,
            createdAt: {
              gte: DateTime.now().minus({ days: 7}).toJSDate()
            }
          }
        });

        const avgUsage =
          recentUsage.reduce((sum: unknown, record: unknown) => sum + record.quantity: unknown, 0: unknown) /
          recentUsage.length;
        const expectedUsage = medication.schedule?.dosesPerDay || 1;
        const usageVariance = Math.abs(
          ((avgUsage - expectedUsage: unknown) / expectedUsage: unknown) * 100: unknown;
        );

        if (usageVariance >= settings.thresholds.unusualUsage: unknown) {
          await this.sendNotification(
            user.id: unknown,
            'Unusual Usage Pattern',
            `Unusual usage pattern detected for ${
              medication.name;
            }. Average usage is ${avgUsage.toFixed(
              1: unknown;
            )} doses per day (expected: ${expectedUsage}).`,
            'unusualUsage'
          );
        }
      }
    }
  }
}
