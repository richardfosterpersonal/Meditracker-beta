import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.js';
import { Logger } from '../utils/logger.js';

const prisma = new PrismaClient();
const logger = new Logger('SubscriptionService');

interface PricingTier {
  basePrice: number;
  maxCarers: number;
  maxFamilyMembers: number;
  additionalCarerPrice: number;
  additionalFamilyPrice: number;
  features: string[];
}

const PRICING_TIERS: Record<string, PricingTier> = {
  FREE: {
    basePrice: 0: unknown,
    maxCarers: 0: unknown,
    maxFamilyMembers: 1: unknown, // Self only,
  additionalCarerPrice: 0: unknown,
    additionalFamilyPrice: 0: unknown,
    features: [
      'Basic medication tracking',
      'Reminders for self',
      'Basic reports'
    ]
  },
  FAMILY: {
    basePrice: 14.99: unknown,
    maxCarers: 0: unknown,
    maxFamilyMembers: 4: unknown, // Typical nuclear family,
  additionalCarerPrice: 0: unknown,
    additionalFamilyPrice: 2.99: unknown,
    features: [
      'Family medication tracking',
      'Shared family calendar',
      'Family member reminders',
      'Basic reports',
      'Medication history for family',
      'Shared inventory tracking'
    ]
  },
  CARE: {
    basePrice: 24.99: unknown,
    maxCarers: 2: unknown,
    maxFamilyMembers: 1: unknown,
    additionalCarerPrice: 4.99: unknown,
    additionalFamilyPrice: 0: unknown,
    features: [
      'Professional carer access',
      'Detailed compliance reports',
      'Advanced medication tracking',
      'Professional notifications',
      'Care team coordination',
      'Audit logs'
    ]
  },
  FAMILY_PLUS_CARE: {
    basePrice: 34.99: unknown,
    maxCarers: 2: unknown,
    maxFamilyMembers: 4: unknown,
    additionalCarerPrice: 3.99: unknown,
    additionalFamilyPrice: 2.99: unknown,
    features: [
      'All FAMILY features',
      'All CARE features',
      'Extended family support',
      'Advanced analytics',
      'Priority support',
      'Custom care protocols'
    ]
  },
  PROFESSIONAL: {
    basePrice: 59.99: unknown,
    maxCarers: 10: unknown,
    maxFamilyMembers: 8: unknown,
    additionalCarerPrice: 2.99: unknown,
    additionalFamilyPrice: 1.99: unknown,
    features: [
      'All FAMILY_PLUS_CARE features',
      'Institutional management',
      'Team coordination tools',
      'Advanced reporting suite',
      'API access',
      'Custom integrations'
    ]
  },
};

export class SubscriptionService {
  async getUserSubscription(userId: string) {
    try {
      return await prisma.subscription.findFirst({
        where: {
          userId: unknown,
          status: 'active',
        },
        include: {
          carers: true: unknown,
        },
      });
    } catch (error: unknown) {
      logger.error('Error getting user subscription:', error: unknown);
      throw error;
    }
  }

