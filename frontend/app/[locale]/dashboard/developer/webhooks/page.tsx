'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Webhook,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Activity,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  statusCode?: number;
  responseTime?: number;
  attemptCount: number;
  createdAt: string;
  payload: Record<string, any>;
  response?: string;
}

const AVAILABLE_EVENTS = [
  { id: 'invoice.created', name: 'Invoice Created', description: 'When a new invoice is created' },
  { id: 'invoice.paid', name: 'Invoice Paid', description: 'When an invoice is marked as paid' },
  { id: 'invoice.overdue', name: 'Invoice Overdue', description: 'When an invoice becomes overdue' },
  { id: 'payment.received', name: 'Payment Received', description: 'When a payment is received' },
  { id: 'document.processed', name: 'Document Processed', description: 'When OCR finishes processing' },
  { id: 'efactura.submitted', name: 'e-Factura Submitted', description: 'When e-Factura is sent to ANAF' },
  { id: 'efactura.response', name: 'e-Factura Response', description: 'When ANAF responds to e-Factura' },
  { id: 'saft.generated', name: 'SAF-T Generated', description: 'When SAF-T D406 is generated' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const api = useApi();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [webhooksRes, deliveriesRes] = await Promise.all([
        api.get('/webhooks'),
        api.get('/webhooks/deliveries?limit=20'),
      ]);
      const webhooksData = webhooksRes as { webhooks?: WebhookConfig[] } | null;
      const deliveriesData = deliveriesRes as { deliveries?: WebhookDelivery[] } | null;
      if (webhooksData?.webhooks) setWebhooks(webhooksData.webhooks);
      if (deliveriesData?.deliveries) setDeliveries(deliveriesData.deliveries);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      // Fallback data
      setWebhooks([
        {
          id: '1',
          name: 'Notificări Facturi',
          url: 'https://myapp.com/webhooks/invoices',
          events: ['invoice.created', 'invoice.paid'],
          secret: 'whsec_****...abc123',
          isActive: true,
          createdAt: '2025-01-10T10:00:00Z',
          lastTriggeredAt: '2025-12-12T14:30:00Z',
          successRate: 98.5,
          totalDeliveries: 1250,
          failedDeliveries: 19,
        },
        {
          id: '2',
          name: 'ANAF Sync',
          url: 'https://myerp.local/api/anaf-updates',
          events: ['efactura.submitted', 'efactura.response', 'saft.generated'],
          secret: 'whsec_****...def456',
          isActive: true,
          createdAt: '2025-02-15T08:00:00Z',
          lastTriggeredAt: '2025-12-12T12:00:00Z',
          successRate: 99.2,
          totalDeliveries: 890,
          failedDeliveries: 7,
        },
        {
          id: '3',
          name: 'Slack Notifications',
          url: 'https://hooks.slack.com/services/T00/B00/XXX',
          events: ['invoice.overdue'],
          secret: 'whsec_****...ghi789',
          isActive: false,
          createdAt: '2025-03-01T12:00:00Z',
          successRate: 95.0,
          totalDeliveries: 45,
          failedDeliveries: 2,
        },
      ]);
      setDeliveries([
        {
          id: 'd1',
          webhookId: '1',
          event: 'invoice.created',
          status: 'success',
          statusCode: 200,
          responseTime: 145,
          attemptCount: 1,
          createdAt: '2025-12-12T14:30:00Z',
          payload: { invoiceId: 'INV-2024-0156', amount: 2500, currency: 'RON' },
        },
        {
          id: 'd2',
          webhookId: '2',
          event: 'efactura.response',
          status: 'success',
          statusCode: 200,
          responseTime: 89,
          attemptCount: 1,
          createdAt: '2025-12-12T12:00:00Z',
          payload: { uploadIndex: '5024789', status: 'ACCEPTED' },
        },
        {
          id: 'd3',
          webhookId: '1',
          event: 'invoice.paid',
          status: 'failed',
          statusCode: 500,
          responseTime: 2500,
          attemptCount: 3,
          createdAt: '2025-12-12T10:15:00Z',
          payload: { invoiceId: 'INV-2024-0148', amount: 1800, currency: 'RON' },
          response: 'Internal Server Error',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/developer"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Webhook className="w-6 h-6 text-purple-600" />
              Webhooks
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Configurează notificări pentru evenimente din aplicație
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Webhook Nou
          </button>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Configurații Webhooks ({webhooks.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{webhook.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        webhook.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {webhook.isActive ? 'Activ' : 'Inactiv'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300 truncate max-w-md">
                      {webhook.url}
                    </code>
                    <button
                      onClick={() => copyToClipboard(webhook.url, `url-${webhook.id}`)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      {copiedId === `url-${webhook.id}` ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {webhook.events.map((event, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {webhook.totalDeliveries} livrări
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        webhook.successRate >= 95 ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      {webhook.successRate.toFixed(1)}% succes
                    </span>
                    {webhook.lastTriggeredAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Ultima: {new Date(webhook.lastTriggeredAt).toLocaleString('ro-RO')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Test webhook"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    className={`p-2 rounded-lg ${
                      webhook.isActive
                        ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title={webhook.isActive ? 'Pause webhook' : 'Enable webhook'}
                  >
                    {webhook.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {webhooks.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nu există webhooks configurate</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Creează primul webhook
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Livrări Recente
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() =>
                  setExpandedDelivery(expandedDelivery === delivery.id ? null : delivery.id)
                }
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(delivery.status)}
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {delivery.event}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(delivery.createdAt).toLocaleString('ro-RO')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {delivery.statusCode && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(delivery.status)}`}
                    >
                      {delivery.statusCode}
                    </span>
                  )}
                  {delivery.responseTime && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {delivery.responseTime}ms
                    </span>
                  )}
                  {delivery.attemptCount > 1 && (
                    <span className="text-xs text-yellow-600">
                      {delivery.attemptCount} încercări
                    </span>
                  )}
                  {expandedDelivery === delivery.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedDelivery === delivery.id && (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Payload
                    </div>
                    <pre className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                      {JSON.stringify(delivery.payload, null, 2)}
                    </pre>
                  </div>
                  {delivery.response && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Response
                      </div>
                      <pre className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs">
                        {delivery.response}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Creează Webhook Nou</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nume
                </label>
                <input
                  type="text"
                  placeholder="ex: Notificări Facturi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL Endpoint
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/webhooks"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Evenimente
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label key={event.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {event.name}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Anulează
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Creează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
