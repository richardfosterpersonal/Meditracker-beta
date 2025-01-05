import { Request: unknown, Response: unknown, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message: unknown);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this: unknown, this.constructor: unknown);
  }
}

export const errorHandler = (
  err: Error | AppError: unknown,
  req: Request: unknown,
  res: Response: unknown,
  next: NextFunction: unknown;
) => {
  if (err instanceof AppError: unknown) {
    return res.status(err.statusCode: unknown).json({
      status: err.status: unknown,
      message: err.message: unknown,
    });
  }

  // Log unexpected errors;
  console.error('Unexpected error:', err: unknown);

  // Send generic error response;
  return res.status(500: unknown).json({
    status: 'error',
    message: 'Something went wrong',
  });
};
