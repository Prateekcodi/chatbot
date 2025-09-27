import React from 'react';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Droplets } from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';

interface Alert {
  id: number;
  alert_type: string;
  message: string;
  timestamp: string;
  level_cm: number;
  percent_full: number;
  resolved: boolean;
}

export const AlertsPage: React.FC = () => {
  const { data: alerts, isLoading, error } = useQuery<Alert[]>(
    'tank-alerts',
    () => api.getAlerts('tank01'),
    { refetchInterval: 30000 }
  );

  const handleResolveAlert = async (alertId: number) => {
    try {
      await api.resolveAlert('tank01', alertId);
      // The query will automatically refetch due to react-query
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Alerts</h2>
        <p className="text-gray-600">Unable to load alert data.</p>
      </div>
    );
  }

  const unresolvedAlerts = alerts?.filter(alert => !alert.resolved) || [];
  const resolvedAlerts = alerts?.filter(alert => alert.resolved) || [];

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'LEAK_DETECTED':
        return <Droplets className="h-5 w-5 text-red-500" />;
      case 'OVERFLOW':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'PUMP_FAULT':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'LEAK_DETECTED':
        return 'border-red-200 bg-red-50';
      case 'OVERFLOW':
        return 'border-red-200 bg-red-50';
      case 'PUMP_FAULT':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getAlertPriority = (alertType: string) => {
    switch (alertType) {
      case 'LEAK_DETECTED':
      case 'OVERFLOW':
        return 'High';
      case 'PUMP_FAULT':
        return 'Medium';
      default:
        return 'Low';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
        <p className="text-gray-600">Monitor and manage tank alerts</p>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{unresolvedAlerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{resolvedAlerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {unresolvedAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {unresolvedAlerts.map((alert) => (
              <div key={alert.id} className={`p-6 border-l-4 ${getAlertColor(alert.alert_type)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {alert.alert_type.replace('_', ' ')}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {getAlertPriority(alert.alert_type)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Level: {alert.level_cm.toFixed(1)} cm ({alert.percent_full.toFixed(1)}%)</span>
                        <span>Time: {format(new Date(alert.timestamp), 'PPpp')}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Resolved Alerts</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {resolvedAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {alert.alert_type.replace('_', ' ')}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Resolved
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Level: {alert.level_cm.toFixed(1)} cm ({alert.percent_full.toFixed(1)}%)</span>
                      <span>Time: {format(new Date(alert.timestamp), 'PPpp')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts */}
      {alerts?.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts</h3>
          <p className="text-gray-600">All systems are operating normally.</p>
        </div>
      )}
    </div>
  );
};