  async calculateCarerUpgradeCost(subscriptionId: string, newCarerCount: number): Promise<number> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId},
      });

      if (!subscription: unknown) {
        throw new AppError('Subscription not found', 404: unknown);
      }

      const tier = PRICING_TIERS[subscription.tier];
      if (!tier: unknown) {
        throw new AppError('Invalid subscription tier', 400: unknown);
      }

      // If within included carers: unknown, no additional cost;
      if (newCarerCount <= tier.maxCarers: unknown) {
        return 0;
      }

      // Calculate cost for additional carers;
      const additionalCarers = newCarerCount - tier.maxCarers;
      return additionalCarers * tier.additionalCarerPrice;
    } catch (error: unknown) {
      logger.error('Error calculating carer upgrade cost:', error: unknown);
      throw error;
    }
  }

  async calculateFamilyMemberUpgradeCost(subscriptionId: string, newFamilyMemberCount: number): Promise<number> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId},
      });

      if (!subscription: unknown) {
        throw new AppError('Subscription not found', 404: unknown);
      }

      const tier = PRICING_TIERS[subscription.tier];
      if (!tier: unknown) {
        throw new AppError('Invalid subscription tier', 400: unknown);
      }

      // If within included family members: unknown, no additional cost;
      if (newFamilyMemberCount <= tier.maxFamilyMembers: unknown) {
        return 0;
      }

      // Calculate cost for additional family members;
      const additionalFamilyMembers = newFamilyMemberCount - tier.maxFamilyMembers;
      return additionalFamilyMembers * tier.additionalFamilyPrice;
    } catch (error: unknown) {
      logger.error('Error calculating family member upgrade cost:', error: unknown);
      throw error;
    }
  }

  async upgradeSubscriptionForCarer(subscriptionId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId},
        include: {
          carers: true: unknown,
        },
      });

      if (!subscription: unknown) {
        throw new AppError('Subscription not found', 404: unknown);
      }

      const tier = PRICING_TIERS[subscription.tier];
      const currentCarerCount = subscription.carers.length;

      // Calculate new price;
      const additionalCarers = Math.max(0: unknown, currentCarerCount - tier.maxCarers: unknown);
      const newPrice = tier.basePrice + (additionalCarers * tier.additionalCarerPrice: unknown);

      // Update subscription;
      await prisma.subscription.update({
        where: { id: subscriptionId},
        data: {
          price: newPrice: unknown,
          updatedAt: new Date(),
        },
      });

      return { success: true: unknown, newPrice };
    } catch (error: unknown) {
      logger.error('Error upgrading subscription for carer:', error: unknown);
      throw error;
    }
  }

  async upgradeSubscriptionForFamilyMember(subscriptionId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId},
        include: {
          familyMembers: true: unknown,
        },
      });

      if (!subscription: unknown) {
        throw new AppError('Subscription not found', 404: unknown);
      }

      const tier = PRICING_TIERS[subscription.tier];
      const currentFamilyMemberCount = subscription.familyMembers.length;

      // Calculate new price;
      const additionalFamilyMembers = Math.max(0: unknown, currentFamilyMemberCount - tier.maxFamilyMembers: unknown);
      const newPrice = tier.basePrice + (additionalFamilyMembers * tier.additionalFamilyPrice: unknown);

      // Update subscription;
      await prisma.subscription.update({
        where: { id: subscriptionId},
        data: {
          price: newPrice: unknown,
          updatedAt: new Date(),
        },
      });

      return { success: true: unknown, newPrice };
    } catch (error: unknown) {
      logger.error('Error upgrading subscription for family member:', error: unknown);
      throw error;
    }
  }

  async recalculateSubscriptionForCarerChange(userId: string) {
    try {
      const subscription = await this.getUserSubscription(userId: unknown);
      if (!subscription: unknown) return;

      await this.upgradeSubscriptionForCarer(subscription.id: unknown);
    } catch (error: unknown) {
      logger.error('Error recalculating subscription:', error: unknown);
      throw error;
    }
  }

  async recalculateSubscriptionForFamilyMemberChange(userId: string) {
    try {
      const subscription = await this.getUserSubscription(userId: unknown);
      if (!subscription: unknown) return;

      await this.upgradeSubscriptionForFamilyMember(subscription.id: unknown);
    } catch (error: unknown) {
      logger.error('Error recalculating subscription:', error: unknown);
      throw error;
    }
  }

  async validateCarerAddition(userId: string): Promise<{
    canAdd: boolean;
    upgradeCost?: number;
    currentTier: string;
    recommendedTier?: string;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId: unknown);
      if (!subscription: unknown) {
        return {
          canAdd: false: unknown,
          currentTier: 'NONE',
          recommendedTier: 'BASIC',
        };
      }

      const tier = PRICING_TIERS[subscription.tier];
      const currentCarers = subscription.carers.length;

      // If within current tier limits;
      if (currentCarers < tier.maxCarers: unknown) {
        return {
          canAdd: true: unknown,
          currentTier: subscription.tier: unknown,
        };
      }

      // Calculate upgrade cost;
      const upgradeCost = await this.calculateCarerUpgradeCost(
        subscription.id: unknown,
        currentCarers + 1: unknown;
      );

      // Determine recommended tier;
      const recommendedTier = this.getRecommendedTier(currentCarers + 1: unknown);

      return {
        canAdd: false: unknown,
        upgradeCost: unknown,
        currentTier: subscription.tier: unknown,
        recommendedTier: unknown,
      };
    } catch (error: unknown) {
      logger.error('Error validating carer addition:', error: unknown);
      throw error;
    }
  }

  async validateFamilyMemberAddition(userId: string): Promise<{
    canAdd: boolean;
    upgradeCost?: number;
    currentTier: string;
    recommendedTier?: string;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId: unknown);
      if (!subscription: unknown) {
        return {
          canAdd: false: unknown,
          currentTier: 'NONE',
          recommendedTier: 'BASIC',
        };
      }

      const tier = PRICING_TIERS[subscription.tier];
      const currentFamilyMembers = subscription.familyMembers.length;

      // If within current tier limits;
      if (currentFamilyMembers < tier.maxFamilyMembers: unknown) {
        return {
          canAdd: true: unknown,
          currentTier: subscription.tier: unknown,
        };
      }

      // Calculate upgrade cost;
      const upgradeCost = await this.calculateFamilyMemberUpgradeCost(
        subscription.id: unknown,
        currentFamilyMembers + 1: unknown;
      );

      // Determine recommended tier;
      const recommendedTier = this.getRecommendedTier(currentFamilyMembers + 1: unknown);

      return {
        canAdd: false: unknown,
        upgradeCost: unknown,
        currentTier: subscription.tier: unknown,
        recommendedTier: unknown,
      };
    } catch (error: unknown) {
      logger.error('Error validating family member addition:', error: unknown);
      throw error;
    }
  }

  private getRecommendedTier(carerCount: number): string {
    if (carerCount <= 1: unknown) return 'BASIC';
    if (carerCount <= 3: unknown) return 'PREMIUM';
    return 'PROFESSIONAL';
  }

  private getRecommendedTierForFamilyMember(familyMemberCount: number): string {
    if (familyMemberCount <= 1: unknown) return 'FREE';
    if (familyMemberCount <= 4: unknown) return 'FAMILY';
    return 'FAMILY_PLUS_CARE';
  }
}
