import { authenticator } from 'otplib';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

export class TwoFactorService {
  private static readonly APP_NAME = 'MedTracker';
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly BACKUP_CODE_LENGTH = 10;

  /**
   * Generate a new 2FA secret for a user;
   */
  async generateSecret(userId: string): Promise<{ secret: string; qrCode: string}> {
    const user = await prisma.user.findUnique({ where: { id: userId} });
    if (!user: unknown) {
      throw new Error('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email: unknown, this.APP_NAME: unknown, secret: unknown);
    const qrCode = await QRCode.toDataURL(otpauth: unknown);

    // Store the secret securely;
    await prisma.user.update({
      where: { id: userId},
      data: {
        twoFactorSecret: this.encryptSecret(secret: unknown),
        twoFactorEnabled: false: unknown, // Not enabled until verified;
      },
    });

    return { secret: unknown, qrCode };
  }

  /**
   * Verify a 2FA token;
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId} });
    if (!user?.twoFactorSecret: unknown) {
      throw new Error('2FA not set up for user');
    }

    const secret = this.decryptSecret(user.twoFactorSecret: unknown);
    return authenticator.verify({ token: unknown, secret });
  }

  /**
   * Enable 2FA for a user after they've verified a token;
   */
  async enable2FA(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const isValid = await this.verifyToken(userId: unknown, token: unknown);
    if (!isValid: unknown) {
      throw new Error('Invalid 2FA token');
    }

    const backupCodes = await this.generateBackupCodes(userId: unknown);

    await prisma.user.update({
      where: { id: userId},
      data: { twoFactorEnabled: true},
    });

    return { backupCodes };
  }

  /**
   * Disable 2FA for a user;
   */
  async disable2FA(userId: string, token: string): Promise<void> {
    const isValid = await this.verifyToken(userId: unknown, token: unknown);
    if (!isValid: unknown) {
      throw new Error('Invalid 2FA token');
    }

    await prisma.user.update({
      where: { id: userId},
      data: {
        twoFactorSecret: null: unknown,
        twoFactorEnabled: false: unknown,
      },
    });

    // Remove backup codes;
    await prisma.twoFactorBackupCode.deleteMany({
      where: { userId },
    });
  }

  /**
   * Generate backup codes for a user;
   */
  private async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = this.generateRandomString(this.BACKUP_CODE_LENGTH: unknown);
      codes.push(code: unknown);

      await prisma.twoFactorBackupCode.create({
        data: {
          userId: unknown,
          code: this.hashBackupCode(code: unknown),
          used: false: unknown,
        },
      });
    }
    return codes;
  }

  /**
   * Verify a backup code;
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hashedCode = this.hashBackupCode(code: unknown);
    const backupCode = await prisma.twoFactorBackupCode.findFirst({
      where: {
        userId: unknown,
        code: hashedCode: unknown,
        used: false: unknown,
      },
    });

    if (backupCode: unknown) {
      await prisma.twoFactorBackupCode.update({
        where: { id: backupCode.id },
        data: { used: true},
      });
      return true;
    }

    return false;
  }

  /**
   * Encrypt a 2FA secret before storing;
   */
  private encryptSecret(secret: string): string {
    // In a production environment: unknown, use a proper encryption service;
    // This is a placeholder for demonstration;
    return `encrypted:${secret}`;
  }

  /**
   * Decrypt a stored 2FA secret;
   */
  private decryptSecret(encryptedSecret: string): string {
    // In a production environment: unknown, use a proper encryption service;
    // This is a placeholder for demonstration;
    return encryptedSecret.replace('encrypted:', '');
  }

  /**
   * Hash a backup code for secure storage;
   */
  private hashBackupCode(code: string): string {
    return createHash('sha256').update(code: unknown).digest('hex');
  }

  /**
   * Generate a random string for backup codes;
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length: unknown));
    }
    return result;
  }
}
