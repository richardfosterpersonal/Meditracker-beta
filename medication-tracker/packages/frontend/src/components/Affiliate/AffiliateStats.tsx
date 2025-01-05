import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  People,
  AttachMoney,
  BarChart,
} from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  color,
}) => {
  const theme = useTheme();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Box
              sx={{
                backgroundColor: color || theme.palette.primary.main,
                borderRadius: 1,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h6" component="div">
              {value}
            </Typography>
            <Typography color="textSecondary" variant="body2">
              {title}
            </Typography>
          </Grid>
          {trend !== undefined && (
            <Grid item>
              <Typography
                variant="body2"
                color={trend >= 0 ? 'success.main' : 'error.main'}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <TrendingUp
                  sx={{
                    fontSize: '1rem',
                    mr: 0.5,
                    transform: trend < 0 ? 'rotate(180deg)' : 'none',
                  }}
                />
                {Math.abs(trend)}%
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

interface AffiliateStatsProps {
  stats: {
    totalReferrals: number;
    totalTransactions: number;
    totalRevenue: number;
    totalCommissions: number;
    conversionRate: number;
  };
}

export const AffiliateStats: React.FC<AffiliateStatsProps> = ({ stats }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Total Referrals"
          value={stats.totalReferrals}
          icon={<People sx={{ color: 'white' }} />}
          color={theme.palette.primary.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Conversion Rate"
          value={`${(stats.conversionRate * 100).toFixed(1)}%`}
          icon={<BarChart sx={{ color: 'white' }} />}
          color={theme.palette.success.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<AttachMoney sx={{ color: 'white' }} />}
          color={theme.palette.warning.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Total Commissions"
          value={`$${stats.totalCommissions.toLocaleString()}`}
          icon={<TrendingUp sx={{ color: 'white' }} />}
          color={theme.palette.info.main}
        />
      </Grid>
    </Grid>
  );
};
