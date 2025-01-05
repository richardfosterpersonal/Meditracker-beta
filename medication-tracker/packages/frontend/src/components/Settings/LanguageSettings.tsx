import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { LanguagePackDownloader } from './LanguagePackDownloader';
import { LanguagePack, OfflineLanguageService } from '../../services/OfflineLanguageService';

export const LanguageSettings: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [availablePacks, setAvailablePacks] = useState<LanguagePack[]>([]);
  const [installedPacks, setInstalledPacks] = useState<LanguagePack[]>([]);
  const [storageInfo, setStorageInfo] = useState({
    available: 0,
    total: 0,
    used: 0,
  });
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLanguageData();
  }, []);

  const loadLanguageData = async () => {
    try {
      const [packs, installed, storage] = await Promise.all([
        OfflineLanguageService.getAvailableLanguagePacks(),
        OfflineLanguageService.getInstalledLanguagePacks(),
        OfflineLanguageService.getStorageInfo(),
      ]);

      setAvailablePacks(packs);
      setInstalledPacks(installed);
      setStorageInfo(storage);

      // Show warning if storage is running low (less than 20% available)
      setShowStorageWarning(
        (storage.available / storage.total) * 100 < 20
      );
    } catch (err) {
      setError('Failed to load language settings');
      console.error('Failed to load language settings:', err);
    }
  };

  const handleLanguageChange = async (event: any) => {
    try {
      const newLanguage = event.target.value;
      await OfflineLanguageService.setCurrentLanguage(newLanguage);
      setCurrentLanguage(newLanguage);
    } catch (err) {
      setError('Failed to change language');
      console.error('Failed to change language:', err);
    }
  };

  const handleInstallPack = async (packId: string) => {
    try {
      await OfflineLanguageService.installLanguagePack(packId);
      await loadLanguageData(); // Refresh data after installation
    } catch (err) {
      throw err; // Let the LanguagePackDownloader handle the error
    }
  };

  const handleUninstallPack = async (packId: string) => {
    try {
      await OfflineLanguageService.uninstallLanguagePack(packId);
      await loadLanguageData(); // Refresh data after uninstallation
    } catch (err) {
      throw err; // Let the LanguagePackDownloader handle the error
    }
  };

  const handleCleanupStorage = async () => {
    try {
      await OfflineLanguageService.cleanupStorage();
      await loadLanguageData(); // Refresh data after cleanup
    } catch (err) {
      setError('Failed to cleanup storage');
      console.error('Failed to cleanup storage:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Language Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Language
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="language-select-label">Language</InputLabel>
            <Select
              labelId="language-select-label"
              value={currentLanguage}
              label="Language"
              onChange={handleLanguageChange}
            >
              {installedPacks.map((pack) => (
                <MenuItem key={pack.id} value={pack.id}>
                  {pack.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {showStorageWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleCleanupStorage}>
              Clean Up
            </Button>
          }
        >
          Storage space is running low. Consider removing unused language packs or
          running cleanup.
        </Alert>
      )}

      <Card>
        <CardContent>
          <LanguagePackDownloader
            availablePacks={availablePacks}
            installedPacks={installedPacks}
            onInstallPack={handleInstallPack}
            onUninstallPack={handleUninstallPack}
            storageInfo={storageInfo}
          />
        </CardContent>
      </Card>

      <Dialog
        open={showStorageWarning && storageInfo.available < 10 * 1024 * 1024} // Show if less than 10MB available
        onClose={() => setShowStorageWarning(false)}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Critical Storage Warning
        </DialogTitle>
        <DialogContent>
          <Typography>
            Your device is extremely low on storage space. This may affect the
            app's ability to function properly in offline mode. Please remove
            unused language packs or other content to free up space.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStorageWarning(false)}>
            I'll do it later
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCleanupStorage}
          >
            Clean Up Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
