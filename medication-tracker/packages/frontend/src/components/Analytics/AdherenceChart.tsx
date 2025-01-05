import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAnalytics } from '../../hooks/useAnalytics';
import { format } from 'date-fns';

interface AdherenceData {
  date: string;
  adherenceRate: number;
  missedDoses: number;
  totalDoses: number;
}

interface AdherenceChartProps {
  data: AdherenceData[];
  timeRange: '7d' | '30d' | '90d';
}

export const AdherenceChart: React.FC<AdherenceChartProps> = ({ data, timeRange }) => {
  const { trackEvent } = useAnalytics();

  React.useEffect(() => {
    trackEvent('adherence_chart_viewed', { timeRange });
  }, [timeRange, trackEvent]);

  const formatXAxis = (tickItem: string) => {
    return format(new Date(tickItem), 'MMM d');
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'adherenceRate') {
      return [`${value}%`, 'Adherence Rate'];
    }
    return [value, name === 'missedDoses' ? 'Missed Doses' : 'Total Doses'];
  };

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Medication Adherence</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="left" domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="adherenceRate"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            name="Adherence Rate"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="missedDoses"
            stroke="#ff0000"
            name="Missed Doses"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalDoses"
            stroke="#82ca9d"
            name="Total Doses"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
