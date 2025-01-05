import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  Tabs,
  Tab,
  IconButton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  FormControl,
  Select,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { api } from '../../services/api';
import { PatientMedicationOverview } from './PatientMedicationOverview';
import { AlertManagement } from './AlertManagement';

interface Patient {
  id: string;
  name: string;
  lastCheck: string;
  compliance: number;
  status: 'normal' | 'warning' | 'critical';
  missedDoses: number;
  upcomingDoses: number;
  medications: number;
  lastNotification: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`carer-tabpanel-${index}`}
      aria-labelledby={`carer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ErrorBoundaryProps {
  componentName: string;
  children: React.ReactNode;
}

function ErrorBoundary(props: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        An error occurred in the {props.componentName} component.
      </Alert>
    );
  }

  return (
    <React.Fragment>
      {props.children}
    </React.Fragment>
  );
}

export const CarerDashboard: React.FC = () => {
  const theme = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('/api/v1/carer/patients');
        setPatients(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPatients, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, patientId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPatient(patientId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPatient(null);
  };

  const handleContact = async (type: 'phone' | 'message') => {
    if (!selectedPatient) return;
    try {
      await api.post(`/api/v1/carer/contact/${selectedPatient}`, { type });
      // Handle success feedback
    } catch (err) {
      console.error(`Error contacting patient: ${err}`);
      setError('Failed to initiate contact');
    }
    handleMenuClose();
  };

  const handleExportData = async () => {
    if (!selectedPatient) return;
    try {
      const response = await api.get(`/api/v1/carer/export/${selectedPatient}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patient-report-${selectedPatient}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export patient data');
    }
    handleMenuClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      default:
        return theme.palette.success.main;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Patient Overview Section */}
        <Grid item xs={12}>
          <ErrorBoundary componentName="PatientOverview">
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Patient Overview
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Patient</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Compliance</TableCell>
                        <TableCell>Missed Doses</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>{patient.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={patient.status}
                              color={
                                patient.status === 'normal'
                                  ? 'success'
                                  : patient.status === 'warning'
                                  ? 'warning'
                                  : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress
                                variant="determinate"
                                value={patient.compliance}
                                size={24}
                                color={patient.compliance >= 80 ? 'success' : 'warning'}
                              />
                              <Typography variant="body2">
                                {patient.compliance}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography color={patient.missedDoses > 0 ? 'error' : 'textPrimary'}>
                              {patient.missedDoses}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              onClick={(e) => handleMenuClick(e, patient.id)}
                              size="small"
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </ErrorBoundary>
        </Grid>

        {/* Alert Management Section */}
        <Grid item xs={12} md={6}>
          <ErrorBoundary componentName="AlertManagement">
            <AlertManagement />
          </ErrorBoundary>
        </Grid>

        {/* Patient Medication Details */}
        <Grid item xs={12} md={6}>
          {selectedPatient && (
            <ErrorBoundary componentName="PatientMedicationOverview">
              <PatientMedicationOverview patientId={selectedPatient} />
            </ErrorBoundary>
          )}
        </Grid>
      </Grid>

      {/* Patient Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleContact('phone')}>
          <PhoneIcon sx={{ mr: 1 }} /> Call Patient
        </MenuItem>
        <MenuItem onClick={() => handleContact('message')}>
          <MessageIcon sx={{ mr: 1 }} /> Message Patient
        </MenuItem>
      </Menu>
    </Box>
  );
};
