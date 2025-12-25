'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DashboardData {
  profile: {
    id: string;
    companyName: string;
    cui: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country: string;
    accountManagerId?: string;
    accountManagerName?: string;
    createdAt: string;
    lastLogin?: string;
    status: 'active' | 'inactive' | 'suspended';
    subscriptionPlan: string;
    subscriptionExpiresAt?: string;
  } | undefined;
  stats: {
    totalInvoices: number;
    unpaidInvoices: number;
    totalDocuments: number;
    unreadMessages: number;
    unreadNotifications: number;
  };
  recentInvoices: Array<{
    id: string;
    clientId: string;
    number: string;
    issueDate: string;
    dueDate: string;
    amount: number;
    currency: string;
    vatAmount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    pdfUrl: string;
    items: Array<any>;
    paymentMethod?: string;
    paymentDate?: string;
  }>;
  recentDocuments: Array<{
    id: string;
    clientId: string;
    name: string;
    type: 'invoice' | 'contract' | 'report' | 'statement' | 'tax_document' | 'other';
    category: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    uploadedBy: string;
    expiresAt?: string;
    status: 'pending' | 'approved' | 'rejected';
    tags: string[];
  }>;
  recentNotifications: Array<{
    id: string;
    clientId: string;
    type: 'invoice' | 'document' | 'message' | 'system' | 'deadline';
    title: string;
    message: string;
    link?: string;
    createdAt: string;
    readAt?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export default function ClientPortalDashboard() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`/api/client-portal/${clientId}/dashboard`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard');
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchDashboard();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error: {error}</div>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.profile) {
    return (
      <div className="text-center">
        <p className="text-gray-500">No dashboard data available or client not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome back, {dashboardData.profile.companyName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Status</h3>
            <p className="text-blue-700 capitalize">{dashboardData.profile.status}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Plan</h3>
            <p className="text-green-700">{dashboardData.profile.subscriptionPlan}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Email</h3>
            <p className="text-purple-700">{dashboardData.profile.email}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900">Account Manager</h3>
            <p className="text-orange-700">{dashboardData.profile.accountManagerName || 'Not assigned'}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalInvoices}</div>
            <div className="text-sm text-gray-500">Total Invoices</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{dashboardData.stats.unpaidInvoices}</div>
            <div className="text-sm text-gray-500">Unpaid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalDocuments}</div>
            <div className="text-sm text-gray-500">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{dashboardData.stats.unreadMessages}</div>
            <div className="text-sm text-gray-500">Unread Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{dashboardData.stats.unreadNotifications}</div>
            <div className="text-sm text-gray-500">Notifications</div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Invoices</h3>
        {dashboardData.recentInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      €{invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent invoices</p>
        )}
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Documents</h3>
        {dashboardData.recentDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.recentDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-900">{doc.name}</h4>
                <p className="text-sm text-gray-500 capitalize">{doc.type.replace('_', ' ')}</p>
                <p className="text-xs text-gray-400">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent documents</p>
        )}
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Notifications</h3>
        {dashboardData.recentNotifications.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.recentNotifications.map((notification) => (
              <div key={notification.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{notification.title}</h4>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()} • {notification.type}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    notification.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : notification.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {notification.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent notifications</p>
        )}
      </div>
    </div>
  );
}