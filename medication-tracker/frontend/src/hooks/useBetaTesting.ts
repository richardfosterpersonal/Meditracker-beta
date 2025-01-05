import { useState, useEffect, useCallback } from 'react';

interface BetaPhaseDetails {
  status: string;
  validation: {
    can_progress: boolean;
    validation_results: Record<string, any>;
  };
  feedback: Array<{
    type: string;
    summary: string;
    details: string;
    timestamp: string;
  }>;
}

interface TesterOverview {
  active_testers: number;
  feedback_summary: {
    bugs: number;
    features: number;
    usability: number;
  };
  top_issues: string[];
  recent_activity: Array<{
    type: string;
    summary: string;
    timestamp: string;
  }>;
}

interface ActionItem {
  type: 'validation' | 'issue';
  priority: 'high' | 'medium' | 'low';
  description: string;
  details: any;
}

interface UseBetaTestingReturn {
  currentPhase: string | null;
  phaseDetails: BetaPhaseDetails | null;
  testerOverview: TesterOverview | null;
  actionItems: ActionItem[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useBetaTesting = (): UseBetaTestingReturn => {
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [phaseDetails, setPhaseDetails] = useState<BetaPhaseDetails | null>(null);
  const [testerOverview, setTesterOverview] = useState<TesterOverview | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [summaryRes, testerRes, actionsRes] = await Promise.all([
        fetch('/api/beta/summary'),
        fetch('/api/beta/testers'),
        fetch('/api/beta/actions')
      ]);

      if (!summaryRes.ok || !testerRes.ok || !actionsRes.ok) {
        throw new Error('Failed to fetch beta testing data');
      }

      const [summaryData, testerData, actionsData] = await Promise.all([
        summaryRes.json(),
        testerRes.json(),
        actionsRes.json()
      ]);

      setCurrentPhase(summaryData.current_phase);

      // Fetch phase details if we have a current phase
      if (summaryData.current_phase) {
        const phaseRes = await fetch(`/api/beta/phase/${summaryData.current_phase}`);
        if (phaseRes.ok) {
          const phaseData = await phaseRes.json();
          setPhaseDetails(phaseData);
        }
      }

      setTesterOverview(testerData);
      setActionItems(actionsData.actions);

    } catch (err) {
      setError('Failed to fetch beta testing data. Please try again.');
      console.error('Beta testing data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    currentPhase,
    phaseDetails,
    testerOverview,
    actionItems,
    loading,
    error,
    refreshData: fetchData
  };
};

export default useBetaTesting;
