'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Code2,
  Key,
  Webhook,
  BookOpen,
  FileCode,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Search,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Shield,
  Clock,
  Activity,
  ChevronRight,
  Play,
  Zap,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface APIKey {
  id: string;
  name: string;
  keyPreview: string;
  permissions: string[];
  rateLimit: { requestsPerMinute: number; requestsPerDay: number };
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
}

interface PortalOverview {
  apiKeys: { total: number; active: number };
  webhooks: { total: number; active: number };
  apiCalls: { today: number; thisMonth: number };
  documentation: { sections: number; guides: number };
}

export default function DeveloperPortalPage() {
  const [overview, setOverview] = useState<PortalOverview | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const api = useApi();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, keysRes] = await Promise.all([
        api.get('/developer/overview'),
        api.get('/developer/keys'),
      ]);
      if (overviewRes) setOverview(overviewRes as PortalOverview);
      const keysData = keysRes as { keys?: APIKey[] } | null;
      if (keysData?.keys) setApiKeys(keysData.keys);
    } catch (error) {
      console.error('Error fetching developer data:', error);
      // Set fallback data
      setOverview({
        apiKeys: { total: 3, active: 2 },
        webhooks: { total: 5, active: 4 },
        apiCalls: { today: 1247, thisMonth: 45892 },
        documentation: { sections: 12, guides: 8 },
      });
      setApiKeys([
        {
          id: '1',
          name: 'Production API Key',
          keyPreview: 'dk_live_****...7x2f',
          permissions: ['invoices:read', 'invoices:write', 'reports:read'],
          rateLimit: { requestsPerMinute: 60, requestsPerDay: 10000 },
          createdAt: '2025-01-15T10:00:00Z',
          lastUsedAt: '2025-12-12T14:30:00Z',
          isActive: true,
        },
        {
          id: '2',
          name: 'Development Key',
          keyPreview: 'dk_test_****...9k1m',
          permissions: ['*'],
          rateLimit: { requestsPerMinute: 100, requestsPerDay: 50000 },
          createdAt: '2025-02-20T08:00:00Z',
          lastUsedAt: '2025-12-12T12:15:00Z',
          isActive: true,
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

  const quickLinks = [
    {
      title: 'API Reference',
      description: 'Complete REST API documentation',
      icon: <FileCode className="w-5 h-5" />,
      href: '/api/docs',
      external: true,
      color: 'bg-blue-500',
    },
    {
      title: 'Getting Started',
      description: 'Quick start guide for developers',
      icon: <Play className="w-5 h-5" />,
      href: '/dashboard/developer/guides',
      color: 'bg-green-500',
    },
    {
      title: 'Webhooks',
      description: 'Configure event notifications',
      icon: <Webhook className="w-5 h-5" />,
      href: '/dashboard/developer/webhooks',
      color: 'bg-purple-500',
    },
    {
      title: 'API Sandbox',
      description: 'Test API calls interactively',
      icon: <Terminal className="w-5 h-5" />,
      href: '/dashboard/developer/sandbox',
      color: 'bg-orange-500',
    },
  ];

  const codeExamples = [
    {
      title: 'Create Invoice',
      language: 'curl',
      code: `curl -X POST https://api.documentiulia.ro/api/v1/invoices \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "client_123",
    "items": [{"description": "Services", "amount": 1000}],
    "vatRate": 21
  }'`,
    },
    {
      title: 'Get VAT Report',
      language: 'javascript',
      code: `const response = await fetch(
  'https://api.documentiulia.ro/api/v1/finance/vat/report',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);
const report = await response.json();`,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary-600" />
            Portal Dezvoltatori
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Gestionează chei API, webhooks și acces la documentație
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/api/docs"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
          >
            <BookOpen className="w-4 h-4" />
            Documentație API
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setShowCreateKey(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Cheie API Nouă
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Chei API</span>
              <Key className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{overview.apiKeys.total}</div>
            <div className="text-xs text-green-600 mt-1">{overview.apiKeys.active} active</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Webhooks</span>
              <Webhook className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{overview.webhooks.total}</div>
            <div className="text-xs text-green-600 mt-1">{overview.webhooks.active} active</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Apeluri API Azi</span>
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {overview.apiCalls.today.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {overview.apiCalls.thisMonth.toLocaleString()} luna aceasta
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Documentație</span>
              <BookOpen className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{overview.documentation.sections}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {overview.documentation.guides} ghiduri disponibile
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            target={link.external ? '_blank' : undefined}
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 ${link.color} rounded-lg text-white`}>
                {link.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 flex items-center gap-2">
                  {link.title}
                  {link.external && <ExternalLink className="w-3 h-3" />}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{link.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
            </div>
          </Link>
        ))}
      </div>

      {/* API Keys */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-600" />
              Chei API
            </h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{key.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        key.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {key.isActive ? 'Activ' : 'Inactiv'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-300">
                      {key.keyPreview}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.keyPreview, key.id)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      {copiedId === key.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {key.permissions.slice(0, 3).map((perm, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded"
                      >
                        {perm}
                      </span>
                    ))}
                    {key.permissions.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded">
                        +{key.permissions.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Creat: {new Date(key.createdAt).toLocaleDateString('ro-RO')}
                    </span>
                    {key.lastUsedAt && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Ultima utilizare: {new Date(key.lastUsedAt).toLocaleDateString('ro-RO')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {key.rateLimit.requestsPerMinute}/min
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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

          {apiKeys.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nu există chei API create</p>
              <button
                onClick={() => setShowCreateKey(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                Creează prima cheie
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary-600" />
            Exemple de Cod
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {codeExamples.map((example, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{example.title}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded">
                    {example.language}
                  </span>
                  <button
                    onClick={() => copyToClipboard(example.code, `code-${i}`)}
                    className="p-1 text-gray-400 hover:text-primary-600"
                  >
                    {copiedId === `code-${i}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-x-auto">
                <code>{example.code}</code>
              </pre>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <Link
            href="/api/docs"
            target="_blank"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            Vezi toate exemplele în documentație
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Creează Cheie API Nouă</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nume
                </label>
                <input
                  type="text"
                  placeholder="ex: Production Key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Permisiuni
                </label>
                <div className="space-y-2">
                  {['invoices:read', 'invoices:write', 'reports:read', 'finance:read'].map((perm) => (
                    <label key={perm} className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rate Limit (cereri/minut)
                </label>
                <input
                  type="number"
                  defaultValue={60}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateKey(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Anulează
              </button>
              <button
                onClick={() => setShowCreateKey(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
