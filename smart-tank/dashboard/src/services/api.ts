import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface TankStatus {
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

export interface TelemetryData {
  timestamp: string;
  level_cm: number;
  percent_full: number;
  flow_l_min: number;
  pump_state: string;
  temperature_c: number;
  tds_ppm: number;
}

export interface Alert {
  id: number;
  alert_type: string;
  message: string;
  timestamp: string;
  level_cm: number;
  percent_full: number;
  resolved: boolean;
}

export interface Prediction {
  date: string;
  predicted_consumption: number;
}

export const api = {
  // Tank status
  getTankStatus: async (deviceId: string): Promise<TankStatus> => {
    const response = await api.get(`/devices/${deviceId}/status`);
    return response.data;
  },

  // Telemetry data
  getTelemetry: async (deviceId: string, hours: number = 24): Promise<TelemetryData[]> => {
    const response = await api.get(`/devices/${deviceId}/telemetry?hours=${hours}`);
    return response.data;
  },

  // Alerts
  getAlerts: async (deviceId: string, resolved?: boolean): Promise<Alert[]> => {
    const params = resolved !== undefined ? { resolved } : {};
    const response = await api.get(`/devices/${deviceId}/alerts`, { params });
    return response.data;
  },

  resolveAlert: async (deviceId: string, alertId: number): Promise<void> => {
    await api.post(`/devices/${deviceId}/alerts/${alertId}/resolve`);
  },

  // Predictions
  getPredictions: async (deviceId: string, daysAhead: number = 7): Promise<{ predictions: Prediction[] }> => {
    const response = await api.get(`/devices/${deviceId}/predictions?days_ahead=${daysAhead}`);
    return response.data;
  },

  // Device control
  setPumpState: async (deviceId: string, state: boolean): Promise<void> => {
    await api.post(`/devices/${deviceId}/control`, { pump: state });
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export { api };