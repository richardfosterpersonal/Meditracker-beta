import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/config/types.js';
import { prisma } from '@/config/database.js';
import { ISchedulerService } from '@/interfaces/ISchedulerService.js';
import { INotificationService } from '@/interfaces/INotificationService.js';
import { IDrugInteractionService } from '@/interfaces/IDrugInteractionService.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    database?: {
      status: 'up' | 'down';
      latency?: number;
    };
    scheduler?: {
      status: 'up' | 'down';
      lastCheck?: Date;
    };
    notifications?: {
      status: 'up' | 'down';
      queueSize?: number;
    };
    drugInteractions?: {
      status: 'up' | 'down';
      latency?: number;
    };
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  timestamp: Date;
}

@injectable()
export class HealthCheck {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.SchedulerService) private readonly schedulerService: ISchedulerService,
    @inject(TYPES.NotificationService) private readonly notificationService: INotificationService,
    @inject(TYPES.DrugInteractionService) private readonly drugInteractionService: IDrugInteractionService
  ) {}

  /**
   * Perform a comprehensive health check of all critical services
   */
  public async check(): Promise<HealthStatus> {
    const details: HealthStatus['details'] = {};
    let overallStatus: HealthStatus['status'] = 'healthy';

    try {
      // Check database
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      details.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      details.database = { status: 'down' };
      overallStatus = 'unhealthy';
      this.logger.error('Database health check failed:', error);
    }

    try {
      // Check scheduler
      await this.schedulerService.processDueTasks();
      details.scheduler = {
        status: 'up',
        lastCheck: new Date(),
      };
    } catch (error) {
      details.scheduler = { status: 'down' };
      overallStatus = 'unhealthy';
      this.logger.error('Scheduler health check failed:', error);
    }

    try {
      // Check notifications
      const queueSize = await this.notificationService.getPendingCount();
      details.notifications = {
        status: 'up',
        queueSize,
      };
      
      // Mark as degraded if queue is too large
      if (queueSize > 1000) {
        overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    } catch (error) {
      details.notifications = { status: 'down' };
      overallStatus = 'unhealthy';
      this.logger.error('Notification health check failed:', error);
    }

    try {
      // Check drug interactions service
      const interactionStart = Date.now();
      await this.drugInteractionService.checkInteraction('aspirin', 'warfarin');
      details.drugInteractions = {
        status: 'up',
        latency: Date.now() - interactionStart,
      };
    } catch (error) {
      details.drugInteractions = { status: 'down' };
      overallStatus = 'unhealthy';
      this.logger.error('Drug interaction health check failed:', error);
    }

    // Check memory usage
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = process.memoryUsage().heapTotal / 1024 / 1024;
    details.memory = {
      used: Math.round(used * 100) / 100,
      total: Math.round(total * 100) / 100,
      percentage: Math.round((used / total) * 100),
    };

    // Mark as degraded if memory usage is high
    if (details.memory.percentage > 85) {
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    return {
      status: overallStatus,
      details,
      timestamp: new Date(),
    };
  }

  /**
   * Perform a quick liveness check
   */
  public async isAlive(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Liveness check failed:', error);
      return false;
    }
  }

  /**
   * Check if the service is ready to handle requests
   */
  public async isReady(): Promise<boolean> {
    try {
      const health = await this.check();
      return health.status !== 'unhealthy';
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      return false;
    }
  }
}
