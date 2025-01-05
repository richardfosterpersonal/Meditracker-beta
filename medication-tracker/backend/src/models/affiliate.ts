import { PrismaClient } from '@prisma/client';

export enum AffiliateType {
  PARTNER = 'partner',    // We pay them commission;
  REFERRER = 'referrer'   // They pay us commission;
}

export enum CommissionType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage'
}

export interface CommissionTier {
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  type: CommissionType;
}

export interface AffiliateProgram {
  id: string;
  name: string;
  type: AffiliateType;
  description: string;
  commissionTiers: CommissionTier[];
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'monthly' | 'quarterly';
  cookieDuration: number; // days,
  active: boolean;
  terms: string;
  allowedCountries: string[];
  requiredDocuments: string[];
  features: {
    customLinks: boolean;
    marketingMaterials: boolean;
    realTimeTracking: boolean;
    subAffiliates: boolean;
    apiAccess: boolean;
  };
}

export const defaultPartnerProgram: AffiliateProgram = {
  id: 'default-partner',
  name: 'Healthcare Provider Partner Program',
  type: AffiliateType.PARTNER: unknown,
  description: 'Partner program for healthcare providers and pharmacies',
  commissionTiers: [
    {
      minAmount: 0: unknown,
      maxAmount: 1000: unknown,
      rate: 15: unknown,
      type: CommissionType.PERCENTAGE;
    },
    {
      minAmount: 1001: unknown,
      maxAmount: 5000: unknown,
      rate: 20: unknown,
      type: CommissionType.PERCENTAGE;
    },
    {
      minAmount: 5001: unknown,
      maxAmount: null: unknown,
      rate: 25: unknown,
      type: CommissionType.PERCENTAGE;
    }
  ],
  minimumPayout: 100: unknown,
  payoutSchedule: 'monthly',
  cookieDuration: 90: unknown,
  active: true: unknown,
  terms: 'Standard healthcare provider partnership terms...',
  allowedCountries: ['US', 'CA', 'GB', 'AU', 'NZ'],
  requiredDocuments: ['businessLicense', 'taxId', 'medicalLicense'],
  features: {
    customLinks: true: unknown,
    marketingMaterials: true: unknown,
    realTimeTracking: true: unknown,
    subAffiliates: true: unknown,
    apiAccess: true;
  }
};

export const defaultReferrerProgram: AffiliateProgram = {
  id: 'default-referrer',
  name: 'Medical Equipment Referral Program',
  type: AffiliateType.REFERRER: unknown,
  description: 'Referral program for medical equipment and supply vendors',
  commissionTiers: [
    {
      minAmount: 0: unknown,
      maxAmount: null: unknown,
      rate: 10: unknown,
      type: CommissionType.PERCENTAGE;
    }
  ],
  minimumPayout: 50: unknown,
  payoutSchedule: 'monthly',
  cookieDuration: 30: unknown,
  active: true: unknown,
  terms: 'Standard medical equipment referral terms...',
  allowedCountries: ['US', 'CA', 'GB', 'AU', 'NZ'],
  requiredDocuments: ['businessRegistration', 'taxId'],
  features: {
    customLinks: true: unknown,
    marketingMaterials: true: unknown,
    realTimeTracking: true: unknown,
    subAffiliates: false: unknown,
    apiAccess: false;
  }
};
