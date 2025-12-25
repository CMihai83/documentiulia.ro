'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface SessionPreferences {
  userId: string;
  autoLogoutTimeout: number;
  maxConcurrentSessions: number;
  notifyNewDevice: boolean;
  notifySuspiciousActivity: boolean;
  trustedDevices: string[];
}

interface SessionSettingsProps {
  onSave?: (preferences: SessionPreferences) => void;
}

export default function SessionSettings({ onSave }: SessionSettingsProps) {
  const t = useTranslations('sessions');
  const [preferences, setPreferences] = useState<SessionPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/sessions/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else {
        // Use default preferences for demo
        setPreferences(getDefaultPreferences());
      }
    } catch (error) {
      console.error('Failed to fetch session preferences:', error);
      // Use default preferences for demo
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const validatePreferences = (prefs: SessionPreferences): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (prefs.autoLogoutTimeout < 5 || prefs.autoLogoutTimeout > 1440) {
      newErrors.autoLogoutTimeout = t('timeoutValidationError');
    }

    if (prefs.maxConcurrentSessions < 1 || prefs.maxConcurrentSessions > 10) {
      newErrors.maxConcurrentSessions = t('maxSessionsValidationError');
    }

    return newErrors;
  };

  const handleSave = async () => {
    if (!preferences) return;

    const validationErrors = validatePreferences(preferences);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setSaved(false);
    setErrors({});

    try {
      const response = await fetch('/api/v1/sessions/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoLogoutTimeout: preferences.autoLogoutTimeout,
          maxConcurrentSessions: preferences.maxConcurrentSessions,
          notifyNewDevice: preferences.notifyNewDevice,
          notifySuspiciousActivity: preferences.notifySuspiciousActivity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setSaved(true);
        onSave?.(data);

        // Hide success message after 3 seconds
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save session preferences:', error);
      setErrors({ general: t('saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof SessionPreferences>(
    key: K,
    value: SessionPreferences[K]
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    // Clear error for this field
    if (errors[key]) {
      const newErrors = { ...errors };
      delete newErrors[key];
      setErrors(newErrors);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sessionSettings')}</CardTitle>
          <CardDescription>{t('sessionSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('sessionSettings')}
        </CardTitle>
        <CardDescription>{t('sessionSettingsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Auto-logout timeout */}
          <div className="space-y-2">
            <Label htmlFor="autoLogoutTimeout">{t('autoLogoutTimeout')}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="autoLogoutTimeout"
                type="number"
                min="5"
                max="1440"
                value={preferences.autoLogoutTimeout}
                onChange={(e) => updatePreference('autoLogoutTimeout', parseInt(e.target.value) || 30)}
                className={`w-32 ${errors.autoLogoutTimeout ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-600">{t('minutes')}</span>
            </div>
            {errors.autoLogoutTimeout && (
              <p className="text-sm text-red-600">{errors.autoLogoutTimeout}</p>
            )}
            <p className="text-sm text-gray-500">{t('autoLogoutTimeoutHelp')}</p>
          </div>

          {/* Max concurrent sessions */}
          <div className="space-y-2">
            <Label htmlFor="maxConcurrentSessions">{t('maxConcurrentSessions')}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="maxConcurrentSessions"
                type="number"
                min="1"
                max="10"
                value={preferences.maxConcurrentSessions}
                onChange={(e) => updatePreference('maxConcurrentSessions', parseInt(e.target.value) || 5)}
                className={`w-32 ${errors.maxConcurrentSessions ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-600">{t('sessions')}</span>
            </div>
            {errors.maxConcurrentSessions && (
              <p className="text-sm text-red-600">{errors.maxConcurrentSessions}</p>
            )}
            <p className="text-sm text-gray-500">{t('maxConcurrentSessionsHelp')}</p>
          </div>

          {/* Email notifications */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900">{t('emailNotifications')}</h4>

            <div className="flex items-start gap-3">
              <Checkbox
                id="notifyNewDevice"
                checked={preferences.notifyNewDevice}
                onChange={(e) => updatePreference('notifyNewDevice', e.target.checked)}
              />
              <div className="space-y-1">
                <Label htmlFor="notifyNewDevice" className="font-normal cursor-pointer">
                  {t('notifyNewDevice')}
                </Label>
                <p className="text-sm text-gray-500">{t('notifyNewDeviceHelp')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="notifySuspiciousActivity"
                checked={preferences.notifySuspiciousActivity}
                onChange={(e) => updatePreference('notifySuspiciousActivity', e.target.checked)}
              />
              <div className="space-y-1">
                <Label htmlFor="notifySuspiciousActivity" className="font-normal cursor-pointer">
                  {t('notifySuspiciousActivity')}
                </Label>
                <p className="text-sm text-gray-500">{t('notifySuspiciousActivityHelp')}</p>
              </div>
            </div>
          </div>

          {/* Trusted devices count */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{t('trustedDevices')}</h4>
                <p className="text-sm text-gray-500">{t('trustedDevicesHelp')}</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {preferences.trustedDevices.length}
              </span>
            </div>
          </div>

          {/* Error message */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Success message */}
          {saved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{t('saveSuccess')}</p>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('saveChanges')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultPreferences(): SessionPreferences {
  return {
    userId: 'user_123',
    autoLogoutTimeout: 30,
    maxConcurrentSessions: 5,
    notifyNewDevice: true,
    notifySuspiciousActivity: true,
    trustedDevices: [],
  };
}
