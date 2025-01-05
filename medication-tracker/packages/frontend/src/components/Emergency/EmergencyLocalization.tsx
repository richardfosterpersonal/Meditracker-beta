import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  LocalHospital as HospitalIcon,
  LocalPolice as PoliceIcon,
  LocalFireDepartment as FireIcon,
  Phone as PhoneIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { EmergencyLocalizationService } from '../../services/EmergencyLocalizationService';

interface EmergencyService {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire' | 'ambulance';
  phoneNumbers: string[];
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  operatingHours?: string;
  languages?: string[];
  specializations?: string[];
}

interface RegionInfo {
  id: string;
  name: string;
  countryCode: string;
  emergencyNumbers: {
    general: string;
    police?: string;
    fire?: string;
    ambulance?: string;
  };
  services: EmergencyService[];
}

export const EmergencyLocalization: React.FC = () => {
  const [currentRegion, setCurrentRegion] = useState<RegionInfo | null>(null);
  const [nearbyServices, setNearbyServices] = useState<EmergencyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<EmergencyService | null>(
    null
  );
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadEmergencyData();
  }, []);

  const loadEmergencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's current location
      const position = await getCurrentPosition();
      
      // Load region info based on coordinates
      const region = await EmergencyLocalizationService.getRegionInfo(
        position.coords.latitude,
        position.coords.longitude
      );
      setCurrentRegion(region);

      // Load nearby emergency services
      const services = await EmergencyLocalizationService.getNearbyServices(
        position.coords.latitude,
        position.coords.longitude
      );
      setNearbyServices(services);
    } catch (err) {
      setError('Failed to load emergency services information');
      console.error('Failed to load emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });
    });
  };

  const handleServiceClick = (service: EmergencyService) => {
    setSelectedService(service);
  };

  const toggleServiceExpansion = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'hospital':
        return <HospitalIcon />;
      case 'police':
        return <PoliceIcon />;
      case 'fire':
        return <FireIcon />;
      default:
        return <PhoneIcon />;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {currentRegion && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Emergency Numbers for {currentRegion.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<PhoneIcon />}
                label={`General: ${currentRegion.emergencyNumbers.general}`}
                color="error"
              />
              {currentRegion.emergencyNumbers.police && (
                <Chip
                  icon={<PoliceIcon />}
                  label={`Police: ${currentRegion.emergencyNumbers.police}`}
                  color="primary"
                />
              )}
              {currentRegion.emergencyNumbers.fire && (
                <Chip
                  icon={<FireIcon />}
                  label={`Fire: ${currentRegion.emergencyNumbers.fire}`}
                  color="warning"
                />
              )}
              {currentRegion.emergencyNumbers.ambulance && (
                <Chip
                  icon={<HospitalIcon />}
                  label={`Ambulance: ${currentRegion.emergencyNumbers.ambulance}`}
                  color="success"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      <Typography variant="h6" gutterBottom>
        Nearby Emergency Services
      </Typography>

      <List>
        {nearbyServices.map((service) => (
          <Card key={service.id} sx={{ mb: 2 }}>
            <ListItem
              button
              onClick={() => toggleServiceExpansion(service.id)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemIcon>{getServiceIcon(service.type)}</ListItemIcon>
              <ListItemText
                primary={service.name}
                secondary={service.phoneNumbers[0]}
              />
              <IconButton edge="end">
                {expandedServices.has(service.id) ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </IconButton>
            </ListItem>
            <Collapse in={expandedServices.has(service.id)}>
              <CardContent>
                {service.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ mr: 1 }} />
                    <Typography variant="body2">{service.address}</Typography>
                  </Box>
                )}
                {service.operatingHours && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Hours: {service.operatingHours}
                  </Typography>
                )}
                {service.languages && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">
                      Languages Supported:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {service.languages.map((lang) => (
                        <Chip key={lang} label={lang} size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
                {service.specializations && (
                  <Box>
                    <Typography variant="subtitle2">Specializations:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {service.specializations.map((spec) => (
                        <Chip key={spec} label={spec} size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleServiceClick(service)}
                  >
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Collapse>
          </Card>
        ))}
      </List>

      <Dialog
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedService && (
          <>
            <DialogTitle>{selectedService.name}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Contact Numbers:</Typography>
                {selectedService.phoneNumbers.map((number) => (
                  <Typography key={number} variant="body1">
                    {number}
                  </Typography>
                ))}
              </Box>
              {selectedService.address && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">Address:</Typography>
                  <Typography variant="body1">{selectedService.address}</Typography>
                </Box>
              )}
              {selectedService.operatingHours && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">Operating Hours:</Typography>
                  <Typography variant="body1">
                    {selectedService.operatingHours}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedService(null)}>Close</Button>
              {selectedService.coordinates && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    if (selectedService.coordinates) {
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${selectedService.coordinates.latitude},${selectedService.coordinates.longitude}`,
                        '_blank'
                      );
                    }
                  }}
                >
                  Open in Maps
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
