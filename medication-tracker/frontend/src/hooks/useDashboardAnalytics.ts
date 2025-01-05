import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TimeRange,
  AdherenceMetrics,
  RefillMetrics,
  InteractionMetrics,
  SystemMetrics
} from '../types/analytics';

interface DashboardAnalytics {
  adherenceMetrics: AdherenceMetrics | null;
  refillMetrics: RefillMetrics | null;
  interactionMetrics: InteractionMetrics | null;
  systemMetrics: SystemMetrics | null;
  loading: boolean;
  error: Error | null;
}

export const useDashboardAnalytics = (timeRange: TimeRange): DashboardAnalytics => {
  const [adherenceMetrics, setAdherenceMetrics] = useState<AdherenceMetrics | null>(null);
  const [refillMetrics, setRefillMetrics] = useState<RefillMetrics | null>(null);
  const [interactionMetrics, setInteractionMetrics] = useState<InteractionMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all metrics in parallel
        const [adherence, refills, interactions, system] = await Promise.all([
          api.get<AdherenceMetrics>('/analytics/medications/adherence', {
            params: { timeRange }
          }),
          api.get<RefillMetrics>('/analytics/medications/refills', {
            params: { timeRange }
          }),
          api.get<InteractionMetrics>('/analytics/medications/interactions', {
            params: { timeRange }
          }),
          api.get<SystemMetrics>('/analytics/system/metrics', {
            params: { timeRange }
          })
        ]);

        setAdherenceMetrics(adherence.data);
        setRefillMetrics(refills.data);
        setInteractionMetrics(interactions.data);
        setSystemMetrics(system.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch analytics data'));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Set up polling for real-time updates
    const pollInterval = setInterval(fetchAnalytics, 60000); // Poll every minute

    return () => {
      clearInterval(pollInterval);
    };
  }, [timeRange]);

  return {
    adherenceMetrics,
    refillMetrics,
    interactionMetrics,
    systemMetrics,
    loading,
    error
  };
};
