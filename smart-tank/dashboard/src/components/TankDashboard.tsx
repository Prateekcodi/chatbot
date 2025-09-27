import React from 'react';
import { useQuery } from 'react-query';
import { 
  Droplets, 
  Thermometer, 
  Gauge, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays } from 'date-fns';
import { api } from '../services/api';
import { StatusCard } from './StatusCard';
import { LoadingSpinner } from './LoadingSpinner';

interface TankStatus {
  device_id: string;
  current_level: number;
  percent_full: number;
  flow_rate: number;
  pump_state: boolean;
  temperature: number;
  tds: number;
  last_update: string;
  days_until_empty?: number;
  consumption_today?: number;
  consumption_week?: number;
}

interface TelemetryData {
  timestamp: string;
  level_cm: number;
  percent_full: number;
  flow_l_min: number;
  pump_state: string;
  temperature_c: number;
  tds_ppm: number;
}

export const TankDashboard: React.FC = () => {
  const { data: status, isLoading: statusLoading, error: statusError } = useQuery<TankStatus>(
    'tank-status',
    () => api.getTankStatus('tank01'),
    { refetchInterval: 30000 }
  );

  const { data: telemetry, isLoading: telemetryLoading } = useQuery<TelemetryData[]>(
    'tank-telemetry',
    () => api.getTelemetry('tank01', 24),
    { refetchInterval: 30000 }
  );

  const { data: predictions } = useQuery(
    'tank-predictions',
    () => api.getPredictions('tank01', 7)
  );

  if (statusLoading || telemetryLoading) {
    return <LoadingSpinner />;
  }

  if (statusError) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
        <p className="text-gray-600">Unable to connect to the tank monitoring system.</p>
      </div>
    );
  }

  const chartData = telemetry?.map(point => ({
    time: format(new Date(point.timestamp), 'HH:mm'),
    level: point.percent_full,
    flow: point.flow_l_min,
    temperature: point.temperature_c,
    tds: point.tds_ppm
  })) || [];

  const getStatusColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 50) return 'text-yellow-600';
    if (percent >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusIcon = (percent: number) => {
    if (percent >= 80) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (percent >= 50) return <Activity className="h-5 w-5 text-yellow-600" />;
    if (percent >= 20) return <TrendingDown className="h-5 w-5 text-orange-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tank Monitor</h1>
          <p className="text-gray-600">Real-time water tank monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(status?.percent_full || 0)}
          <span className={`text-2xl font-bold ${getStatusColor(status?.percent_full || 0)}`}>
            {status?.percent_full?.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Tank Level"
          value={`${status?.current_level?.toFixed(1)} cm`}
          subtitle={`${status?.percent_full?.toFixed(1)}% full`}
          icon={<Droplets className="h-6 w-6" />}
          color="blue"
        />
        
        <StatusCard
          title="Flow Rate"
          value={`${status?.flow_rate?.toFixed(2)} L/min`}
          subtitle={status?.pump_state ? "Pump ON" : "Pump OFF"}
          icon={<Gauge className="h-6 w-6" />}
          color={status?.pump_state ? "green" : "gray"}
        />
        
        <StatusCard
          title="Temperature"
          value={`${status?.temperature?.toFixed(1)}°C`}
          subtitle="Water temperature"
          icon={<Thermometer className="h-6 w-6" />}
          color="orange"
        />
        
        <StatusCard
          title="Days Remaining"
          value={status?.days_until_empty ? `${status.days_until_empty.toFixed(1)} days` : "Calculating..."}
          subtitle="Until empty"
          icon={<Clock className="h-6 w-6" />}
          color={status?.days_until_empty && status.days_until_empty < 2 ? "red" : "blue"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tank Level (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Level']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="level" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Flow Rate Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Flow Rate (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${value.toFixed(2)} L/min`, 'Flow Rate']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="flow" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consumption Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Consumption Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {status?.consumption_today?.toFixed(1) || 0} L
            </div>
            <div className="text-sm text-gray-600">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {status?.consumption_week?.toFixed(1) || 0} L
            </div>
            <div className="text-sm text-gray-600">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {status?.consumption_week ? (status.consumption_week / 7).toFixed(1) : 0} L
            </div>
            <div className="text-sm text-gray-600">Daily Average</div>
          </div>
        </div>
      </div>

      {/* Predictions */}
      {predictions && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Consumption Prediction</h3>
          <div className="space-y-2">
            {predictions.predictions?.map((prediction: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">
                  {format(new Date(prediction.date), 'EEEE, MMM d')}
                </span>
                <span className="font-semibold text-blue-600">
                  {prediction.predicted_consumption.toFixed(1)} L
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {status?.last_update ? format(new Date(status.last_update), 'PPpp') : 'Never'}
      </div>
    </div>
  );
};