import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Create test user
  const hashedPassword = await bcrypt.hash('Test123!@#', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: 'user',
      consentGiven: true,
      consentDate: new Date(),
    },
  });

  // Create test medication
  const medication = await prisma.medication.create({
    data: {
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 2,
      instructions: 'Take with food',
      startDate: new Date(),
      dosesPerRefill: 60,
      userId: user.id,
    },
  });

  // Create scheduled doses
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  await prisma.scheduledDose.create({
    data: {
      scheduledTime: tomorrow,
      status: 'pending',
      medicationId: medication.id,
      userId: user.id,
    },
  });

  // Create notification rule
  await prisma.notificationRule.create({
    data: {
      name: 'Default Reminder',
      condition: {
        type: 'before_dose',
        minutes: 30,
      },
      actions: {
        notification: true,
        email: false,
      },
      enabled: true,
      userId: user.id,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
