import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  unit: string;
}

interface SystemHealthCardProps {
  metrics: HealthMetric[];
  lastUpdated: string;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ metrics, lastUpdated }) => {
  const { trackEvent } = useAnalytics();

  React.useEffect(() => {
    trackEvent('system_health_viewed');
  }, [trackEvent]);

  const getStatusColor = (value: number, threshold: number) => {
    if (value <= threshold * 0.7) return 'text-green-600';
    if (value <= threshold * 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIndicator = (value: number, threshold: number) => {
    const color = getStatusColor(value, threshold);
    return (
      <div className={`w-3 h-3 rounded-full ${color.replace('text-', 'bg-')}`} />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">System Health</h2>
        <span className="text-sm text-gray-500">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      </div>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getStatusIndicator(metric.value, metric.threshold)}
              <span className="font-medium">{metric.name}</span>
            </div>
            <div className="text-right">
              <div className={`font-bold ${getStatusColor(metric.value, metric.threshold)}`}>
                {metric.value}{metric.unit}
              </div>
              <div className="text-sm text-gray-500">
                Threshold: {metric.threshold}{metric.unit}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
