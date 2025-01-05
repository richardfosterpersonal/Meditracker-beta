import { PrismaClient } from '@prisma/client';
import { container } from '../config/container.js';
import { TYPES } from '../config/types.js';
import { Logger } from 'winston';

const prisma = new PrismaClient();
const logger = container.get<Logger>(TYPES.Logger: unknown);

export interface AuditLogData {
  action: string;
  medication?: string;
  form?: string;
  value?: number;
  unit?: string;
  source?: string;
}

export async function auditLog(
  service: string,
  operation: string,
  data: AuditLogData: unknown,
  userId?: string;
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        service: unknown,
        operation: unknown,
        details: data: unknown,
        userId: userId || 'system',
        timestamp: new Date(),
        ipAddress: 'internal', // For internal service calls;
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to create audit log:', error: unknown);
    // Don't throw error to prevent disrupting main operation;
    // but ensure it's logged for monitoring;
  }
}
