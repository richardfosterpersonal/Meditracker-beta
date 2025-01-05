import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { format } from 'date-fns';
import { backupService } from '../../utils/backup';
import { monitoring } from '../../utils/monitoring';
import { AuditLogger } from '../../utils/auditLog';

interface BackupEntry {
  timestamp: string;
  userId: string;
  version: string;
  checksum: string;
}

const BackupManager: React.FC<{ userId: string }> = ({ userId }) => {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupEntry | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  useEffect(() => {
    loadBackups();
  }, [userId]);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const backupEntries = await backupService.listBackups(userId);
      setBackups(backupEntries);
    } catch (error) {
      const message = (error as Error).message;
      setError('Failed to load backups: ' + message);
      monitoring.captureError(error as Error, {
        component: 'BackupManager',
        action: 'loadBackups',
        metadata: { userId },
      });
    }
    setLoading(false);
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setError(null);
    try {
      await backupService.createBackup(userId);
      await loadBackups();
      await AuditLogger.log(
        'manual_backup_created',
        userId,
        {
          timestamp: new Date().toISOString(),
          success: true,
        },
        'info'
      );
    } catch (error) {
      const message = (error as Error).message;
      setError('Failed to create backup: ' + message);
      monitoring.captureError(error as Error, {
        component: 'BackupManager',
        action: 'createBackup',
        metadata: { userId },
      });
    }
    setLoading(false);
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    setLoading(true);
    setError(null);
    try {
      await backupService.restoreBackup(userId, selectedBackup.timestamp);
      setRestoreDialogOpen(false);
      await AuditLogger.log(
        'backup_restored',
        userId,
        {
          timestamp: selectedBackup.timestamp,
          success: true,
        },
        'info'
      );
    } catch (error) {
      const message = (error as Error).message;
      setError('Failed to restore backup: ' + message);
      monitoring.captureError(error as Error, {
        component: 'BackupManager',
        action: 'restoreBackup',
        metadata: { userId, timestamp: selectedBackup.timestamp },
      });
    }
    setLoading(false);
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Backup Management</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateBackup}
              disabled={loading}
            >
              Create Backup
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Checksum</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.timestamp}>
                      <TableCell>
                        {format(new Date(backup.timestamp), 'PPpp')}
                      </TableCell>
                      <TableCell>{backup.version}</TableCell>
                      <TableCell>{backup.checksum.substring(0, 8)}...</TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setRestoreDialogOpen(true);
                          }}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore the backup from{' '}
            {selectedBackup &&
              format(new Date(selectedBackup.timestamp), 'PPpp')}
            ? This will replace all current data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupManager;
