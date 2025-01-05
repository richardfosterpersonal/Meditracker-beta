import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AuditLogger, AuditLogEntry } from '../../utils/auditLog';
import { format } from 'date-fns';

interface ComplianceReportProps {
  userId: string;
}

interface ComplianceData {
  totalMedications: number;
  adherenceRate: number;
  missedDoses: number;
  lateAdministrations: number;
  errors: number;
}

const ComplianceReport: React.FC<ComplianceReportProps> = ({ userId }) => {
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ComplianceData | null>(null);
  const [detailedLogs, setDetailedLogs] = useState<AuditLogEntry[]>([]);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const [compliance, logs] = await Promise.all([
        AuditLogger.generateComplianceReport(userId, startDate, endDate),
        AuditLogger.getMedicationLogs(userId, startDate, endDate),
      ]);

      setReportData(compliance);
      setDetailedLogs(logs);
    } catch (error) {
      setError('Failed to generate compliance report');
      console.error('Report generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData || !detailedLogs) return;

    const report = {
      metadata: {
        userId,
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
      summary: reportData,
      detailedLogs,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    generateReport();
  }, [userId, startDate, endDate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Medication Compliance Report
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(date) => date && setStartDate(date)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(date) => date && setEndDate(date)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="contained"
            onClick={generateReport}
            sx={{ mt: 1 }}
          >
            Refresh Report
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            onClick={exportReport}
            disabled={!reportData}
            sx={{ mt: 1 }}
          >
            Export Report
          </Button>
        </Grid>
      </Grid>

      {reportData && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Adherence Rate
                  </Typography>
                  <Typography variant="h4">
                    {reportData.adherenceRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Missed Doses
                  </Typography>
                  <Typography variant="h4">
                    {reportData.missedDoses}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Late Administrations
                  </Typography>
                  <Typography variant="h4">
                    {reportData.lateAdministrations}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Medications
                  </Typography>
                  <Typography variant="h4">
                    {reportData.totalMedications}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Detailed Medication Log
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date/Time</TableCell>
                  <TableCell>Medication</TableCell>
                  <TableCell>Scheduled Time</TableCell>
                  <TableCell>Actual Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailedLogs.map((log) => (
                  <TableRow key={log.timestamp}>
                    <TableCell>
                      {format(new Date(log.timestamp), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      {log.details.medicationName} ({log.details.dosage})
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.details.scheduledTime!), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.details.actualTime!), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      {log.details.success ? (
                        <Typography color="success.main">Taken</Typography>
                      ) : (
                        <Typography color="error.main">Missed</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default ComplianceReport;
