'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  Shield,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  User,
  Calendar,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  Eye,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface DsrRequest {
  id: string;
  userId: string;
  type: string;
  status: string;
  reason: string;
  additionalDetails?: string;
  adminNotes?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function AdminGdprPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<DsrRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DsrRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/gdpr/dsr-requests');
      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch DSR requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: string) => {
    setActionLoading(true);

    try {
      const response = await fetch(`/api/gdpr/dsr-requests/${requestId}?adminId=${user?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes || undefined,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update request');

      await fetchRequests();
      setShowModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      setRejectionReason('');
    } catch (err) {
      console.error('Failed to update request:', err);
      toast.error('Eroare', 'Failed to update request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRequestModal = (request: DsrRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setRejectionReason(request.rejectionReason || '');
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };

    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      DATA_EXPORT: Download,
      DATA_DELETION: Trash2,
      DATA_ACCESS: Eye,
      DATA_RECTIFICATION: FileText,
      CONSENT_WITHDRAWAL: Shield,
    };
    return icons[type] || FileText;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DATA_EXPORT: 'Data Export',
      DATA_DELETION: 'Data Deletion',
      DATA_ACCESS: 'Data Access',
      DATA_RECTIFICATION: 'Data Rectification',
      CONSENT_WITHDRAWAL: 'Consent Withdrawal',
    };
    return labels[type] || type;
  };

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesType = filterType === 'all' || request.type === filterType;
    const matchesSearch =
      !searchQuery ||
      request.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesType && matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GDPR Request Management</h1>
              <p className="text-gray-600 mt-1">
                Manage Data Subject Requests and ensure GDPR compliance
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                </div>
                <Loader2 className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, name, or reason..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="DATA_EXPORT">Data Export</option>
              <option value="DATA_DELETION">Data Deletion</option>
              <option value="DATA_ACCESS">Data Access</option>
              <option value="DATA_RECTIFICATION">Data Rectification</option>
              <option value="CONSENT_WITHDRAWAL">Consent Withdrawal</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => {
                const TypeIcon = getTypeIcon(request.type);
                return (
                  <div
                    key={request.id}
                    className="p-4 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => openRequestModal(request)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <TypeIcon className="w-5 h-5 text-gray-600 mt-1" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {getTypeLabel(request.type)}
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {request.user?.name || 'Unknown'} ({request.user?.email})
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2">{request.reason}</p>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Request Details Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {getTypeLabel(selectedRequest.type)} Request
                    </h2>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">User</h3>
                    <p className="text-gray-900">{selectedRequest.user?.name}</p>
                    <p className="text-sm text-gray-600">{selectedRequest.user?.email}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Reason</h3>
                    <p className="text-gray-900">{selectedRequest.reason}</p>
                  </div>

                  {selectedRequest.additionalDetails && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Additional Details</h3>
                      <p className="text-gray-900">{selectedRequest.additionalDetails}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Submitted</h3>
                      <p className="text-gray-900">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                    </div>
                    {selectedRequest.processedAt && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">Processed</h3>
                        <p className="text-gray-900">{new Date(selectedRequest.processedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {selectedRequest.status !== 'COMPLETED' && selectedRequest.status !== 'REJECTED' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Admin Notes
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          placeholder="Add notes about this request..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Rejection Reason (if rejecting)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          rows={2}
                          placeholder="Required if rejecting the request..."
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        {selectedRequest.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'IN_PROGRESS')}
                            disabled={actionLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Loader2 className="w-4 h-4" />}
                            Start Processing
                          </button>
                        )}

                        {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'IN_PROGRESS') && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(selectedRequest.id, 'COMPLETED')}
                              disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Approve & Complete
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(selectedRequest.id, 'REJECTED')}
                              disabled={actionLoading || !rejectionReason.trim()}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {selectedRequest.adminNotes && selectedRequest.status !== 'PENDING' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Admin Notes</h3>
                      <p className="text-sm text-gray-900">{selectedRequest.adminNotes}</p>
                    </div>
                  )}

                  {selectedRequest.rejectionReason && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Rejection Reason</h3>
                      <p className="text-sm text-gray-900">{selectedRequest.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
