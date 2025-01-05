import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface ActivityItem {
  userId: string;
  userName: string;
  activityCount: number;
  adherenceRate: number;
  lastActive: string;
}

interface FamilyActivityCardProps {
  activities: ActivityItem[];
}

export const FamilyActivityCard: React.FC<FamilyActivityCardProps> = ({ activities }) => {
  const { trackEvent } = useAnalytics();

  React.useEffect(() => {
    trackEvent('family_activity_viewed');
  }, [trackEvent]);

  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatLastActive = (date: string) => {
    const now = new Date();
    const lastActive = new Date(date);
    const diffHours = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Family Activity</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.userId}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {activity.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium">{activity.userName}</h3>
                <p className="text-sm text-gray-500">
                  {activity.activityCount} activities • Last active{' '}
                  {formatLastActive(activity.lastActive)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${getAdherenceColor(activity.adherenceRate)}`}>
                {activity.adherenceRate}%
              </div>
              <div className="text-sm text-gray-500">Adherence</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
