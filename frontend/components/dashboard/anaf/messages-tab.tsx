'use client';

/**
 * Messages Tab Component
 * SPV notifications and ANAF messages with real-time polling
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  MailOpen,
} from 'lucide-react';
import { spvService } from '@/lib/anaf/services';
import { mockSpvMessages, mockUnreadMessages } from '@/lib/anaf/mocks';
import type { SpvMessage } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function MessagesTab() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<SpvMessage[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setMessages(mockSpvMessages);
      } else {
        const data = await spvService.getMessages();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (USE_MOCK) setMessages(mockSpvMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      if (USE_MOCK) {
        setMessages(messages.map(msg =>
          msg.id === messageId ? { ...msg, read: true } : msg
        ));
      } else {
        await spvService.markMessageRead(messageId);
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getMessageIcon = (type: string) => {
    const icons = {
      SUCCESS: CheckCircle2,
      WARNING: AlertTriangle,
      ERROR: XCircle,
      INFO: Info,
    };
    return icons[type as keyof typeof icons] || Info;
  };

  const getMessageColor = (type: string) => {
    const colors = {
      SUCCESS: 'text-green-600 bg-green-50 border-green-200',
      WARNING: 'text-orange-600 bg-orange-50 border-orange-200',
      ERROR: 'text-red-600 bg-red-50 border-red-200',
      INFO: 'text-blue-600 bg-blue-50 border-blue-200',
    };
    return colors[type as keyof typeof colors] || colors.INFO;
  };

  const filteredMessages = filter === 'unread'
    ? messages.filter(msg => !msg.read)
    : messages;

  const unreadCount = messages.filter(msg => !msg.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Toate ({messages.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Necitite ({unreadCount})
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={fetchMessages}>
              Reîmprospătare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="space-y-2">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-12">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Niciun mesaj {filter === 'unread' ? 'necitit' : ''}</p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((message) => {
            const Icon = getMessageIcon(message.type);
            const colorClass = getMessageColor(message.type);
            return (
              <Card key={message.id} className={!message.read ? 'border-l-4 border-l-blue-500' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold">{message.title}</h4>
                        <div className="flex items-center gap-2">
                          {!message.read && (
                            <Badge variant="default" className="text-xs">Nou</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleDateString('ro-RO', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{message.message}</p>
                      {!message.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkAsRead(message.id)}
                          className="mt-2"
                        >
                          <MailOpen className="h-4 w-4 mr-2" />
                          Marchează ca citit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
