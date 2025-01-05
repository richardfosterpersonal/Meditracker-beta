import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { LanguagePack } from '../../services/OfflineLanguageService';

interface LanguagePackDownloaderProps {
  availablePacks: LanguagePack[];
  installedPacks: LanguagePack[];
  onInstallPack: (packId: string) => Promise<void>;
  onUninstallPack: (packId: string) => Promise<void>;
  storageInfo: {
    available: number;
    total: number;
    used: number;
  };
}

export const LanguagePackDownloader: React.FC<LanguagePackDownloaderProps> = ({
  availablePacks,
  installedPacks,
  onInstallPack,
  onUninstallPack,
  storageInfo,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async (packId: string) => {
    try {
      setDownloading(packId);
      setError(null);
      await onInstallPack(packId);
    } catch (err) {
      setError(`Failed to install language pack: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleUninstall = async (packId: string) => {
    try {
      await onUninstallPack(packId);
    } catch (err) {
      setError(`Failed to uninstall language pack: ${err.message}`);
    }
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStorageUsagePercentage = (): number => {
    return (storageInfo.used / storageInfo.total) * 100;
  };

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Storage Usage
          </Typography>
          <LinearProgress
            variant="determinate"
            value={getStorageUsagePercentage()}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="textSecondary">
            {formatSize(storageInfo.used)} used of {formatSize(storageInfo.total)}{' '}
            ({formatSize(storageInfo.available)} available)
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Available Language Packs
      </Typography>

      <List>
        {availablePacks.map((pack) => {
          const isInstalled = installedPacks.some((p) => p.id === pack.id);
          const isDownloading = downloading === pack.id;

          return (
            <ListItem
              key={pack.id}
              sx={{
                bgcolor: 'background.paper',
                mb: 1,
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle1">
                    {pack.name}{' '}
                    {pack.type === 'critical' && (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          bgcolor: 'error.main',
                          color: 'error.contrastText',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          ml: 1,
                        }}
                      >
                        CRITICAL
                      </Typography>
                    )}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="textSecondary">
                      Size: {formatSize(pack.size)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {pack.description}
                    </Typography>
                  </>
                }
              />
              <ListItemSecondaryAction>
                {isInstalled ? (
                  <IconButton
                    edge="end"
                    onClick={() => handleUninstall(pack.id)}
                    disabled={pack.type === 'critical'}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                ) : isDownloading ? (
                  <CircularProgress size={24} />
                ) : (
                  <IconButton
                    edge="end"
                    onClick={() => handleInstall(pack.id)}
                    disabled={storageInfo.available < pack.size}
                    color="primary"
                  >
                    <DownloadIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Installed Packs
      </Typography>

      <List>
        {installedPacks.map((pack) => (
          <ListItem
            key={pack.id}
            sx={{
              bgcolor: 'background.paper',
              mb: 1,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1">{pack.name}</Typography>
                  <CheckIcon color="success" sx={{ ml: 1 }} />
                </Box>
              }
              secondary={`Size: ${formatSize(pack.size)}`}
            />
            <ListItemSecondaryAction>
              {pack.type !== 'critical' && (
                <IconButton
                  edge="end"
                  onClick={() => handleUninstall(pack.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
