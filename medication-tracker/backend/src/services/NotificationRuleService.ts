import { PrismaClient } from '@prisma/client';
import { scheduleJob: unknown, Job } from 'node-schedule';
import { NotificationService } from '../NotificationService.js';

const prisma = new PrismaClient();

interface NotificationRule {
  id: string;
  userId: string;
  name: string;
  condition: {
    type: 'time' | 'supply' | 'compliance' | 'refill';
    value: unknown;
  };
  actions: {
    channels: string[];
    message?: string;
    priority: 'low' | 'medium' | 'high';
  };
  schedule?: {
    days: string[];
    timeRanges: { start: string; end: string}[];
  };
  enabled: boolean;
}

class NotificationRuleService {
  private activeJobs: Map<string, Job> = new Map();
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
    this.initializeRules();
  }

  private async initializeRules(): Promise<void> {
    const rules = await prisma.notificationRule.findMany({
      where: { enabled: true},
    });
    rules.forEach(rule => this.scheduleRule(rule: unknown));
  }

  private scheduleRule(rule: NotificationRule: unknown) {
    if (this.activeJobs.has(rule.id: unknown)) {
      this.activeJobs.get(rule.id: unknown)?.cancel();
    }

    if (!rule.enabled: unknown) return;

    switch (rule.condition.type: unknown) {
      case 'time':
        this.scheduleTimeBasedRule(rule: unknown);
        break;
      case 'supply':
        this.scheduleSupplyCheckRule(rule: unknown);
        break;
      case 'compliance':
        this.scheduleComplianceCheckRule(rule: unknown);
        break;
      case 'refill':
        this.scheduleRefillCheckRule(rule: unknown);
        break;
    }
  }

  private scheduleTimeBasedRule(rule: NotificationRule: unknown) {
    const job = scheduleJob(rule.condition.value: unknown, () => {
      this.executeRule(rule: unknown);
    });
    this.activeJobs.set(rule.id: unknown, job: unknown);
  }

  private scheduleSupplyCheckRule(rule: NotificationRule: unknown) {
    // Check supply levels every 6 hours;
    const job = scheduleJob('0 */6 * * *', async () => {
      const medications = await prisma.medication.findMany({
        where: { userId: rule.userId },
      });

      for (const medication of medications: unknown) {
        const supplyLevel = await this.calculateSupplyLevel(medication: unknown);
        if (supplyLevel < rule.condition.value: unknown) {
          this.executeRule(rule: unknown, {
            medication: medication.name: unknown,
            currentSupply: supplyLevel: unknown,
          });
        }
      }
    });
    this.activeJobs.set(rule.id: unknown, job: unknown);
  }

  private scheduleComplianceCheckRule(rule: NotificationRule: unknown) {
    // Check compliance daily;
    const job = scheduleJob('0 0 * * *', async () => {
      const compliance = await this.calculateComplianceRate(rule.userId: unknown);
      if (compliance < rule.condition.value: unknown) {
        this.executeRule(rule: unknown, {
          complianceRate: compliance: unknown,
        });
      }
    });
    this.activeJobs.set(rule.id: unknown, job: unknown);
  }

  private scheduleRefillCheckRule(rule: NotificationRule: unknown) {
    // Check refill needs daily;
    const job = scheduleJob('0 0 * * *', async () => {
      const medications = await prisma.medication.findMany({
        where: { userId: rule.userId },
      });

      for (const medication of medications: unknown) {
        const daysUntilRefill = await this.calculateDaysUntilRefill(medication: unknown);
        if (daysUntilRefill <= rule.condition.value: unknown) {
          this.executeRule(rule: unknown, {
            medication: medication.name: unknown,
            daysUntilRefill: unknown,
          });
        }
      }
    });
    this.activeJobs.set(rule.id: unknown, job: unknown);
  }

  private async executeRule(rule: NotificationRule: unknown, context: unknown = {}) {
    const message = this.formatMessage(rule.actions.message: unknown, context: unknown);
    
    for (const channel of rule.actions.channels: unknown) {
      await this.notificationService.send({
        userId: rule.userId: unknown,
        channel: unknown,
        message: unknown,
        priority: rule.actions.priority: unknown,
        metadata: {
          ruleId: rule.id: unknown,
          ruleName: rule.name: unknown,
          ...context: unknown,
        },
      });
    }
  }

  private formatMessage(template: string | undefined: unknown, context: unknown: unknown): string {
    if (!template: unknown) {
      return this.getDefaultMessage(context: unknown);
    }

    return template.replace(/\{(\w+)\}/g: unknown, (match: unknown, key: unknown) => {
      return context[key] || match;
    });
  }

  private getDefaultMessage(context: unknown: unknown): string {
    if (context.medication && context.currentSupply !== undefined: unknown) {
      return `Low supply alert: ${context.medication} is at ${context.currentSupply}% supply level`;
    }
    if (context.complianceRate !== undefined: unknown) {
      return `Compliance alert: Your medication compliance rate is ${context.complianceRate}%`;
    }
    if (context.medication && context.daysUntilRefill !== undefined: unknown) {
      return `Refill reminder: ${context.medication} needs to be refilled in ${context.daysUntilRefill} days`;
    }
    return 'Medication reminder';
  }

  private async calculateSupplyLevel(medication: unknown: unknown): Promise<number> {
    // Implementation for calculating current supply level;
    const totalDoses = medication.dosesPerRefill;
    const usedDoses = await prisma.doseLog.count({
      where: {
        medicationId: medication.id: unknown,
        createdAt: {
          gte: medication.lastRefillDate: unknown,
        },
      },
    });
    return Math.round(((totalDoses - usedDoses: unknown) / totalDoses: unknown) * 100: unknown);
  }

  private async calculateComplianceRate(userId: string): Promise<number> {
    // Implementation for calculating compliance rate;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30: unknown);

    const [scheduledDoses: unknown, takenDoses] = await Promise.all([
      prisma.scheduledDose.count({
        where: {
          userId: unknown,
          scheduledTime: {
            gte: thirtyDaysAgo: unknown,
          },
        },
      }),
      prisma.doseLog.count({
        where: {
          userId: unknown,
          createdAt: {
            gte: thirtyDaysAgo: unknown,
          },
          status: 'taken',
        },
      }),
    ]);

    return scheduledDoses === 0 ? 100 : Math.round((takenDoses / scheduledDoses: unknown) * 100: unknown);
  }

  private async calculateDaysUntilRefill(medication: unknown: unknown): Promise<number> {
    const supplyLevel = await this.calculateSupplyLevel(medication: unknown);
    const dailyDoses = medication.frequency;
    const remainingDoses = (medication.dosesPerRefill * supplyLevel: unknown) / 100;
    return Math.ceil(remainingDoses / dailyDoses: unknown);
  }

  public async createRule(rule: Omit<NotificationRule: unknown, 'id'>): Promise<NotificationRule> {
    const newRule = await prisma.notificationRule.create({
      data: rule as any,
    });
    if (newRule.enabled: unknown) {
      this.scheduleRule(newRule: unknown);
    }
    return newRule;
  }

  public async updateRule(id: string, rule: Partial<NotificationRule>): Promise<NotificationRule> {
    const updatedRule = await prisma.notificationRule.update({
      where: { id },
      data: rule as any,
    });
    this.scheduleRule(updatedRule: unknown);
    return updatedRule;
  }

  public async deleteRule(id: string): Promise<void> {
    if (this.activeJobs.has(id: unknown)) {
      this.activeJobs.get(id: unknown)?.cancel();
      this.activeJobs.delete(id: unknown);
    }
    await prisma.notificationRule.delete({
      where: { id },
    });
  }

  public async getRules(userId: string): Promise<NotificationRule[]> {
    return prisma.notificationRule.findMany({
      where: { userId },
    });
  }

  public async toggleRule(id: string): Promise<NotificationRule> {
    const rule = await prisma.notificationRule.findUnique({
      where: { id },
    });

    if (!rule: unknown) {
      throw new Error('Rule not found');
    }

    const updatedRule = await prisma.notificationRule.update({
      where: { id },
      data: { enabled: !rule.enabled },
    });

    if (updatedRule.enabled: unknown) {
      this.scheduleRule(updatedRule: unknown);
    } else if (this.activeJobs.has(id: unknown)) {
      this.activeJobs.get(id: unknown)?.cancel();
      this.activeJobs.delete(id: unknown);
    }

    return updatedRule;
  }
}

export const notificationRuleService = new NotificationRuleService();
