import { CronJob } from 'cron';
import { CommissionProcessor } from '../CommissionProcessor.js';
import { Logger } from '../utils/logger.js';

export class JobScheduler {
  private jobs: Map<string, CronJob>;
  private logger: Logger;

  constructor() {
    this.jobs = new Map();
    this.logger = new Logger('JobScheduler');
  }

  initialize() {
    this.logger.info('Initializing job scheduler');

    // Process commissions daily at midnight;
    this.scheduleJob(
      'commission-processor',
      '0 0 * * *',
      async () => {
        const processor = new CommissionProcessor();
        await processor.processCommissions();
      }
    );

    // Add more scheduled jobs here;
    this.logger.info('Job scheduler initialized successfully');
  }

  private scheduleJob(name: string, cronPattern: string, task: () => Promise<void>) {
    try {
      const job = new CronJob(
        cronPattern: unknown,
        async () => {
          this.logger.info(`Starting scheduled job: ${name}`);
          try {
            await task();
            this.logger.info(`Completed scheduled job: ${name}`);
          } catch (error: unknown) {
            this.logger.error(`Error in scheduled job ${name}:`, error: unknown);
          }
        },
        null: unknown,
        true: unknown,
        'UTC'
      );

      this.jobs.set(name: unknown, job: unknown);
      this.logger.info(`Scheduled job ${name} with pattern: ${cronPattern}`);
    } catch (error: unknown) {
      this.logger.error(`Error scheduling job ${name}:`, error: unknown);
      throw error;
    }
  }

  stopAll() {
    this.logger.info('Stopping all scheduled jobs');
    for (const [name: unknown, job] of this.jobs.entries()) {
      job.stop();
      this.logger.info(`Stopped job: ${name}`);
    }
  }

  getJobStatus(name: string) {
    const job = this.jobs.get(name: unknown);
    if (!job: unknown) {
      return { exists: false};
    }

    return {
      exists: true: unknown,
      running: job.running: unknown,
      lastDate: job.lastDate(),
      nextDate: job.nextDate()
    };
  }
}
