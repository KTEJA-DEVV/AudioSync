import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon,
  CheckIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { toast } from 'react-toastify';

// Setting Input Component
const SettingInput = ({ setting, value, onChange, onSave, saving }) => {
  const [localValue, setLocalValue] = useState(value);
  const hasChanged = JSON.stringify(localValue) !== JSON.stringify(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = async () => {
    await onSave(setting.key, localValue);
    setLocalValue(localValue);
  };

  const renderInput = () => {
    switch (setting.valueType) {
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localValue}
              onChange={(e) => {
                setLocalValue(e.target.checked);
                onSave(setting.key, e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        );

      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={localValue}
              onChange={(e) => setLocalValue(parseFloat(e.target.value))}
              min={setting.min}
              max={setting.max}
              className="w-32 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {hasChanged && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
              >
                {saving ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckIcon className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        );

      case 'string':
        return (
          <div className="flex items-center gap-2">
            {setting.options ? (
              <select
                value={localValue}
                onChange={(e) => {
                  setLocalValue(e.target.value);
                  onSave(setting.key, e.target.value);
                }}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                {setting.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="text"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  className="w-64 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {hasChanged && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                  >
                    {saving ? (
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckIcon className="w-5 h-5" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        );

      default:
        return <span className="text-sm text-gray-500">Unsupported type</span>;
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {setting.label}
          </h4>
          {setting.description && (
            <div className="group relative">
              <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-xs text-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                {setting.description}
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{setting.key}</p>
      </div>
      <div>{renderInput()}</div>
    </div>
  );
};

// Category Card
const CategoryCard = ({ category, settings, values, onSave, saving }) => {
  const categoryLabels = {
    general: 'General Settings',
    sessions: 'Session Settings',
    voting: 'Voting Configuration',
    rewards: 'Rewards & Reputation',
    moderation: 'Moderation',
    limits: 'Limits & Quotas',
    features: 'Features',
  };

  const categoryIcons = {
    general: '⚙️',
    sessions: '🎵',
    voting: '🗳️',
    rewards: '🏆',
    moderation: '🛡️',
    limits: '📊',
    features: '✨',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span>{categoryIcons[category] || '📋'}</span>
          {categoryLabels[category] || category}
        </h3>
      </div>
      <div className="px-6">
        {settings.map((setting) => (
          <SettingInput
            key={setting.key}
            setting={setting}
            value={values[setting.key]}
            onChange={(newValue) => {}}
            onSave={onSave}
            saving={saving === setting.key}
          />
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      const grouped = response.data.data;
      setSettings(grouped);

      // Extract values
      const vals = {};
      Object.values(grouped).flat().forEach((s) => {
        vals[s.key] = s.value;
      });
      setValues(vals);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, value) => {
    try {
      setSaving(key);
      await api.put(`/admin/settings/${key}`, { value });
      setValues((prev) => ({ ...prev, [key]: value }));
      toast.success('Setting saved');
    } catch (err) {
      console.error('Failed to save setting:', err);
      toast.error('Failed to save setting');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configure platform settings and defaults
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Settings Categories */}
      <div className="grid gap-6">
        {Object.entries(settings).map(([category, categorySettings]) => (
          <CategoryCard
            key={category}
            category={category}
            settings={categorySettings}
            values={values}
            onSave={handleSave}
            saving={saving}
          />
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
