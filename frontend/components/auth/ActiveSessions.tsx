'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Monitor, Smartphone, Tablet, MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  browserVersion: string;
  fingerprint: string;
}

interface Location {
  ip: string;
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

interface Session {
  id: string;
  userId: string;
  device: DeviceInfo;
  location: Location;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isTrusted: boolean;
}

interface ActiveSessionsProps {
  onRevoke?: (sessionId: string) => void;
  onTrustDevice?: (fingerprint: string) => void;
  onUntrustDevice?: (fingerprint: string) => void;
}

export default function ActiveSessions({ onRevoke, onTrustDevice, onUntrustDevice }: ActiveSessionsProps) {
  const t = useTranslations('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      // In production, this would call the backend API
      const response = await fetch('/api/v1/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-session-id': localStorage.getItem('sessionId') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        // Use mock data for demo
        setSessions(getMockSessions());
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      // Use mock data for demo
      setSessions(getMockSessions());
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await fetch(`/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setSessions(sessions.filter(s => s.id !== sessionId));
      onRevoke?.(sessionId);
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setRevokingId(null);
    }
  };

  const handleTrustToggle = async (session: Session) => {
    try {
      if (session.isTrusted) {
        await fetch(`/api/v1/sessions/trust-device/${session.device.fingerprint}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        onUntrustDevice?.(session.device.fingerprint);
      } else {
        await fetch('/api/v1/sessions/trust-device', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deviceFingerprint: session.device.fingerprint }),
        });
        onTrustDevice?.(session.device.fingerprint);
      }

      // Update local state
      setSessions(sessions.map(s =>
        s.id === session.id ? { ...s, isTrusted: !s.isTrusted } : s
      ));
    } catch (error) {
      console.error('Failed to toggle trust:', error);
    }
  };

  const getDeviceIcon = (type: DeviceInfo['type']) => {
    switch (type) {
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return t('justNow');
    if (diffMinutes < 60) return t('minutesAgo', { count: diffMinutes });
    if (diffMinutes < 1440) return t('hoursAgo', { count: Math.floor(diffMinutes / 60) });
    return t('daysAgo', { count: Math.floor(diffMinutes / 1440) });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('activeSessions')}</CardTitle>
          <CardDescription>{t('activeSessionsDescription')}</CardDescription>
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
        <CardTitle>{t('activeSessions')}</CardTitle>
        <CardDescription>{t('activeSessionsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border rounded-lg ${
                session.isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    session.isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getDeviceIcon(session.device.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {session.device.os} - {session.device.browser}
                      </h4>
                      {session.isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {t('currentSession')}
                        </span>
                      )}
                      {session.isTrusted && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" aria-label={t('trustedDevice')} />
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{session.location.city}, {session.location.country}</span>
                        <span className="text-gray-400">({session.location.ip})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{t('lastActive')}: {formatLastActivity(session.lastActivityAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {!session.isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revokingId === session.id}
                      className="text-red-600 hover:bg-red-50"
                    >
                      {revokingId === session.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                          {t('revoking')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          {t('revoke')}
                        </span>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTrustToggle(session)}
                  >
                    {session.isTrusted ? t('untrust') : t('trust')}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('noActiveSessions')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getMockSessions(): Session[] {
  const now = new Date();
  return [
    {
      id: 'sess_current_123',
      userId: 'user_123',
      device: {
        type: 'desktop',
        os: 'Windows 10',
        browser: 'Chrome',
        browserVersion: '120.0.0',
        fingerprint: 'fp_desktop_123',
      },
      location: {
        ip: '86.124.45.67',
        country: 'RO',
        city: 'Bucharest',
        latitude: 44.4268,
        longitude: 26.1025,
      },
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(),
      isCurrent: true,
      isTrusted: true,
    },
    {
      id: 'sess_mobile_456',
      userId: 'user_123',
      device: {
        type: 'mobile',
        os: 'iOS 17',
        browser: 'Safari',
        browserVersion: '17.0',
        fingerprint: 'fp_mobile_456',
      },
      location: {
        ip: '86.124.45.68',
        country: 'RO',
        city: 'Cluj-Napoca',
        latitude: 46.7712,
        longitude: 23.6236,
      },
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 19 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      isTrusted: false,
    },
    {
      id: 'sess_tablet_789',
      userId: 'user_123',
      device: {
        type: 'tablet',
        os: 'Android 13',
        browser: 'Chrome',
        browserVersion: '119.0.0',
        fingerprint: 'fp_tablet_789',
      },
      location: {
        ip: '86.124.45.69',
        country: 'RO',
        city: 'Timisoara',
        latitude: 45.7489,
        longitude: 21.2087,
      },
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      isTrusted: true,
    },
  ];
}
