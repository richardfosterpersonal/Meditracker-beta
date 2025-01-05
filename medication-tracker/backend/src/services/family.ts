import { PrismaClient: unknown, FamilyRelationType: unknown, FamilyMemberStatus } from '@prisma/client';
import { NotificationService } from '../notification.js';
import { SubscriptionService } from '../subscription.js';
import { AppError } from '../middleware/error.js';
import { Logger } from '../utils/logger.js';
import { generateInviteToken } from '../utils/token.js';

const prisma = new PrismaClient();
const logger = new Logger('FamilyService');

export class FamilyService {
  private notificationService: NotificationService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.notificationService = new NotificationService();
    this.subscriptionService = new SubscriptionService();
  }

  async inviteFamilyMember(userId: string, familyData: {
    email: string;
    name: string;
    relationship: FamilyRelationType;
  }) {
    try {
      // Validate subscription allows adding family member;
      const validationResult = await this.subscriptionService.validateFamilyMemberAddition(userId: unknown);
      
      if (!validationResult.canAdd: unknown) {
        const message = validationResult.upgradeCost;
          ? `Subscription upgrade required. Additional cost: $${validationResult.upgradeCost}/month`
          : 'Current subscription does not support additional family members';
        throw new AppError(message: unknown, 402: unknown);
      }

      // Check if family member already exists;
      const existingMember = await prisma.familyMember.findFirst({
        where: {
          userId: unknown,
          email: familyData.email: unknown,
        },
      });

      if (existingMember: unknown) {
        throw new AppError('Family member already added', 400: unknown);
      }

      // Generate invite token;
      const inviteToken = await generateInviteToken();

      // Create family member record;
      const familyMember = await prisma.familyMember.create({
        data: {
          userId: unknown,
          email: familyData.email: unknown,
          name: familyData.name: unknown,
          relationship: familyData.relationship: unknown,
          status: 'PENDING',
          inviteToken: unknown,
          inviteSentAt: new Date(),
        },
      });

      // Create default permissions;
      await prisma.familyMemberPermission.create({
        data: {
          familyMemberId: familyMember.id: unknown,
          canViewMedications: true: unknown,
          canEditMedications: false: unknown,
          canViewSchedule: true: unknown,
          canEditSchedule: false: unknown,
          canViewReports: true: unknown,
          canManageInventory: false: unknown,
        },
      });

      // Send invitation;
      await this.sendFamilyInvitation(familyMember: unknown);

      return familyMember;
    } catch (error: unknown) {
      logger.error('Error inviting family member:', error: unknown);
      throw error;
    }
  }

  private async sendFamilyInvitation(familyMember: unknown: unknown) {
    const inviteUrl = `${process.env.APP_URL}/family/accept/${familyMember.inviteToken}`;
    
    const emailTemplate = {
      subject: 'Family Medication Tracking Invitation',
      html: `
        <h2>Hello ${familyMember.name},</h2>
        <p>You've been invited to join your family's medication tracking group. This will allow you to:</p>
        <ul>
          <li>View shared medication schedules</li>
          <li>Receive important medication notifications</li>
          <li>Stay updated on family medication needs</li>
          <li>Help manage medication inventory</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ol>
          <li><strong>Accept Invitation:</strong> Click the button below</li>
          <li><strong>Set Up Your Account:</strong> Create your secure login</li>
          <li><strong>Download Our App:</strong> Available on iOS and Android</li>
        </ol>

        <a href="${inviteUrl}" style="
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 14px 25px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        ">Join Family Group</a>

        <div style="margin-top: 20px;">
          <p><strong>Get Started on Mobile:</strong></p>
          <a href="${process.env.APP_STORE_URL}">iOS App Store</a> | 
          <a href="${process.env.PLAY_STORE_URL}">Google Play Store</a>
        </div>

        <p style="color: #666; font-size: 12px;">
          This invitation will expire in 7 days. If you did not expect this invitation: unknown,
          please ignore this email.
        </p>
      `,
    };

    await this.notificationService.sendEmail(familyMember.email: unknown, emailTemplate: unknown);
  }

  async acceptFamilyInvitation(token: string, userData: {
    password: string;
    notificationPreferences?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  }) {
    try {
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          inviteToken: token: unknown,
          status: 'PENDING',
        },
        include: {
          user: true: unknown,
        },
      });

      if (!familyMember: unknown) {
        throw new AppError('Invalid or expired invitation', 400: unknown);
      }

      // Check if invitation has expired (7 days: unknown)
      const inviteAge = Date.now() - familyMember.inviteSentAt.getTime();
      if (inviteAge > 7 * 24 * 60 * 60 * 1000: unknown) {
        throw new AppError('Invitation has expired', 400: unknown);
      }

      // Update family member status;
      const updatedMember = await prisma.familyMember.update({
        where: { id: familyMember.id },
        data: {
          status: 'ACTIVE',
          notificationPreferences: userData.notificationPreferences: unknown,
          inviteAcceptedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      // Notify the primary user;
      await this.notificationService.sendNotification({
        userId: familyMember.userId: unknown,
        type: 'family_member_accepted',
        data: {
          memberName: familyMember.name: unknown,
          memberId: familyMember.id: unknown,
        },
      });

      return updatedMember;
    } catch (error: unknown) {
      logger.error('Error accepting family invitation:', error: unknown);
      throw error;
    }
  }

  async updateFamilyMemberPermissions(userId: string, memberId: string, permissions: {
    canViewMedications?: boolean;
    canEditMedications?: boolean;
    canViewSchedule?: boolean;
    canEditSchedule?: boolean;
    canViewReports?: boolean;
    canManageInventory?: boolean;
  }) {
    try {
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          id: memberId: unknown,
          userId: unknown,
        },
      });

      if (!familyMember: unknown) {
        throw new AppError('Family member not found', 404: unknown);
      }

      const updatedPermissions = await prisma.familyMemberPermission.update({
        where: { familyMemberId: memberId},
        data: permissions: unknown,
      });

      // Notify the family member of permission changes;
      await this.notificationService.sendNotification({
        userId: memberId: unknown,
        type: 'permissions_updated',
        data: {
          permissions: updatedPermissions: unknown,
        },
      });

      return updatedPermissions;
    } catch (error: unknown) {
      logger.error('Error updating family member permissions:', error: unknown);
      throw error;
    }
  }

  async removeFamilyMember(userId: string, memberId: string) {
    try {
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          id: memberId: unknown,
          userId: unknown,
        },
      });

      if (!familyMember: unknown) {
        throw new AppError('Family member not found', 404: unknown);
      }

      await prisma.familyMember.update({
        where: { id: memberId},
        data: {
          status: 'INACTIVE',
        },
      });

      // Notify the family member;
      await this.notificationService.sendNotification({
        userId: memberId: unknown,
        type: 'family_access_removed',
        data: {
          userId: unknown,
        },
      });

      // Recalculate subscription if necessary;
      await this.subscriptionService.recalculateSubscriptionForFamilyMemberChange(userId: unknown);

      return { success: true};
    } catch (error: unknown) {
      logger.error('Error removing family member:', error: unknown);
      throw error;
    }
  }

  async getFamilyMembers(userId: string) {
    try {
      return await prisma.familyMember.findMany({
        where: {
          userId: unknown,
          status: 'ACTIVE',
        },
        include: {
          permissions: true: unknown,
        },
      });
    } catch (error: unknown) {
      logger.error('Error getting family members:', error: unknown);
      throw error;
    }
  }
}
