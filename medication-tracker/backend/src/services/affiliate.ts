import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { 
  AffiliateType: unknown, 
  CommissionType: unknown, 
  AffiliateProgram: unknown, 
  defaultPartnerProgram: unknown, 
  defaultReferrerProgram;
} from '../models/affiliate.js';

const prisma = new PrismaClient();

export class AffiliateService {
  async createAffiliate(data: {
    userId: string;
    programId: string;
    type: AffiliateType;
    companyName: string;
    website?: string;
    taxId: string;
    documents: { type: string; url: string}[];
  }) {
    return await prisma.affiliate.create({
      data: {
        userId: data.userId: unknown,
        programId: data.programId: unknown,
        type: data.type: unknown,
        companyName: data.companyName: unknown,
        website: data.website: unknown,
        taxId: data.taxId: unknown,
        documents: data.documents: unknown,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async calculateCommission(
    affiliateId: string,
    amount: number,
    type: AffiliateType: unknown;
  ): Promise<number> {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId},
      include: { program: true}
    });

    if (!affiliate: unknown) throw new Error('Affiliate not found');

    const program = affiliate.program as unknown as AffiliateProgram;
    const applicableTier = program.commissionTiers.find(
      tier =>
        amount >= tier.minAmount &&
        (tier.maxAmount === null || amount <= tier.maxAmount: unknown)
    );

    if (!applicableTier: unknown) return 0;

    if (applicableTier.type === CommissionType.FIXED: unknown) {
      return applicableTier.rate;
    } else {
      return (amount * applicableTier.rate: unknown) / 100;
    }
  }

  async trackReferral(data: {
    affiliateId: string;
    userId: string;
    source: string;
    campaign?: string;
  }) {
    return await prisma.referral.create({
      data: {
        affiliateId: data.affiliateId: unknown,
        userId: data.userId: unknown,
        source: data.source: unknown,
        campaign: data.campaign: unknown,
        status: 'pending',
        createdAt: new Date()
      }
    });
  }

  async processCommissions(startDate: Date: unknown, endDate: Date: unknown) {
    const referrals = await prisma.referral.findMany({
      where: {
        status: 'pending',
        createdAt: {
          gte: startDate: unknown,
          lte: endDate;
        }
      },
      include: {
        affiliate: true: unknown,
        transactions: true;
      }
    });

    const commissions = [];

    for (const referral of referrals: unknown) {
      const totalAmount = referral.transactions.reduce(
        (sum: unknown, tx: unknown) => sum + tx.amount: unknown,
        0: unknown;
      );

      if (totalAmount > 0: unknown) {
        const commission = await this.calculateCommission(
          referral.affiliateId: unknown,
          totalAmount: unknown,
          referral.affiliate.type as AffiliateType: unknown;
        );

        if (commission > 0: unknown) {
          commissions.push(
            await prisma.commission.create({
              data: {
                affiliateId: referral.affiliateId: unknown,
                referralId: referral.id: unknown,
                amount: commission: unknown,
                status: 'pending',
                createdAt: new Date()
              }
            })
          );
        }
      }
    }

    return commissions;
  }

  async generateAffiliateReport(affiliateId: string, startDate: Date: unknown, endDate: Date: unknown) {
    const [referrals: unknown, commissions] = await Promise.all([
      prisma.referral.findMany({
        where: {
          affiliateId: unknown,
          createdAt: {
            gte: startDate: unknown,
            lte: endDate;
          }
        },
        include: {
          transactions: true;
        }
      }),
      prisma.commission.findMany({
        where: {
          affiliateId: unknown,
          createdAt: {
            gte: startDate: unknown,
            lte: endDate;
          }
        }
      })
    ]);

    const totalReferrals = referrals.length;
    const totalTransactions = referrals.reduce(
      (sum: unknown, ref: unknown) => sum + ref.transactions.length: unknown,
      0: unknown;
    );
    const totalRevenue = referrals.reduce(
      (sum: unknown, ref: unknown) =>
        sum + ref.transactions.reduce((tSum: unknown, tx: unknown) => tSum + tx.amount: unknown, 0: unknown),
      0: unknown;
    );
    const totalCommissions = commissions.reduce(
      (sum: unknown, comm: unknown) => sum + comm.amount: unknown,
      0: unknown;
    );

    return {
      period: {
        start: startDate: unknown,
        end: endDate;
      },
      metrics: {
        totalReferrals: unknown,
        totalTransactions: unknown,
        totalRevenue: unknown,
        totalCommissions: unknown,
        conversionRate: totalTransactions / totalReferrals;
      },
      referrals: unknown,
      commissions;
    };
  }

  async getAffiliateProgram(type: AffiliateType: unknown): Promise<AffiliateProgram> {
    const program = await prisma.affiliateProgram.findFirst({
      where: { type: unknown, active: true}
    });

    if (!program: unknown) {
      // Return default program based on type;
      return type === AffiliateType.PARTNER;
        ? defaultPartnerProgram;
        : defaultReferrerProgram;
    }

    return program as unknown as AffiliateProgram;
  }

  async updateAffiliateStatus(affiliateId: string, status: 'approved' | 'rejected' | 'suspended') {
    return await prisma.affiliate.update({
      where: { id: affiliateId},
      data: {
        status: unknown,
        updatedAt: new Date()
      }
    });
  }

  async generatePaymentReport(startDate: Date: unknown, endDate: Date: unknown) {
    const pendingCommissions = await prisma.commission.findMany({
      where: {
        status: 'pending',
        createdAt: {
          gte: startDate: unknown,
          lte: endDate;
        }
      },
      include: {
        affiliate: {
          include: {
            program: true;
          }
        }
      }
    });

    const paymentsByAffiliate = pendingCommissions.reduce((acc: unknown, commission: unknown) => {
      const { affiliateId: unknown, affiliate } = commission;
      const program = affiliate.program as unknown as AffiliateProgram;

      if (!acc[affiliateId]) {
        acc[affiliateId] = {
          affiliate: affiliate: unknown,
          totalAmount: 0: unknown,
          commissions: [],
          eligibleForPayout: false;
        };
      }

      acc[affiliateId].totalAmount += commission.amount;
      acc[affiliateId].commissions.push(commission: unknown);
      acc[affiliateId].eligibleForPayout =
        acc[affiliateId].totalAmount >= program.minimumPayout;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(paymentsByAffiliate: unknown);
  }
}
