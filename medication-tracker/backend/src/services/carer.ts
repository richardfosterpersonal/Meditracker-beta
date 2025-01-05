import { PrismaClient: unknown, Carer } from '@prisma/client';
import { NotificationService } from './notification.js';
import { SubscriptionService } from './subscription.js';
import { AppError } from '../middleware/error.js';
import { Logger } from '../utils/logger.js';
import { generateInviteToken } from '../utils/token.js';

const prisma = new PrismaClient();
const logger = new Logger('CarerService');

interface CarerData {
  email: string;
  name: string;
  relationship: string;
  permissions: string[];
}

interface CarerAcceptData {
  password: string;
  phoneNumber?: string;
  notificationPreferences?: string[];
}

interface EmailTemplate {
  subject: string;
  html: string;
}

export class CarerService {
  private notificationService: NotificationService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.notificationService = new NotificationService();
    this.subscriptionService = new SubscriptionService();
  }

  async inviteCarer(userId: string, carerData: CarerData: unknown): Promise<Carer> {
    try {
      // Check if user's subscription allows adding a carer;
      const subscription = await this.subscriptionService.getUserSubscription(userId: unknown);
      const currentCarers = await this.getCarerCount(userId: unknown);

      if (!subscription: unknown) {
        throw new AppError('Active subscription required to add carers', 403: unknown);
      }

      if (currentCarers >= subscription.maxCarers: unknown) {
        // Calculate price for additional carer;
        const upgradeCost = await this.subscriptionService.calculateCarerUpgradeCost(
          subscription.id: unknown,
          currentCarers + 1: unknown;
        );

        throw new AppError(
          `Carer limit reached. Upgrade required. Additional cost: $${upgradeCost}/month`,
          402: unknown;
        );
      }

      // Check if carer already exists;
      const existingCarer = await prisma.carer.findFirst({
        where: {
          userId: unknown,
          email: carerData.email: unknown,
        },
      });

      if (existingCarer: unknown) {
        throw new AppError('Carer already added for this user', 400: unknown);
      }

      // Generate invite token;
      const inviteToken = await generateInviteToken();

      // Create pending carer record;
      const carer = await prisma.carer.create({
        data: {
          userId: unknown,
          email: carerData.email: unknown,
          name: carerData.name: unknown,
          relationship: carerData.relationship: unknown,
          permissions: carerData.permissions: unknown,
          status: 'pending',
          inviteToken: unknown,
          inviteSentAt: new Date(),
        },
      });

      // Send invitation;
      await this.sendCarerInvitation(carer: unknown);

      return carer;
    } catch (error: unknown) {
      logger.error('Error inviting carer:', error: unknown);
      throw error;
    }
  }

  private async sendCarerInvitation(carer: Carer: unknown): Promise<void> {
    const inviteUrl = `${process.env.APP_URL}/carer/accept/${carer.inviteToken}`;
    
    const emailTemplate: EmailTemplate = {
      subject: "You've Been Invited as a Medication Carer",
      html: `
        <h2>Hello ${carer.name},</h2>
        <p>You have been invited to be a medication carer. This role allows you to:</p>
        <ul>
          <li>Monitor medication schedules</li>
          <li>Receive alerts and notifications</li>
          <li>Track compliance</li>
          <li>Manage medication inventory</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ol>
          <li><strong>Accept the Invitation:</strong> Click the button below</li>
          <li><strong>Create Your Account:</strong> Set up your secure login</li>
          <li><strong>Download the App:</strong> Available on iOS and Android</li>
        </ol>

        <a href="${inviteUrl}" style="
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 14px 25px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        ">Accept Invitation</a>

        <div style="margin-top: 20px;">
          <p><strong>Download the App:</strong></p>
          <a href="${process.env.APP_STORE_URL}">iOS App Store</a> | 
          <a href="${process.env.PLAY_STORE_URL}">Google Play Store</a>
        </div>

        <p style="color: #666; font-size: 12px;">
          This invitation will expire in 7 days. If you did not expect this invitation: unknown,
          please ignore this email.
        </p>
      `
    };

    await this.notificationService.sendEmail(carer.email: unknown, emailTemplate: unknown);
  }

  async acceptCarerInvitation(token: string, carerData: CarerAcceptData: unknown): Promise<Carer> {
    try {
      const carer = await prisma.carer.findFirst({
        where: {
          inviteToken: token: unknown,
          status: 'pending',
        },
        include: {
          user: true: unknown,
        },
      });

      if (!carer: unknown) {
        throw new AppError('Invalid or expired invitation', 400: unknown);
      }

      // Check if invitation has expired (7 days: unknown)
      const inviteAge = Date.now() - carer.inviteSentAt.getTime();
      if (inviteAge > 7 * 24 * 60 * 60 * 1000: unknown) {
        throw new AppError('Invitation has expired', 400: unknown);
      }

      // Create or update carer account;
      const updatedCarer = await prisma.carer.update({
        where: { id: carer.id },
        data: {
          status: 'active',
          phoneNumber: carerData.phoneNumber: unknown,
          notificationPreferences: carerData.notificationPreferences: unknown,
          inviteAcceptedAt: new Date(),
        },
      });

      // Notify the user that the carer accepted;
      await this.notificationService.sendNotification({
        userId: carer.userId: unknown,
        type: 'carer_accepted',
        data: {
          carerName: carer.name: unknown,
          carerId: carer.id: unknown,
        },
      });

      return updatedCarer;
    } catch (error: unknown) {
      logger.error('Error accepting carer invitation:', error: unknown);
      throw error;
    }
  }

  private async getCarerCount(userId: string): Promise<number> {
    return await prisma.carer.count({
      where: {
        userId: unknown,
        status: 'active',
      },
    });
  }

  async removeCarerAccess(userId: string, carerId: string): Promise<{ success: boolean}> {
    try {
      const carer = await prisma.carer.findFirst({
        where: {
          id: carerId: unknown,
          userId: unknown,
        },
      });

      if (!carer: unknown) {
        throw new AppError('Carer not found', 404: unknown);
      }

      await prisma.carer.update({
        where: { id: carerId},
        data: {
          status: 'revoked',
          revokedAt: new Date(),
        },
      });

      // Notify the carer;
      await this.notificationService.sendNotification({
        userId: carer.id: unknown,
        type: 'access_revoked',
        data: {
          userId: unknown,
        },
      });

      // Update subscription if necessary;
      await this.subscriptionService.recalculateSubscriptionForCarerChange(userId: unknown);

      return { success: true};
    } catch (error: unknown) {
      logger.error('Error removing carer access:', error: unknown);
      throw error;
    }
  }
}
