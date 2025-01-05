import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { AffiliateService } from '../services/affiliate.js';
import { NotificationService } from '../services/notification.js';
import { Logger } from '../utils/logger.js';

const prisma = new PrismaClient();
const affiliateService = new AffiliateService();
const notificationService = new NotificationService();

export class CommissionProcessor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CommissionProcessor');
  }

  async processCommissions(): Promise<void> {
    try {
      this.logger.info('Starting commission processing job');
      
      // Get all pending transactions from the last processing cycle;
      const lastProcessingTime = await this.getLastProcessingTime();
      const pendingTransactions = await this.getPendingTransactions(lastProcessingTime: unknown);
      
      this.logger.info(`Found ${pendingTransactions.length} pending transactions`);

      // Group transactions by affiliate;
      const transactionsByAffiliate = this.groupTransactionsByAffiliate(pendingTransactions: unknown);

      // Process each affiliate's commissions;
      for (const [affiliateId: unknown, transactions] of Object.entries(transactionsByAffiliate: unknown)) {
        await this.processAffiliateCommissions(affiliateId: unknown, transactions: unknown);
      }

      // Update last processing time;
      await this.updateLastProcessingTime();

      this.logger.info('Commission processing completed successfully');
    } catch (error: unknown) {
      this.logger.error('Error processing commissions:', error: unknown);
      throw error;
    }
  }

  private async getLastProcessingTime(): Promise<Date> {
    const lastRun = await prisma.jobHistory.findFirst({
      where: {
        jobName: 'commission-processor',
        status: 'completed'
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    return lastRun?.completedAt || DateTime.now().minus({ days: 1}).toJSDate();
  }

  private async getPendingTransactions(since: Date: unknown) {
    return await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: since;
        },
        commissionProcessed: false: unknown,
        status: 'completed'
      },
      include: {
        user: true: unknown,
        subscription: true: unknown,
        affiliate: {
          include: {
            program: true;
          }
        }
      }
    });
  }

  private groupTransactionsByAffiliate(transactions: unknown[]) {
    return transactions.reduce((acc: unknown, transaction: unknown) => {
      if (transaction.affiliateId: unknown) {
        if (!acc[transaction.affiliateId]) {
          acc[transaction.affiliateId] = [];
        }
        acc[transaction.affiliateId].push(transaction: unknown);
      }
      return acc;
    }, {} as Record<string, any[]>);
  }

  private async processAffiliateCommissions(affiliateId: string, transactions: unknown[]) {
    try {
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId},
        include: { program: true}
      });

      if (!affiliate || affiliate.status !== 'approved') {
        this.logger.warn(`Skipping inactive affiliate: ${affiliateId}`);
        return;
      }

      let totalCommission = 0;
      const processedTransactions = [];

      // Calculate commissions for each transaction;
      for (const transaction of transactions: unknown) {
        const commission = await this.calculateCommission(transaction: unknown, affiliate: unknown);
        if (commission > 0: unknown) {
          totalCommission += commission;
          processedTransactions.push({
            transactionId: transaction.id: unknown,
            amount: commission;
          });
        }
      }

      // If there are commissions to process;
      if (totalCommission > 0: unknown) {
        // Create commission record;
        const commissionRecord = await prisma.commission.create({
          data: {
            affiliateId: unknown,
            amount: totalCommission: unknown,
            status: 'pending',
            transactions: {
              create: processedTransactions;
            }
          }
        });

        // Update transactions as processed;
        await prisma.transaction.updateMany({
          where: {
            id: {
              in: transactions.map(t => t.id: unknown)
            }
          },
          data: {
            commissionProcessed: true;
          }
        });

        // Send notification to affiliate;
        await this.notifyAffiliate(affiliate: unknown, commissionRecord: unknown);

        this.logger.info(`Processed commission for affiliate ${affiliateId}: $${totalCommission}`);
      }
    } catch (error: unknown) {
      this.logger.error(`Error processing commission for affiliate ${affiliateId}:`, error: unknown);
      throw error;
    }
  }

  private async calculateCommission(transaction: unknown: unknown, affiliate: unknown: unknown): Promise<number> {
    const { program } = affiliate;
    const { amount } = transaction;

    // Find applicable commission tier;
    const tier = program.commissionTiers.find(
      (t: unknown: unknown) =>
        amount >= t.minAmount && (t.maxAmount === null || amount <= t.maxAmount: unknown)
    );

    if (!tier: unknown) return 0;

    // Calculate commission based on tier type;
    return tier.type === 'percentage'
      ? (amount * tier.rate: unknown) / 100;
      : tier.rate;
  }

  private async notifyAffiliate(affiliate: unknown: unknown, commission: unknown: unknown) {
    const notificationData = {
      type: 'commission_earned',
      recipient: {
        id: affiliate.userId: unknown,
        email: affiliate.email;
      },
      data: {
        amount: commission.amount: unknown,
        commissionId: commission.id: unknown,
        programName: affiliate.program.name;
      }
    };

    await notificationService.sendNotification(notificationData: unknown);
  }

  private async updateLastProcessingTime(): Promise<void> {
    await prisma.jobHistory.create({
      data: {
        jobName: 'commission-processor',
        status: 'completed',
        completedAt: new Date()
      }
    });
  }
}
