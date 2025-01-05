import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/errors.js';
import { trackError } from '@/utils/error-tracking.js';
import { Logger } from 'winston';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types.js';

@injectable()
export class ErrorHandler {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  public handleError(
    error: Error | ApiError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Log error
    this.logger.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    // Track error
    trackError(error, {
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
    });

    // Send response
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  public handleNotFound(req: Request, res: Response): void {
    res.status(404).json({
      status: 'error',
      message: 'Resource not found',
    });
  }
}
