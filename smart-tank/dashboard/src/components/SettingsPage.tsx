import React, { useState } from 'react';
import { Settings, Save, AlertTriangle, Droplets, Gauge } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    tankHeight: 150,
    tankDiameter: 100,
    leakThreshold: 1.0,
    overflowThreshold: 95.0,
    readingInterval: 30,
    mqttBroker: 'localhost',
    mqttPort: 1883,
    notifications: true,
    telegramEnabled: false,
    telegramToken: '',
    telegramChatId: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // Show success message
  };

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your tank monitoring system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tank Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Droplets className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Tank Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tank Height (cm)
              </label>
              <input
                type="number"
                value={settings.tankHeight}
                onChange={(e) => handleInputChange('tankHeight', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tank Diameter (cm)
              </label>
              <input
                type="number"
                value={settings.tankDiameter}
                onChange={(e) => handleInputChange('tankDiameter', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Calculated Capacity:</strong> {Math.round(Math.PI * Math.pow(settings.tankDiameter / 2, 2) * settings.tankHeight / 1000)} liters
              </p>
            </div>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Alert Thresholds</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leak Detection Threshold (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.leakThreshold}
                onChange={(e) => handleInputChange('leakThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when level drops by this percentage without pump running
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overflow Threshold (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.overflowThreshold}
                onChange={(e) => handleInputChange('overflowThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-stop pump when tank reaches this level
              </p>
            </div>
          </div>
        </div>

        {/* Reading Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Gauge className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Reading Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Interval (seconds)
              </label>
              <input
                type="number"
                value={settings.readingInterval}
                onChange={(e) => handleInputChange('readingInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                How often to read sensors (30-300 seconds recommended)
              </p>
            </div>
          </div>
        </div>

        {/* MQTT Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">MQTT Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MQTT Broker
              </label>
              <input
                type="text"
                value={settings.mqttBroker}
                onChange={(e) => handleInputChange('mqttBroker', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MQTT Port
              </label>
              <input
                type="number"
                value={settings.mqttPort}
                onChange={(e) => handleInputChange('mqttPort', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleInputChange('notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.telegramEnabled}
                onChange={(e) => handleInputChange('telegramEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable Telegram notifications
              </label>
            </div>

            {settings.telegramEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={settings.telegramToken}
                    onChange={(e) => handleInputChange('telegramToken', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter bot token"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={settings.telegramChatId}
                    onChange={(e) => handleInputChange('telegramChatId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter chat ID"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};