import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Subscription {
  tier: 'FREE' | 'BASIC' | 'PREMIUM' | 'FAMILY';
  features: string[];
  expiresAt: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      try {
        // TODO: Replace with actual API call
        const mockSubscription: Subscription = {
          tier: 'FAMILY',
          features: ['emergency_support', 'family_management', 'advanced_analytics'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        
        setSubscription(mockSubscription);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  return { subscription, loading, error };
};
