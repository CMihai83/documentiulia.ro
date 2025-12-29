'use client';

/**
 * Overview Tab Component
 * ANAF dashboard overview with compliance score, urgent alerts, and quick actions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Receipt,
  Truck,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Activity,
  Loader2,
} from 'lucide-react';
import { mockSpvDashboard, mockDeadlineReminders, mockSpvSubmissions } from '@/lib/anaf/mocks';
import type { SpvDashboard, DeadlineReminder, SpvSubmission } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<SpvDashboard | null>(null);
  const [urgentDeadlines, setUrgentDeadlines] = useState<DeadlineReminder[]>([]);
  const [recentActivity, setRecentActivity] = useState<SpvSubmission[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setDashboard(mockSpvDashboard);
        // Get urgent deadlines (overdue + due soon)
        const urgent = mockDeadlineReminders
          .filter(d => (d.status === 'overdue' || d.status === 'due_soon') && !d.completed)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 3);
        setUrgentDeadlines(urgent);
        // Get recent submissions
        setRecentActivity(mockSpvSubmissions.slice(0, 10));
      } else {
        // Real API call would go here
        // const data = await spvService.getDashboard();
        // setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      if (USE_MOCK) {
        setDashboard(mockSpvDashboard);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateComplianceScore = () => {
    // Mock calculation based on submissions and deadlines
    const totalSubmissions = dashboard?.stats.submissionsTotal || 0;
    const recentSubmissions = dashboard?.stats.submissionsThisMonth || 0;
    const pendingActions = dashboard?.stats.pendingActions || 0;
    const overdueCount = urgentDeadlines.filter(d => d.status === 'overdue').length;

    let score = 100;
    score -= overdueCount * 15; // -15 for each overdue deadline
    score -= pendingActions * 5; // -5 for each pending action
    if (recentSubmissions === 0 && totalSubmissions > 0) {
      score -= 10; // -10 if no submissions this month
    }

    return Math.max(0, Math.min(100, score));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return { stroke: '#10b981', text: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 70) return { stroke: '#f59e0b', text: 'text-orange-600', bg: 'bg-orange-50' };
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excelent';
    if (score >= 70) return 'Bine';
    if (score >= 50) return 'Suficient';
    return 'Critic';
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const quickActions = [
    {
      title: 'Generează SAF-T D406',
      description: 'Raport lunar pentru ANAF',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      href: '#saft-d406',
    },
    {
      title: 'Transmite e-Factura',
      description: 'Facturi B2B/B2C',
      icon: Receipt,
      color: 'bg-green-50 text-green-600 border-green-200',
      href: '#efactura',
    },
    {
      title: 'Declarație e-Transport',
      description: 'Transport mărfuri',
      icon: Truck,
      color: 'bg-orange-50 text-orange-600 border-orange-200',
      href: '#etransport',
    },
    {
      title: 'Vezi Termene',
      description: 'Calendar ANAF',
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      href: '#deadlines',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const complianceScore = calculateComplianceScore();
  const scoreColor = getScoreColor(complianceScore);

  return (
    <div className="space-y-6">
      {/* Urgent Deadlines Alert Banner */}
      {urgentDeadlines.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-2">
                  {urgentDeadlines.filter(d => d.status === 'overdue').length > 0
                    ? `Aveți ${urgentDeadlines.filter(d => d.status === 'overdue').length} termene depășite!`
                    : `Aveți ${urgentDeadlines.length} termene urgente!`}
                </h4>
                <div className="space-y-2">
                  {urgentDeadlines.map((deadline) => {
                    const daysRemaining = getDaysUntilDue(deadline.dueDate);
                    return (
                      <div key={deadline.id} className="flex items-center justify-between text-sm">
                        <span className="text-red-800">
                          • {deadline.description}
                        </span>
                        <span className="font-medium text-red-700">
                          {daysRemaining < 0
                            ? `Depășit cu ${Math.abs(daysRemaining)} zile`
                            : daysRemaining === 0
                            ? 'Astăzi'
                            : `În ${daysRemaining} zile`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Compliance Score Gauge */}
        <Card className={scoreColor.bg}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${scoreColor.text}`} />
              Scor Conformitate ANAF
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-4">
            {/* SVG Circular Gauge */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={scoreColor.stroke}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(complianceScore / 100) * 251.2} 251.2`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${scoreColor.text}`}>
                  {complianceScore}
                </span>
                <span className="text-sm text-muted-foreground">din 100</span>
              </div>
            </div>
            <Badge className={`mt-4 ${scoreColor.text}`} variant="outline">
              {getScoreLabel(complianceScore)}
            </Badge>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Scor calculat pe baza termenelor și transmisiilor recente
            </p>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard?.stats.submissionsTotal || 0}</p>
                  <p className="text-sm text-muted-foreground">Total transmisii</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard?.stats.submissionsThisMonth || 0}</p>
                  <p className="text-sm text-muted-foreground">Luna aceasta</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard?.stats.pendingActions || 0}</p>
                  <p className="text-sm text-muted-foreground">Acțiuni în așteptare</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard?.stats.unreadMessages || 0}</p>
                  <p className="text-sm text-muted-foreground">Mesaje noi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Acțiuni rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <a
                  key={index}
                  href={action.href}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:shadow-md ${action.color}`}
                >
                  <Icon className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs opacity-80">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-60" />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activitate recentă
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nicio activitate recentă
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((submission) => {
                const typeIcons = {
                  SAFT: FileText,
                  EFACTURA: Receipt,
                  E_TRANSPORT: Truck,
                };
                const Icon = typeIcons[submission.type as keyof typeof typeIcons] || FileText;
                const statusColors = {
                  ACCEPTED: 'bg-green-100 text-green-800',
                  SUBMITTED: 'bg-blue-100 text-blue-800',
                  PENDING: 'bg-yellow-100 text-yellow-800',
                  REJECTED: 'bg-red-100 text-red-800',
                  ERROR: 'bg-red-100 text-red-800',
                };
                return (
                  <div
                    key={submission.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{submission.type}</span>
                        <Badge className={statusColors[submission.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                          {submission.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleDateString('ro-RO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {submission.uploadIndex && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {submission.uploadIndex}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
