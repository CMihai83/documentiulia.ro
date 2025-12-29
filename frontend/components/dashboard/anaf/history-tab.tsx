'use client';

/**
 * History Tab Component
 * Unified submission log with retry and export functionality
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Receipt,
  Truck,
  Download,
  RotateCcw,
  Loader2,
  Filter,
} from 'lucide-react';
import { spvService } from '@/lib/anaf/services';
import { mockSpvSubmissions } from '@/lib/anaf/mocks';
import type { SpvSubmission } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function HistoryTab() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SpvSubmission[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSubmissions();
  }, [typeFilter, statusFilter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 500));
        let filtered = mockSpvSubmissions;
        if (typeFilter !== 'all') {
          filtered = filtered.filter(s => s.type === typeFilter);
        }
        if (statusFilter !== 'all') {
          filtered = filtered.filter(s => s.status === statusFilter);
        }
        setSubmissions(filtered);
      } else {
        const filters: any = {};
        if (typeFilter !== 'all') filters.type = typeFilter;
        if (statusFilter !== 'all') filters.status = statusFilter;
        const data = await spvService.getSubmissions(filters);
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      if (USE_MOCK) setSubmissions(mockSpvSubmissions);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (submissionId: string) => {
    if (!confirm('Sigur doriți să retrimiteți această declarație?')) return;

    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Declarație retrimisă cu succes! (Mock)');
        fetchSubmissions();
      } else {
        await spvService.retrySubmission(submissionId);
        alert('Declarație retrimisă cu succes!');
        fetchSubmissions();
      }
    } catch (error: any) {
      console.error('Retry failed:', error);
      alert(`Eroare: ${error.message}`);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      SAFT: FileText,
      EFACTURA: Receipt,
      E_TRANSPORT: Truck,
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: 'secondary',
      SUBMITTED: 'default',
      IN_PROGRESS: 'default',
      ACCEPTED: 'default',
      REJECTED: 'destructive',
      ERROR: 'destructive',
    };
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ERROR: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  // Calculate stats
  const stats = {
    total: submissions.length,
    accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
    pending: submissions.filter(s => s.status === 'PENDING' || s.status === 'SUBMITTED' || s.status === 'IN_PROGRESS').length,
    errors: submissions.filter(s => s.status === 'REJECTED' || s.status === 'ERROR').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total transmisii</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.accepted}</div>
            <div className="text-sm text-muted-foreground">Acceptate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">În procesare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{stats.errors}</div>
            <div className="text-sm text-muted-foreground">Erori</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tip declarație" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="SAFT">SAF-T D406</SelectItem>
                <SelectItem value="EFACTURA">e-Factura</SelectItem>
                <SelectItem value="E_TRANSPORT">e-Transport</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="ACCEPTED">Acceptate</SelectItem>
                <SelectItem value="SUBMITTED">Transmise</SelectItem>
                <SelectItem value="REJECTED">Respinse</SelectItem>
                <SelectItem value="ERROR">Erori</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchSubmissions} className="ml-auto">
              Reîmprospătare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Istoric transmisii</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nicio transmisie găsită
              </p>
            ) : (
              submissions.map((submission) => {
                const Icon = getTypeIcon(submission.type);
                const canRetry = submission.status === 'REJECTED' || submission.status === 'ERROR';
                return (
                  <div
                    key={submission.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <p className="font-semibold">{submission.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {submission.reference || submission.uploadIndex || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">
                          {new Date(submission.submittedAt).toLocaleDateString('ro-RO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(submission.submittedAt).toLocaleTimeString('ro-RO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {getStatusBadge(submission.status)}
                      </div>
                      <div className="flex justify-end gap-2">
                        {canRetry && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(submission.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          XML
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
