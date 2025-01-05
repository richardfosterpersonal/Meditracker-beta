import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  useTheme,
  Grid,
  Chip,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { PRICING_TIERS } from '../../constants/subscription';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface Props {
  message: string;
  recommendedTier: string;
  showFeatures?: boolean;
}

export default function UpgradePrompt({ message, recommendedTier, showFeatures = true }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const recommendedPlan = PRICING_TIERS[recommendedTier];
  const currentPlan = subscription ? PRICING_TIERS[subscription.tier] : PRICING_TIERS.FREE;

  const handleUpgrade = () => {
    navigate('/settings/subscription', { 
      state: { recommendedTier, source: 'upgrade_prompt' } 
    });
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${theme.palette.primary.main}`,
        background: `linear-gradient(45deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.light}22 100%)`,
      }}
    >
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={showFeatures ? 8 : 12}>
          <Box display="flex" alignItems="center" mb={2}>
            <ArrowUpwardIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" color="primary">
              Upgrade Recommended
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {message}
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Chip
              label={`Current: ${currentPlan.name}`}
              variant="outlined"
              size="small"
            />
            <ArrowUpwardIcon fontSize="small" color="action" />
            <Chip
              label={`Recommended: ${recommendedPlan.name}`}
              color="primary"
              size="small"
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpgrade}
            sx={{ borderRadius: 2 }}
          >
            Upgrade Now
          </Button>
        </Grid>

        {showFeatures && (
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                p: 2,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {recommendedPlan.name} Features:
              </Typography>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                {recommendedPlan.features.map((feature, index) => (
                  <li key={index}>
                    <Typography variant="body2">{feature}</Typography>
                  </li>
                ))}
              </ul>
              <Typography variant="caption" color="textSecondary">
                Starting at ${recommendedPlan.basePrice}/month
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}
