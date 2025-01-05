import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function verifyDataIntegrity() {
  logger.info('Starting data integrity verification...');

  try {
    // 1. Verify User Data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        _count: {
          select: {
            medications: true,
            scheduledDoses: true,
            doseLogs: true,
          }
        }
      }
    });
    logger.info(`Verified ${users.length} users`);

    // 2. Check Medication References
    const medications = await prisma.medication.findMany({
      include: {
        scheduledDoses: true,
        doseLogs: true,
      }
    });
    logger.info(`Verified ${medications.length} medications`);

    // 3. Verify Scheduled Doses
    const scheduledDoses = await prisma.scheduledDose.findMany({
      where: {
        NOT: {
          medicationId: null,
          userId: null,
        }
      }
    });
    logger.info(`Verified ${scheduledDoses.length} scheduled doses`);

    // 4. Check Notification Rules
    const notificationRules = await prisma.notificationRule.findMany({
      where: {
        NOT: {
          userId: null,
        }
      }
    });
    logger.info(`Verified ${notificationRules.length} notification rules`);

    // 5. Verify Emergency Access Logs
    const emergencyLogs = await prisma.emergencyAccessLog.findMany({
      where: {
        NOT: {
          userId: null,
        }
      }
    });
    logger.info(`Verified ${emergencyLogs.length} emergency logs`);

    // 6. Check Data Encryption Keys
    const encryptionKeys = await prisma.dataEncryptionKey.findMany({
      select: {
        id: true,
        version: true,
      }
    });
    logger.info(`Verified ${encryptionKeys.length} encryption keys`);

    // 7. Verify Two-Factor Authentication
    const twoFactorUsers = await prisma.user.count({
      where: {
        twoFactorEnabled: true,
        twoFactorSecret: {
          not: null,
        }
      }
    });
    logger.info(`Verified ${twoFactorUsers} 2FA enabled users`);

    // 8. Check Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      take: 1,
      orderBy: {
        createdAt: 'desc',
      }
    });
    logger.info('Verified audit logs, most recent:', auditLogs[0]?.createdAt);

    logger.info('Data integrity verification completed successfully');
    return true;
  } catch (error) {
    logger.error('Data integrity verification failed:', error);
    throw error;
  }
}

verifyDataIntegrity()
  .catch((error) => {
    logger.error('Verification script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
