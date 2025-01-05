import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  CircularProgress,
  Button,
  useTheme,
  Paper,
  Tab,
  Tabs,
} from '@mui/material';
import { BarChart, LineChart } from '@mui/x-charts';
import { DateTime } from 'luxon';
import { AffiliateService } from '../../../services/affiliate';
import { AdminAffiliateStats } from './AdminAffiliateStats';
import { AffiliateTable } from './AffiliateTable';
import { AffiliatePrograms } from './AffiliatePrograms';
import { PaymentManagement } from './PaymentManagement';

const affiliateService = new AffiliateService();

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const AdminAffiliateDashboard: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: DateTime.now().minus({ days: 30 }).toJSDate(),
    endDate: DateTime.now().toJSDate(),
  });

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [affiliateStats, paymentStats] = await Promise.all([
        affiliateService.getAdminAffiliateStats(dateRange),
        affiliateService.getAdminPaymentStats(dateRange),
      ]);
      setStats({
        affiliates: affiliateStats,
        payments: paymentStats,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">
              Affiliate Management
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setTabValue(1)} // Switch to Programs tab
            >
              Manage Programs
            </Button>
          </Box>
        </Grid>

        {/* Navigation Tabs */}
        <Grid item xs={12}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Overview" />
              <Tab label="Programs" />
              <Tab label="Affiliates" />
              <Tab label="Payments" />
            </Tabs>
          </Paper>
        </Grid>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <AdminAffiliateStats stats={stats?.affiliates} />
            </Grid>

            {/* Revenue Chart */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Revenue from Affiliates
                </Typography>
                <LineChart
                  series={[
                    {
                      data: stats?.affiliates?.revenueData || [],
                      label: 'Revenue',
                    },
                  ]}
                  height={300}
                  xAxis={[{
                    data: stats?.affiliates?.dates || [],
                    scaleType: 'band',
                  }]}
                />
              </Card>
            </Grid>

            {/* Commission Chart */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Commission Payouts
                </Typography>
                <BarChart
                  series={[
                    {
                      data: stats?.payments?.commissionData || [],
                      label: 'Commissions',
                    },
                  ]}
                  height={300}
                  xAxis={[{
                    data: stats?.payments?.dates || [],
                    scaleType: 'band',
                  }]}
                />
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Programs Tab */}
        <TabPanel value={tabValue} index={1}>
          <AffiliatePrograms />
        </TabPanel>

        {/* Affiliates Tab */}
        <TabPanel value={tabValue} index={2}>
          <AffiliateTable />
        </TabPanel>

        {/* Payments Tab */}
        <TabPanel value={tabValue} index={3}>
          <PaymentManagement />
        </TabPanel>
      </Grid>
    </Box>
  );
};
