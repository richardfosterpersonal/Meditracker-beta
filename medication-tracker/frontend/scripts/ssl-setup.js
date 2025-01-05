const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const acme = require('acme-client');
const { program } = require('commander');

// Configuration
const config = {
  email: 'admin@medication-tracker.com',
  domains: ['medication-tracker.com', 'www.medication-tracker.com'],
  certDir: path.join(__dirname, '../config/ssl'),
  production: process.env.NODE_ENV === 'production',
};

// Ensure certificate directory exists
if (!fs.existsSync(config.certDir)) {
  fs.mkdirSync(config.certDir, { recursive: true });
}

async function createAccount() {
  const client = new acme.Client({
    directoryUrl: config.production
      ? acme.directory.letsencrypt.production
      : acme.directory.letsencrypt.staging,
    accountKey: await acme.forge.createPrivateKey(),
  });

  const account = await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${config.email}`],
  });

  return { client, account };
}

async function performChallenge(client, authorization) {
  const challenge = authorization.challenges.find(
    (challenge) => challenge.type === 'http-01'
  );

  const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

  // Write challenge file
  const challengePath = path.join(process.cwd(), '.well-known', 'acme-challenge');
  if (!fs.existsSync(challengePath)) {
    fs.mkdirSync(challengePath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(challengePath, challenge.token),
    keyAuthorization
  );

  try {
    await client.verifyChallenge(authorization, challenge);
    await client.completeChallenge(challenge);
    await client.waitForValidStatus(challenge);
  } finally {
    // Clean up challenge file
    fs.unlinkSync(path.join(challengePath, challenge.token));
  }
}

async function generateCertificate() {
  console.log('Generating SSL certificate...');

  const { client } = await createAccount();

  // Generate certificate private key
  const privateKey = await acme.forge.createPrivateKey();

  // Create CSR
  const [key, csr] = await acme.forge.createCsr({
    commonName: config.domains[0],
    altNames: config.domains,
  });

  // Get certificate
  const cert = await client.auto({
    csr,
    email: config.email,
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      await performChallenge(client, authz);
    },
    challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
      // Challenge cleanup is handled in performChallenge
    },
  });

  // Save certificate files
  fs.writeFileSync(path.join(config.certDir, 'privkey.pem'), privateKey);
  fs.writeFileSync(path.join(config.certDir, 'cert.pem'), cert);
  fs.writeFileSync(path.join(config.certDir, 'chain.pem'), cert);

  console.log('Certificate generated successfully!');
}

async function setupAutoRenewal() {
  console.log('Setting up auto-renewal...');

  // Create renewal script
  const renewalScript = `#!/bin/bash
node ${path.join(__dirname, 'ssl-setup.js')} renew
`;

  fs.writeFileSync(
    path.join(config.certDir, 'renew-cert.sh'),
    renewalScript,
    { mode: 0o755 }
  );

  // Add to crontab (runs daily at 2:30 AM)
  const cronJob = '30 2 * * * ' + path.join(config.certDir, 'renew-cert.sh');
  try {
    execSync(`(crontab -l 2>/dev/null; echo "${cronJob}") | crontab -`);
    console.log('Auto-renewal cron job installed successfully!');
  } catch (error) {
    console.error('Failed to install cron job:', error);
  }
}

async function checkCertificate() {
  const certPath = path.join(config.certDir, 'cert.pem');
  if (!fs.existsSync(certPath)) {
    return false;
  }

  try {
    const certData = fs.readFileSync(certPath);
    const cert = new acme.forge.createX509Certificate(certData);
    const now = new Date();
    const expiryDate = new Date(cert.validity.notAfter);
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    console.log(`Certificate expires in ${daysUntilExpiry} days`);
    return daysUntilExpiry > 30;
  } catch (error) {
    console.error('Error checking certificate:', error);
    return false;
  }
}

// CLI commands
program
  .version('1.0.0')
  .description('SSL certificate management tool');

program
  .command('generate')
  .description('Generate new SSL certificate')
  .action(async () => {
    try {
      await generateCertificate();
      await setupAutoRenewal();
    } catch (error) {
      console.error('Failed to generate certificate:', error);
      process.exit(1);
    }
  });

program
  .command('renew')
  .description('Renew SSL certificate if needed')
  .action(async () => {
    try {
      const isValid = await checkCertificate();
      if (!isValid) {
        await generateCertificate();
      }
    } catch (error) {
      console.error('Failed to renew certificate:', error);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check SSL certificate status')
  .action(async () => {
    try {
      await checkCertificate();
    } catch (error) {
      console.error('Failed to check certificate:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
