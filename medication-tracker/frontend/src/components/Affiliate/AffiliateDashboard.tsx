import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  CircularProgress,
  Button,
  useTheme,
} from '@mui/material';
import { BarChart, LineChart } from '@mui/x-charts';
import { DateTime } from 'luxon';
import { AffiliateService } from '../../services/affiliate';
import { AffiliateStats } from './AffiliateStats';
import { ReferralTable } from './ReferralTable';
import { MarketingTools } from './MarketingTools';

const affiliateService = new AffiliateService();

export const AffiliateDashboard: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
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
      const report = await affiliateService.getAffiliateReport(
        dateRange.startDate,
        dateRange.endDate
      );
      setStats(report);
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
          <Typography variant="h4" gutterBottom>
            Affiliate Dashboard
          </Typography>
        </Grid>

        {/* Stats Overview */}
        <Grid item xs={12}>
          <AffiliateStats stats={stats?.metrics} />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Earnings Over Time
            </Typography>
            <LineChart
              series={[
                {
                  data: stats?.commissions.map((c: any) => c.amount) || [],
                  label: 'Earnings',
                },
              ]}
              height={300}
              xAxis={[{
                data: stats?.commissions.map((c: any) => 
                  DateTime.fromJSDate(new Date(c.createdAt)).toFormat('MM/dd')
                ) || [],
                scaleType: 'band',
              }]}
            />
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Referrals by Source
            </Typography>
            <BarChart
              series={[
                {
                  data: stats?.referrals.reduce((acc: any, ref: any) => {
                    acc[ref.source] = (acc[ref.source] || 0) + 1;
                    return acc;
                  }, {}),
                },
              ]}
              height={300}
              xAxis={[{ scaleType: 'band', data: ['Website', 'Social', 'Email'] }]}
            />
          </Card>
        </Grid>

        {/* Marketing Tools */}
        <Grid item xs={12}>
          <MarketingTools />
        </Grid>

        {/* Referral Table */}
        <Grid item xs={12}>
          <ReferralTable referrals={stats?.referrals || []} />
        </Grid>
      </Grid>
    </Box>
  );
};
