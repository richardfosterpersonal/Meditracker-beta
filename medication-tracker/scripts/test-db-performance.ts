import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function testDatabasePerformance() {
  logger.info('Starting database performance tests...');

  try {
    // 1. Test Read Performance
    const readStart = Date.now();
    await Promise.all([
      // Test user queries
      prisma.user.findMany({
        take: 100,
        include: {
          medications: true,
          scheduledDoses: true,
        }
      }),
      // Test medication queries
      prisma.medication.findMany({
        take: 100,
        include: {
          scheduledDoses: true,
          doseLogs: true,
        }
      }),
      // Test notification queries
      prisma.notificationRule.findMany({
        take: 100,
        include: {
          user: true,
        }
      })
    ]);
    const readTime = Date.now() - readStart;
    logger.info(`Read performance test completed in ${readTime}ms`);

    // 2. Test Write Performance
    const writeStart = Date.now();
    await prisma.$transaction([
      // Test dose log creation
      prisma.doseLog.create({
        data: {
          userId: 'test-user',
          medicationId: 'test-med',
          scheduledDoseId: 'test-dose',
          status: 'TAKEN',
          takenAt: new Date(),
        }
      }),
      // Test audit log creation
      prisma.auditLog.create({
        data: {
          userId: 'test-user',
          action: 'PERFORMANCE_TEST',
          resource: 'database',
          details: { test: 'write_performance' },
        }
      })
    ]);
    const writeTime = Date.now() - writeStart;
    logger.info(`Write performance test completed in ${writeTime}ms`);

    // 3. Test Complex Query Performance
    const queryStart = Date.now();
    await prisma.medication.findMany({
      where: {
        AND: [
          { active: true },
          {
            scheduledDoses: {
              some: {
                status: 'PENDING',
                scheduledTime: {
                  lte: new Date(),
                }
              }
            }
          }
        ]
      },
      include: {
        scheduledDoses: {
          where: {
            status: 'PENDING',
          }
        },
        user: {
          include: {
            notificationRules: true,
          }
        }
      }
    });
    const queryTime = Date.now() - queryStart;
    logger.info(`Complex query test completed in ${queryTime}ms`);

    // 4. Clean up test data
    await prisma.$transaction([
      prisma.doseLog.deleteMany({
        where: {
          userId: 'test-user',
        }
      }),
      prisma.auditLog.deleteMany({
        where: {
          action: 'PERFORMANCE_TEST',
        }
      })
    ]);

    // 5. Report Results
    const results = {
      readPerformance: readTime,
      writePerformance: writeTime,
      complexQueryPerformance: queryTime,
      timestamp: new Date(),
    };

    logger.info('Performance test results:', results);

    // 6. Verify Results Against Thresholds
    const thresholds = {
      maxReadTime: 1000,    // 1 second
      maxWriteTime: 500,    // 500ms
      maxQueryTime: 2000,   // 2 seconds
    };

    if (readTime > thresholds.maxReadTime) {
      throw new Error(`Read performance (${readTime}ms) exceeds threshold (${thresholds.maxReadTime}ms)`);
    }
    if (writeTime > thresholds.maxWriteTime) {
      throw new Error(`Write performance (${writeTime}ms) exceeds threshold (${thresholds.maxWriteTime}ms)`);
    }
    if (queryTime > thresholds.maxQueryTime) {
      throw new Error(`Query performance (${queryTime}ms) exceeds threshold (${thresholds.maxQueryTime}ms)`);
    }

    return results;
  } catch (error) {
    logger.error('Performance test failed:', error);
    throw error;
  }
}

testDatabasePerformance()
  .catch((error) => {
    logger.error('Performance test script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
