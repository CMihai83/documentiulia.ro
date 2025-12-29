'use client';

/**
 * Deadlines Tab Component
 * ANAF compliance deadlines with calendar view and reminders
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
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { mockDeadlineReminders, mockDeadlineSummary } from '@/lib/anaf/mocks';
import type { DeadlineReminder, DeadlineType } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function DeadlinesTab() {
  const [loading, setLoading] = useState(true);
  const [deadlines, setDeadlines] = useState<DeadlineReminder[]>([]);
  const [summary, setSummary] = useState(mockDeadlineSummary);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchDeadlines();
    // Refresh every 5 minutes to update status
    const interval = setInterval(fetchDeadlines, 300000);
    return () => clearInterval(interval);
  }, [typeFilter, statusFilter]);

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 300));
        let filtered = mockDeadlineReminders;
        if (typeFilter !== 'all') {
          filtered = filtered.filter(d => d.type === typeFilter);
        }
        if (statusFilter !== 'all') {
          filtered = filtered.filter(d => d.status === statusFilter);
        }
        setDeadlines(filtered);
        setSummary(mockDeadlineSummary);
      } else {
        // Real API call would go here
        const filters: any = {};
        if (typeFilter !== 'all') filters.type = typeFilter;
        if (statusFilter !== 'all') filters.status = statusFilter;
        // const data = await deadlineService.getReminders('user_001', filters);
        // setDeadlines(data.reminders);
        // setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch deadlines:', error);
      if (USE_MOCK) setDeadlines(mockDeadlineReminders);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (deadlineId: string) => {
    if (!confirm('Marcați acest termen ca finalizat?')) return;

    try {
      if (USE_MOCK) {
        setDeadlines(deadlines.map(d =>
          d.id === deadlineId
            ? { ...d, completed: true, status: 'completed', completedAt: new Date() }
            : d
        ));
        alert('Termen marcat ca finalizat! (Mock)');
      } else {
        // await deadlineService.markCompleted(deadlineId);
        alert('Termen marcat ca finalizat!');
        fetchDeadlines();
      }
    } catch (error: any) {
      console.error('Mark completed failed:', error);
      alert(`Eroare: ${error.message}`);
    }
  };

  const getTypeLabel = (type: DeadlineType) => {
    const labels: Record<DeadlineType, string> = {
      SAFT_D406: 'SAF-T D406',
      EFACTURA_B2B: 'e-Factura B2B',
      EFACTURA_B2C: 'e-Factura B2C',
      E_TRANSPORT: 'e-Transport',
      VAT_RETURN: 'Declarație TVA',
      CUSTOM: 'Personalizat',
    };
    return labels[type];
  };

  const getTypeColor = (type: DeadlineType) => {
    const colors: Record<DeadlineType, string> = {
      SAFT_D406: 'bg-blue-100 text-blue-800',
      EFACTURA_B2B: 'bg-green-100 text-green-800',
      EFACTURA_B2C: 'bg-purple-100 text-purple-800',
      E_TRANSPORT: 'bg-orange-100 text-orange-800',
      VAT_RETURN: 'bg-yellow-100 text-yellow-800',
      CUSTOM: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  const getStatusBadge = (deadline: DeadlineReminder) => {
    if (deadline.completed) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Finalizat
        </Badge>
      );
    }

    const config = {
      overdue: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Depășit', color: 'bg-red-100 text-red-800' },
      due_soon: { variant: 'default' as const, icon: Clock, label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
      upcoming: { variant: 'secondary' as const, icon: Calendar, label: 'Viitor', color: 'bg-blue-100 text-blue-800' },
    };
    const cfg = config[deadline.status as keyof typeof config] || config.upcoming;
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.color}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDaysRemaining = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return `Depășit cu ${Math.abs(daysRemaining)} zile`;
    } else if (daysRemaining === 0) {
      return 'Astăzi';
    } else if (daysRemaining === 1) {
      return 'Mâine';
    } else {
      return `În ${daysRemaining} zile`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group deadlines by status
  const overdueDeadlines = deadlines.filter(d => d.status === 'overdue' && !d.completed);
  const dueSoonDeadlines = deadlines.filter(d => d.status === 'due_soon' && !d.completed);
  const upcomingDeadlines = deadlines.filter(d => d.status === 'upcoming' && !d.completed);
  const completedDeadlines = deadlines.filter(d => d.completed);

  return (
    <div className="space-y-4">
      {/* Information Banner */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <Info className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">
                Calendar Termene ANAF
              </h4>
              <p className="text-sm text-red-700">
                Toate termenele de depunere ANAF (SAF-T D406, e-Factura, TVA, e-Transport) într-o singură interfață. Urmăriți deadlines-urile și evitați penalizările.
              </p>
              <p className="text-xs text-red-600 mt-2">
                <strong>Mock Data:</strong> Utilizează simulări locale. Sincronizarea automată cu ANAF SPV va fi disponibilă după activarea OAuth2.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Dashboard */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{summary.counts.overdue}</div>
            <div className="text-sm text-muted-foreground">Depășite</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{summary.counts.dueSoon}</div>
            <div className="text-sm text-muted-foreground">Urgente (în 7 zile)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{summary.counts.upcoming}</div>
            <div className="text-sm text-muted-foreground">Viitoare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{summary.counts.completed}</div>
            <div className="text-sm text-muted-foreground">Finalizate</div>
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
                <SelectItem value="SAFT_D406">SAF-T D406</SelectItem>
                <SelectItem value="VAT_RETURN">Declarație TVA</SelectItem>
                <SelectItem value="EFACTURA_B2B">e-Factura B2B</SelectItem>
                <SelectItem value="EFACTURA_B2C">e-Factura B2C</SelectItem>
                <SelectItem value="E_TRANSPORT">e-Transport</SelectItem>
                <SelectItem value="CUSTOM">Personalizat</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="overdue">Depășite</SelectItem>
                <SelectItem value="due_soon">Urgente</SelectItem>
                <SelectItem value="upcoming">Viitoare</SelectItem>
                <SelectItem value="completed">Finalizate</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchDeadlines} className="ml-auto">
              Reîmprospătare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Deadlines - Critical Alert */}
      {overdueDeadlines.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              Termene depășite - Acțiune imediată necesară!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueDeadlines.map((deadline) => {
                const daysOverdue = Math.abs(getDaysUntilDue(deadline.dueDate));
                return (
                  <div key={deadline.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeColor(deadline.type)}>{getTypeLabel(deadline.type)}</Badge>
                        {getStatusBadge(deadline)}
                      </div>
                      <p className="font-semibold">{deadline.description}</p>
                      <p className="text-sm text-red-600 mt-1">
                        <strong>Depășit cu {daysOverdue} zile!</strong> Termen: {new Date(deadline.dueDate).toLocaleDateString('ro-RO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMarkCompleted(deadline.id)}
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marchează finalizat
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Soon Deadlines - Warning */}
      {dueSoonDeadlines.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Clock className="h-5 w-5" />
              Termene urgente (în următoarele 7 zile)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dueSoonDeadlines.map((deadline) => {
                const daysRemaining = getDaysUntilDue(deadline.dueDate);
                return (
                  <div key={deadline.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeColor(deadline.type)}>{getTypeLabel(deadline.type)}</Badge>
                        {getStatusBadge(deadline)}
                      </div>
                      <p className="font-semibold">{deadline.description}</p>
                      <p className="text-sm text-orange-700 mt-1">
                        {formatDaysRemaining(daysRemaining)} - Termen: {new Date(deadline.dueDate).toLocaleDateString('ro-RO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMarkCompleted(deadline.id)}
                      variant="outline"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marchează finalizat
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Termene viitoare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDeadlines.map((deadline) => {
                const daysRemaining = getDaysUntilDue(deadline.dueDate);
                return (
                  <div key={deadline.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeColor(deadline.type)}>{getTypeLabel(deadline.type)}</Badge>
                        {getStatusBadge(deadline)}
                      </div>
                      <p className="font-semibold">{deadline.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDaysRemaining(daysRemaining)} - Termen: {new Date(deadline.dueDate).toLocaleDateString('ro-RO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMarkCompleted(deadline.id)}
                      variant="outline"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marchează finalizat
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Deadlines */}
      {completedDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Termene finalizate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center gap-4 p-3 border rounded-lg bg-green-50/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTypeColor(deadline.type)}>{getTypeLabel(deadline.type)}</Badge>
                      {getStatusBadge(deadline)}
                    </div>
                    <p className="font-semibold text-gray-700">{deadline.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Termen: {new Date(deadline.dueDate).toLocaleDateString('ro-RO')}
                      {deadline.completedAt && ` - Finalizat: ${new Date(deadline.completedAt).toLocaleDateString('ro-RO')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {deadlines.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Niciun termen găsit</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
