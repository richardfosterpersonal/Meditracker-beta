import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { inventoryService } from '../../services/inventory';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer
} from 'recharts';

interface InventoryAnalyticsProps {
  medicationId: string;
}

interface UsageData {
  date: string;
  quantity: number;
  expected: number;
}

interface SupplySummary {
  totalMedications: number;
  lowSupplyCount: number;
  averageDaysRemaining: number;
  nextRefillDate: string;
}

export const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ medicationId }) => {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [supplySummary, setSupplySummary] = useState<SupplySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [medicationId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch usage history and supply summary
      const [usageHistory, summary] = await Promise.all([
        inventoryService.getUsageHistory(medicationId),
        inventoryService.getSupplySummary(medicationId)
      ]);

      setUsageData(usageHistory);
      setSupplySummary(summary);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const blob = await inventoryService.exportInventoryReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return <Typography>Loading analytics...</Typography>;
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Medications
              </Typography>
              <Typography variant="h4">
                {supplySummary?.totalMedications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Supply Alert
              </Typography>
              <Typography variant="h4" color="error">
                {supplySummary?.lowSupplyCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg. Days Remaining
              </Typography>
              <Typography variant="h4">
                {supplySummary?.averageDaysRemaining.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Next Refill Due
              </Typography>
              <Typography variant="h4">
                {new Date(supplySummary?.nextRefillDate || '').toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Usage Trend Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Usage Trends
              <Tooltip title="View usage patterns over time">
                <TrendingUpIcon sx={{ ml: 1, verticalAlign: 'bottom' }} />
              </Tooltip>
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportReport}
            >
              Export Report
            </Button>
          </Box>
          <Box height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <ChartTooltip />
                <Line
                  type="monotone"
                  dataKey="quantity"
                  stroke="#8884d8"
                  name="Actual Usage"
                />
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="#82ca9d"
                  name="Expected Usage"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Analytics Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Usage Details
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actual Usage</TableCell>
                <TableCell align="right">Expected Usage</TableCell>
                <TableCell align="right">Variance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usageData.map((row) => {
                const variance = row.quantity - row.expected;
                return (
                  <TableRow key={row.date}>
                    <TableCell>
                      {new Date(row.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell align="right">{row.expected}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: variance < 0 ? 'error.main' : 'success.main'
                      }}
                    >
                      {variance > 0 ? '+' : ''}{variance}
                      {Math.abs(variance) > row.expected * 0.1 && (
                        <Tooltip title="Significant variance detected">
                          <WarningIcon
                            sx={{ ml: 1, verticalAlign: 'bottom', fontSize: 'small' }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};
