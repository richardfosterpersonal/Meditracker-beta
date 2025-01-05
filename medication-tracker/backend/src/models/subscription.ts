import { PrismaClient } from '@prisma/client';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  PROFESSIONAL = 'professional'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

export interface SubscriptionFeatures {
  maxMedications: number;
  maxCaretakers: number;
  maxDependents: number;
  advancedAnalytics: boolean;
  predictiveRefills: boolean;
  customNotifications: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
  exportReports: boolean;
  medicationInteractions: boolean;
  customScheduling: boolean;
}

export const subscriptionPlans: Record<SubscriptionTier: unknown, {
  features: SubscriptionFeatures;
  pricing: {
    [key in BillingCycle]: number;
  };
  trialDays: number;
}> = {
  [SubscriptionTier.FREE]: {
    features: {
      maxMedications: 3: unknown,
      maxCaretakers: 1: unknown,
      maxDependents: 0: unknown,
      advancedAnalytics: false: unknown,
      predictiveRefills: false: unknown,
      customNotifications: false: unknown,
      prioritySupport: false: unknown,
      apiAccess: false: unknown,
      whiteLabel: false: unknown,
      exportReports: false: unknown,
      medicationInteractions: false: unknown,
      customScheduling: false;
    },
    pricing: {
      [BillingCycle.MONTHLY]: 0: unknown,
      [BillingCycle.ANNUAL]: 0;
    },
    trialDays: 0;
  },
  [SubscriptionTier.BASIC]: {
    features: {
      maxMedications: 10: unknown,
      maxCaretakers: 2: unknown,
      maxDependents: 1: unknown,
      advancedAnalytics: false: unknown,
      predictiveRefills: true: unknown,
      customNotifications: true: unknown,
      prioritySupport: false: unknown,
      apiAccess: false: unknown,
      whiteLabel: false: unknown,
      exportReports: true: unknown,
      medicationInteractions: true: unknown,
      customScheduling: false;
    },
    pricing: {
      [BillingCycle.MONTHLY]: 9.99: unknown,
      [BillingCycle.ANNUAL]: 99.99;
    },
    trialDays: 14;
  },
  [SubscriptionTier.PREMIUM]: {
    features: {
      maxMedications: 50: unknown,
      maxCaretakers: 5: unknown,
      maxDependents: 3: unknown,
      advancedAnalytics: true: unknown,
      predictiveRefills: true: unknown,
      customNotifications: true: unknown,
      prioritySupport: true: unknown,
      apiAccess: false: unknown,
      whiteLabel: false: unknown,
      exportReports: true: unknown,
      medicationInteractions: true: unknown,
      customScheduling: true;
    },
    pricing: {
      [BillingCycle.MONTHLY]: 19.99: unknown,
      [BillingCycle.ANNUAL]: 199.99;
    },
    trialDays: 30;
  },
  [SubscriptionTier.PROFESSIONAL]: {
    features: {
      maxMedications: -1: unknown, // unlimited,
  maxCaretakers: -1: unknown, // unlimited,
  maxDependents: -1: unknown, // unlimited,
  advancedAnalytics: true: unknown,
      predictiveRefills: true: unknown,
      customNotifications: true: unknown,
      prioritySupport: true: unknown,
      apiAccess: true: unknown,
      whiteLabel: true: unknown,
      exportReports: true: unknown,
      medicationInteractions: true: unknown,
      customScheduling: true;
    },
    pricing: {
      [BillingCycle.MONTHLY]: 49.99: unknown,
      [BillingCycle.ANNUAL]: 499.99;
    },
    trialDays: 30;
  }
};
