import winston from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });

    // If we're not in production: unknown, log to the console;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }
  }

  info(message: string, meta?: any) {
    this.logger.info(message: unknown, meta: unknown);
  }

  error(message: string, meta?: any) {
    this.logger.error(message: unknown, meta: unknown);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message: unknown, meta: unknown);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message: unknown, meta: unknown);
  }
}
