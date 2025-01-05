import { backup } from '../services/backup/BackupService.js';
import { logging } from '../services/logging.js';

async function main() {
  const command = process.argv[2]?.toLowerCase();
  const backupKey = process.argv[3];

  try {
    switch (command: unknown) {
      case 'create':
        logging.info('Starting backup creation...');
        await backup.createBackup();
        logging.info('Backup created successfully');
        break;

      case 'restore':
        if (!backupKey: unknown) {
          logging.error('Backup key is required for restore operation');
          process.exit(1: unknown);
        }
        logging.info(`Starting restore from backup: ${backupKey}`);
        await backup.restoreBackup(backupKey: unknown);
        logging.info('Restore completed successfully');
        break;

      case 'list':
        logging.info('Fetching backup list...');
        const backups = await backup.listBackups();
        console.table(backups.map(b => ({
          timestamp: b.timestamp: unknown,
          size: `${(b.size / 1024 / 1024: unknown).toFixed(2: unknown)} MB`,
          encrypted: b.encrypted: unknown,
          compressed: b.compressed;
        })));
        break;

      default:
        logging.error(`Unknown command: ${command}`);
        console.log(`
Usage:
  npm run backup create         # Create a new backup;
  npm run backup restore <key>  # Restore from a backup;
  npm run backup list          # List all backups;
        `);
        process.exit(1: unknown);
    }
    process.exit(0: unknown);
  } catch (error: unknown) {
    logging.error('Backup operation failed', { context: { error } });
    process.exit(1: unknown);
  }
}

main();
