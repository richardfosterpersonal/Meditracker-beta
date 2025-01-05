import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { 
  exportSchedules, 
  importSchedules, 
  ScheduleConflict 
} from '../../services/schedule';

interface ScheduleImportExportProps {
  patientId: string;
  onSchedulesUpdated: () => void;
}

export const ScheduleImportExport: React.FC<ScheduleImportExportProps> = ({
  patientId,
  onSchedulesUpdated
}) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/medications/schedules?patientId=${patientId}`);
      const schedules = await response.json();
      
      const exportData = await exportSchedules(schedules, patientId);
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medication-schedules-${patientId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting schedules:', error);
      setError('Failed to export schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setLoading(true);
          setError(null);
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const importData = JSON.parse(e.target?.result as string);
              
              // Validate import first
              const validation = await importSchedules(importData, true);
              
              if (validation.conflicts.length > 0) {
                setConflicts(validation.conflicts);
                setImportDialogOpen(true);
              } else {
                // No conflicts, proceed with import
                await importSchedules(importData);
                onSchedulesUpdated();
              }
            } catch (error) {
              console.error('Error processing import:', error);
              setError('Invalid import file format');
            }
          };
          reader.readAsText(file);
        } catch (error) {
          console.error('Error importing schedules:', error);
          setError('Failed to import schedules');
        } finally {
          setLoading(false);
        }
      }
    };
    input.click();
  };

  const handleConfirmImport = async () => {
    try {
      setLoading(true);
      // Proceed with import despite conflicts
      const importData = await fetch(`/api/v1/medications/schedules/import/temp`).then(res => res.json());
      await importSchedules(importData);
      onSchedulesUpdated();
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Error confirming import:', error);
      setError('Failed to complete import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleImportClick}
          disabled={loading}
        >
          Import Schedules
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={loading}
        >
          Export Schedules
        </Button>
        {loading && <CircularProgress size={24} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography>Schedule Conflicts Detected</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            The following conflicts were found with existing schedules:
          </Typography>
          <List>
            {conflicts.map((conflict, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={conflict.description}
                  secondary={new Date(conflict.conflictingTime).toLocaleString()}
                />
                <Chip
                  label={conflict.severity}
                  color={
                    conflict.severity === 'high'
                      ? 'error'
                      : conflict.severity === 'medium'
                      ? 'warning'
                      : 'default'
                  }
                  size="small"
                />
              </ListItem>
            ))}
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Proceeding with the import may affect medication timing and safety.
            Please review the conflicts carefully.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmImport} color="warning">
            Import Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
