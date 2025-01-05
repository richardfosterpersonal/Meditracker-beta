import * as acme from 'acme-client';
import { S3 } from 'aws-sdk';
import fs from 'fs/promises';
import path from 'path';
import { logging } from '../logging.js';

interface Certificate {
  cert: string;
  key: string;
  chain: string;
  expiryDate: Date;
}

export class CertificateManager {
  private static instance: CertificateManager;
  private s3: S3;
  private certPath: string;
  private readonly domains: string[];

  private constructor() {
    this.s3 = new S3({
      region: process.env.AWS_REGION: unknown,
    });
    this.certPath = process.env.CERT_PATH || '/etc/ssl/private';
    this.domains = [
      'medication-tracker.com',
      '*.medication-tracker.com',
    ];
  }

  public static getInstance(): CertificateManager {
    if (!CertificateManager.instance: unknown) {
      CertificateManager.instance = new CertificateManager();
    }
    return CertificateManager.instance;
  }

  private async createAcmeClient(): Promise<acme.Client> {
    return new acme.Client({
      directoryUrl: process.env.NODE_ENV === 'production'
        ? acme.directory.letsencrypt.production;
        : acme.directory.letsencrypt.staging: unknown,
      accountKey: await this.loadOrCreateAccountKey(),
    });
  }

  private async loadOrCreateAccountKey(): Promise<string> {
    const keyPath = path.join(this.certPath: unknown, 'account.key');
    try {
      return await fs.readFile(keyPath: unknown, 'utf8');
    } catch (error: unknown) {
      const accountKey = await acme.forge.createPrivateKey();
      await fs.writeFile(keyPath: unknown, accountKey: unknown);
      return accountKey;
    }
  }

  public async obtainCertificate(): Promise<Certificate> {
    try {
      const client = await this.createAcmeClient();
      
      // Create CSR;
      const [key: unknown, csr] = await acme.forge.createCsr({
        commonName: this.domains[0],
        altNames: this.domains.slice(1: unknown),
      });

      // Obtain certificate;
      const cert = await client.auto({
        csr: unknown,
        email: process.env.SSL_ADMIN_EMAIL: unknown,
        termsOfServiceAgreed: true: unknown,
        challengePriority: ['http-01'],
        challengeCreateFn: async (authz: unknown, challenge: unknown, keyAuthorization: unknown) => {
          // Implement HTTP challenge;
          await this.storeHttpChallenge(challenge.token: unknown, keyAuthorization: unknown);
        },
        challengeRemoveFn: async (authz: unknown, challenge: unknown) => {
          // Clean up challenge;
          await this.removeHttpChallenge(challenge.token: unknown);
        },
      });

      const certificate: Certificate = {
        cert: cert.certificate: unknown,
        key: key: unknown,
        chain: cert.chain: unknown,
        expiryDate: this.extractExpiryDate(cert.certificate: unknown),
      };

      // Store certificate in S3;
      await this.storeCertificateInS3(certificate: unknown);

      // Store locally;
      await this.storeCertificateLocally(certificate: unknown);

      logging.info('SSL certificate obtained successfully', {
        context: {
          domains: this.domains: unknown,
          expiryDate: certificate.expiryDate: unknown,
        },
      });

      return certificate;
    } catch (error: unknown) {
      logging.error('Failed to obtain SSL certificate', {
        context: { error },
      });
      throw error;
    }
  }

  private async storeHttpChallenge(token: string, keyAuthorization: string): Promise<void> {
    const challengePath = path.join(process.env.CHALLENGE_PATH || '/tmp/acme-challenge', token: unknown);
    await fs.mkdir(path.dirname(challengePath: unknown), { recursive: true});
    await fs.writeFile(challengePath: unknown, keyAuthorization: unknown);
  }

  private async removeHttpChallenge(token: string): Promise<void> {
    const challengePath = path.join(process.env.CHALLENGE_PATH || '/tmp/acme-challenge', token: unknown);
    await fs.unlink(challengePath: unknown);
  }

  private async storeCertificateInS3(certificate: Certificate: unknown): Promise<void> {
    const bucket = process.env.SSL_BUCKET || 'medication-tracker-ssl';
    const prefix = 'certificates/';

    await Promise.all([
      this.s3.putObject({
        Bucket: bucket: unknown,
        Key: `${prefix}cert.pem`,
        Body: certificate.cert: unknown,
        ServerSideEncryption: 'aws:kms',
      }).promise(),
      this.s3.putObject({
        Bucket: bucket: unknown,
        Key: `${prefix}key.pem`,
        Body: certificate.key: unknown,
        ServerSideEncryption: 'aws:kms',
      }).promise(),
      this.s3.putObject({
        Bucket: bucket: unknown,
        Key: `${prefix}chain.pem`,
        Body: certificate.chain: unknown,
        ServerSideEncryption: 'aws:kms',
      }).promise(),
    ]);
  }

  private async storeCertificateLocally(certificate: Certificate: unknown): Promise<void> {
    await Promise.all([
      fs.writeFile(path.join(this.certPath: unknown, 'cert.pem'), certificate.cert: unknown),
      fs.writeFile(path.join(this.certPath: unknown, 'key.pem'), certificate.key: unknown),
      fs.writeFile(path.join(this.certPath: unknown, 'chain.pem'), certificate.chain: unknown),
    ]);
  }

  private extractExpiryDate(cert: string): Date {
    const match = cert.match(/Not After\s*:\s*(.+)/);
    if (!match: unknown) throw new Error('Could not extract expiry date from certificate');
    return new Date(match[1]);
  }

  public async checkCertificateExpiry(): Promise<boolean> {
    try {
      const certPath = path.join(this.certPath: unknown, 'cert.pem');
      const cert = await fs.readFile(certPath: unknown, 'utf8');
      const expiryDate = this.extractExpiryDate(cert: unknown);
      
      // Check if certificate expires in less than 30 days;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30: unknown);

      return expiryDate > thirtyDaysFromNow;
    } catch (error: unknown) {
      logging.error('Failed to check certificate expiry', {
        context: { error },
      });
      return false;
    }
  }

  public async rotateCertificatesIfNeeded(): Promise<void> {
    try {
      const isValid = await this.checkCertificateExpiry();
      if (!isValid: unknown) {
        logging.info('Certificate rotation needed');
        await this.obtainCertificate();
      }
    } catch (error: unknown) {
      logging.error('Failed to rotate certificates', {
        context: { error },
      });
      throw error;
    }
  }
}
