import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { offlineLanguageService } from '../../services/OfflineLanguageService';
import { translationService } from '../../services/TranslationService';

interface PackInstallOptions {
  locale: string;
  options: {
    criticalOnly: boolean;
    includeMedicalTerms: boolean;
    includeRegionalVariants: boolean;
  };
}

export default function LanguagePackManager() {
  const [availablePacks, setAvailablePacks] = useState<LanguagePackMetadata[]>([]);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    total: number;
    available: number;
  } | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackInstallOptions | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load installed packs
      const installed = await offlineLanguageService.getInstalledPacks();
      setInstalledPacks(installed);

      // Load available packs from translation service
      const available = Object.keys(translationService.getSupportedLanguages())
        .map(async (locale) => await offlineLanguageService.getPackMetadata(locale));
      setAvailablePacks(await Promise.all(available));

      // Get storage information
      const storage = await offlineLanguageService.checkStorageUsage();
      setStorageInfo(storage);
    } catch (error) {
      console.error('Failed to load language pack data:', error);
      setError('Failed to load language pack information');
    }
  };

  const handleInstallClick = async (locale: string) => {
    try {
      const suggestedOptions = await offlineLanguageService.suggestPackOption(locale);
      setSelectedPack({
        locale,
        options: suggestedOptions
      });
      setShowInstallDialog(true);
    } catch (error) {
      console.error('Failed to prepare installation:', error);
      setError('Failed to prepare installation');
    }
  };

  const handleInstallConfirm = async () => {
    if (!selectedPack) return;

    try {
      setInstalling(selectedPack.locale);
      setError(null);
      await offlineLanguageService.installLanguagePack(
        selectedPack.locale,
        selectedPack.options
      );
      await loadData();
    } catch (error) {
      console.error('Failed to install language pack:', error);
      setError(`Failed to install language pack: ${error.message}`);
    } finally {
      setInstalling(null);
      setShowInstallDialog(false);
      setSelectedPack(null);
    }
  };

  const handleUninstall = async (locale: string) => {
    try {
      await offlineLanguageService.uninstallLanguagePack(locale);
      await loadData();
    } catch (error) {
      console.error('Failed to uninstall language pack:', error);
      setError('Failed to uninstall language pack');
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Storage Usage
          </Typography>
          {storageInfo && (
            <>
              <LinearProgress
                variant="determinate"
                value={(storageInfo.used / storageInfo.total) * 100}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {formatSize(storageInfo.used)} used of {formatSize(storageInfo.total)}
                {' '}({formatSize(storageInfo.available)} available)
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <List>
        {availablePacks.map((pack) => (
          <ListItem
            key={pack.locale}
            divider
            secondaryAction={
              installedPacks.includes(pack.locale) ? (
                <IconButton
                  edge="end"
                  aria-label="uninstall"
                  onClick={() => handleUninstall(pack.locale)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              ) : (
                <IconButton
                  edge="end"
                  aria-label="install"
                  onClick={() => handleInstallClick(pack.locale)}
                  color="primary"
                  disabled={!!installing}
                >
                  <DownloadIcon />
                </IconButton>
              )
            }
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {pack.name}
                  {installedPacks.includes(pack.locale) && (
                    <Chip
                      size="small"
                      label="Installed"
                      color="success"
                      icon={<CheckIcon />}
                    />
                  )}
                </Box>
              }
              secondary={
                <>
                  {pack.nativeName} • {formatSize(pack.size)}
                  {pack.criticalOnly && (
                    <Chip
                      size="small"
                      label="Critical Only"
                      color="warning"
                      icon={<WarningIcon />}
                      sx={{ ml: 1 }}
                    />
                  )}
                </>
              }
            />
          </ListItem>
        ))}
      </List>

      <Dialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Install Language Pack</DialogTitle>
        <DialogContent>
          {selectedPack && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Select Installation Options
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Tooltip title="Only emergency and critical medical terms">
                  <Button
                    variant={selectedPack.options.criticalOnly ? "contained" : "outlined"}
                    onClick={() => setSelectedPack({
                      ...selectedPack,
                      options: { ...selectedPack.options, criticalOnly: true }
                    })}
                    startIcon={<StorageIcon />}
                    fullWidth
                  >
                    Critical Only (~100KB)
                  </Button>
                </Tooltip>
              </Grid>
              <Grid item xs={12}>
                <Tooltip title="Common medical terms and basic regional variations">
                  <Button
                    variant={!selectedPack.options.criticalOnly && !selectedPack.options.includeRegionalVariants ? "contained" : "outlined"}
                    onClick={() => setSelectedPack({
                      ...selectedPack,
                      options: {
                        criticalOnly: false,
                        includeMedicalTerms: true,
                        includeRegionalVariants: false
                      }
                    })}
                    startIcon={<StorageIcon />}
                    fullWidth
                  >
                    Standard Pack (~2.5MB)
                  </Button>
                </Tooltip>
              </Grid>
              <Grid item xs={12}>
                <Tooltip title="Complete medical vocabulary and all regional variations">
                  <Button
                    variant={!selectedPack.options.criticalOnly && selectedPack.options.includeRegionalVariants ? "contained" : "outlined"}
                    onClick={() => setSelectedPack({
                      ...selectedPack,
                      options: {
                        criticalOnly: false,
                        includeMedicalTerms: true,
                        includeRegionalVariants: true
                      }
                    })}
                    startIcon={<StorageIcon />}
                    fullWidth
                  >
                    Full Pack (~5MB)
                  </Button>
                </Tooltip>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstallDialog(false)}>Cancel</Button>
          <Button
            onClick={handleInstallConfirm}
            variant="contained"
            disabled={!selectedPack || installing === selectedPack.locale}
          >
            {installing === selectedPack?.locale ? 'Installing...' : 'Install'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
