import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from './useAuth';
import { api } from '../services/api';

interface ActionBadges {
  reminders: number;
  refills: number;
  interactions: number;
}

export const useQuickActionBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<ActionBadges>({
    reminders: 0,
    refills: 0,
    interactions: 0,
  });

  // Initialize WebSocket connection
  const { lastMessage } = useWebSocket(`/api/v1/ws/notifications/${user?.id}`);

  const fetchBadgeCounts = async () => {
    try {
      const [reminders, refills, interactions] = await Promise.all([
        api.get('/api/v1/reminders/pending-count'),
        api.get('/api/v1/medications/refills-needed-count'),
        api.get('/api/v1/medications/interactions-count'),
      ]);

      setBadges({
        reminders: reminders.data.count,
        refills: refills.data.count,
        interactions: interactions.data.count,
      });
    } catch (error) {
      console.error('Error fetching badge counts:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchBadgeCounts();
    }
  }, [user?.id]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        switch (data.type) {
          case 'REMINDER_UPDATE':
          case 'MEDICATION_REFILL':
          case 'DRUG_INTERACTION':
            fetchBadgeCounts();
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  return badges;
};
