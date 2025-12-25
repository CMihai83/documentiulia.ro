'use client';

import { useState, useEffect } from 'react';
import { Shield, Database, Clock, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface DataInventory {
  category: string;
  dataTypes: string[];
  purpose: string;
  retention: string;
  legalBasis: string;
}

interface DsrRequest {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  processedAt?: string;
}

interface PrivacyDashboardProps {
  userId: string;
}

export function PrivacyDashboard({ userId }: PrivacyDashboardProps) {
  const [inventory, setInventory] = useState<DataInventory[]>([]);
  const [requests, setRequests] = useState<DsrRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests'>('inventory');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [inventoryRes, requestsRes] = await Promise.all([
        fetch(`/api/gdpr/data-inventory?userId=${userId}`),
        fetch(`/api/gdpr/dsr-requests?userId=${userId}`),
      ]);

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData.inventory || []);
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData || []);
      }
    } catch (err) {
      console.error('Failed to fetch privacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DATA_EXPORT: 'Data Export',
      DATA_DELETION: 'Data Deletion',
      DATA_ACCESS: 'Data Access',
      DATA_RECTIFICATION: 'Data Rectification',
      CONSENT_WITHDRAWAL: 'Consent Withdrawal',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Privacy Dashboard</h3>
          <p className="text-sm text-gray-600 mt-1">
            Overview of your data and privacy rights
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Data Inventory
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Requests
          {requests.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'inventory' ? (
        <div className="space-y-4">
          {inventory.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
            >
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">{item.category}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Data Types:</p>
                      <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                        {item.dataTypes.map((type, i) => (
                          <li key={i}>{type}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-gray-500 font-medium mb-1">Purpose:</p>
                      <p className="text-gray-700">{item.purpose}</p>

                      <p className="text-gray-500 font-medium mt-3 mb-1">Retention:</p>
                      <p className="text-gray-700">{item.retention}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Legal Basis:</span> {item.legalBasis}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {inventory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No data inventory available</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {getRequestTypeLabel(request.type)}
                    </h4>
                    {getStatusBadge(request.status)}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{request.reason}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Submitted: {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                    {request.processedAt && (
                      <span>
                        Processed: {new Date(request.processedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No privacy requests found</p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Your GDPR Rights</p>
            <p>
              Under GDPR, you have the right to access, rectify, delete, and export your data. We process
              requests within 30 days. Some data may be retained for legal compliance purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
