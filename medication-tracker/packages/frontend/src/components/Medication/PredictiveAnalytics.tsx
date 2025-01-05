import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { inventoryService } from '../../services/inventory';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface PredictiveAnalyticsProps {
  medicationId: string;
}

interface PredictionData {
  date: string;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

interface RefillPrediction {
  nextRefillDate: string;
  daysUntilRefill: number;
  confidence: number;
  factors: string[];
}

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ medicationId }) => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [refillPrediction, setRefillPrediction] = useState<RefillPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, [medicationId]);

  const fetchPredictions = async () => {
    try {
      const [usagePredictions, refillData] = await Promise.all([
        inventoryService.getPredictedUsage(medicationId),
        inventoryService.getPredictedRefill(medicationId)
      ]);
      setPredictions(usagePredictions);
      setRefillPrediction(refillData);
      setError(null);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Refill Prediction Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Next Refill Prediction
              </Typography>
              {refillPrediction && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" color="primary">
                      {refillPrediction.daysUntilRefill} days
                    </Typography>
                    <Typography color="textSecondary">
                      until next predicted refill
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`${refillPrediction.confidence}% confidence`}
                      color={getConfidenceColor(refillPrediction.confidence)}
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      icon={<ScheduleIcon />}
                      label={new Date(refillPrediction.nextRefillDate).toLocaleDateString()}
                    />
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Contributing Factors:
                  </Typography>
                  <List dense>
                    {refillPrediction.factors.map((factor, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <TrendingUpIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={factor} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Prediction Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Predicted Usage Pattern
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={predictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(2), 'Quantity']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      name="Predicted Usage"
                    />
                    <Area
                      type="monotone"
                      dataKey="upperBound"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.1}
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="lowerBound"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.1}
                      name="Lower Bound"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Anomaly Warnings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <WarningIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Usage Pattern Anomalies
              </Typography>
              <List>
                {predictions
                  .filter((p: any) => p.anomaly)
                  .map((anomaly: any, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Unusual pattern detected on ${new Date(
                            anomaly.date
                          ).toLocaleDateString()}`}
                          secondary={anomaly.anomalyDescription}
                        />
                      </ListItem>
                      {index < predictions.filter((p: any) => p.anomaly).length - 1 && (
                        <Divider />
                      )}
                    </React.Fragment>
                  ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
