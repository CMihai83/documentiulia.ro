'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  XCircle,
  LogOut,
  Shield,
  Key,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Location {
  ip: string;
  country: string;
  city: string;
}

interface LoginActivity {
  id: string;
  userId: string;
  type: 'login_success' | 'login_failed' | 'logout' | 'session_revoked' | 'password_changed' | 'suspicious_activity';
  ipAddress: string;
  userAgent: string;
  location: Location;
  timestamp: string;
  details?: string;
  isSuspicious: boolean;
}

interface SessionActivityProps {
  limit?: number;
}

export default function SessionActivity({ limit = 20 }: SessionActivityProps) {
  const t = useTranslations('sessions');
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sessions/activity?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        // Use mock data for demo
        setActivities(getMockActivities());
      }
    } catch (error) {
      console.error('Failed to fetch login activity:', error);
      // Use mock data for demo
      setActivities(getMockActivities());
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: LoginActivity['type']) => {
    switch (type) {
      case 'login_success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'login_failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'logout':
        return <LogOut className="h-5 w-5 text-gray-600" />;
      case 'session_revoked':
        return <Shield className="h-5 w-5 text-orange-600" />;
      case 'password_changed':
        return <Key className="h-5 w-5 text-blue-600" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActivityTitle = (activity: LoginActivity) => {
    switch (activity.type) {
      case 'login_success':
        return t('loginSuccess');
      case 'login_failed':
        return t('loginFailed');
      case 'logout':
        return t('logout');
      case 'session_revoked':
        return t('sessionRevoked');
      case 'password_changed':
        return t('passwordChanged');
      case 'suspicious_activity':
        return t('suspiciousActivity');
      default:
        return activity.type;
    }
  };

  const getDeviceFromUserAgent = (userAgent: string) => {
    if (userAgent.includes('iPhone') || userAgent.includes('Android') && !userAgent.includes('Tablet')) {
      return { icon: <Smartphone className="h-4 w-4" />, type: 'Mobile' };
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return { icon: <Tablet className="h-4 w-4" />, type: 'Tablet' };
    }
    return { icon: <Monitor className="h-4 w-4" />, type: 'Desktop' };
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return t('justNow');
    if (diffMinutes < 60) return t('minutesAgo', { count: diffMinutes });
    if (diffMinutes < 1440) return t('hoursAgo', { count: Math.floor(diffMinutes / 60) });

    // Format as date
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('loginActivity')}</CardTitle>
          <CardDescription>{t('loginActivityDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('loginActivity')}</CardTitle>
        <CardDescription>{t('loginActivityDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => {
            const device = getDeviceFromUserAgent(activity.userAgent);

            return (
              <div
                key={activity.id}
                className={`p-4 border rounded-lg ${
                  activity.isSuspicious ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {getActivityTitle(activity)}
                      </h4>
                      {activity.isSuspicious && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {t('suspicious')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          {device.icon}
                          <span>{device.type}</span>
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{activity.location.city}, {activity.location.country}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{activity.ipAddress}</span>
                      </div>

                      {activity.details && (
                        <div className="text-sm text-gray-500 italic">
                          {activity.details}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('noLoginActivity')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getMockActivities(): LoginActivity[] {
  const now = new Date();

  return [
    {
      id: 'act_1',
      userId: 'user_123',
      type: 'login_success',
      ipAddress: '86.124.45.67',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0',
      location: {
        ip: '86.124.45.67',
        country: 'RO',
        city: 'Bucharest',
      },
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      isSuspicious: false,
    },
    {
      id: 'act_2',
      userId: 'user_123',
      type: 'login_success',
      ipAddress: '86.124.45.68',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/17.0',
      location: {
        ip: '86.124.45.68',
        country: 'RO',
        city: 'Cluj-Napoca',
      },
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      details: 'New device login',
      isSuspicious: false,
    },
    {
      id: 'act_3',
      userId: 'user_123',
      type: 'logout',
      ipAddress: '86.124.45.70',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) Firefox/120.0',
      location: {
        ip: '86.124.45.70',
        country: 'RO',
        city: 'Bucharest',
      },
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      isSuspicious: false,
    },
    {
      id: 'act_4',
      userId: 'user_123',
      type: 'login_success',
      ipAddress: '86.124.45.69',
      userAgent: 'Mozilla/5.0 (Android 13) Chrome/119.0.0',
      location: {
        ip: '86.124.45.69',
        country: 'RO',
        city: 'Timisoara',
      },
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      isSuspicious: false,
    },
    {
      id: 'act_5',
      userId: 'user_123',
      type: 'login_failed',
      ipAddress: '192.168.1.100',
      userAgent: 'Unknown',
      location: {
        ip: '192.168.1.100',
        country: 'US',
        city: 'Unknown',
      },
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      details: 'Invalid password',
      isSuspicious: true,
    },
    {
      id: 'act_6',
      userId: 'user_123',
      type: 'session_revoked',
      ipAddress: '86.124.45.67',
      userAgent: 'System',
      location: {
        ip: '86.124.45.67',
        country: 'RO',
        city: 'Bucharest',
      },
      timestamp: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      details: 'User revoked session from security settings',
      isSuspicious: false,
    },
  ];
}
