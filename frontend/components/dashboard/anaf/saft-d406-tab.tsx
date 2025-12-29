'use client';

/**
 * SAF-T D406 Tab Component
 * Complete workflow for monthly SAF-T D406 generation and submission
 * Per Order 1783/2021 - Monthly submission starting January 2025
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Eye,
  FileCheck,
  Info,
  Calendar,
} from 'lucide-react';
import { saftD406Service } from '@/lib/anaf/services';
import {
  mockSaftD406Dashboard,
  mockSaftD406GenerationResult,
  mockSaftD406Checklist,
  mockSaftD406Reports,
} from '@/lib/anaf/mocks';
import type { SaftD406Dashboard, SaftD406Checklist, SaftD406Report } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function SaftD406Tab() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<SaftD406Dashboard | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [checklist, setChecklist] = useState<SaftD406Checklist | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [generatedXml, setGeneratedXml] = useState('');

  useEffect(() => {
    fetchDashboard();
    // Auto-select previous period
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    setSelectedPeriod(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setDashboard(mockSaftD406Dashboard);
      } else {
        const data = await saftD406Service.getDashboard('user_001');
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch SAF-T D406 dashboard:', error);
      if (USE_MOCK) setDashboard(mockSaftD406Dashboard);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateXml = async () => {
    if (!selectedPeriod) return;

    try {
      setGenerating(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setGeneratedXml(mockSaftD406GenerationResult.xml || '');
        setChecklist(mockSaftD406Checklist);
        alert('SAF-T D406 XML generat cu succes! (Mock)');
      } else {
        const result = await saftD406Service.generate('user_001', selectedPeriod);
        setGeneratedXml(result.xml || '');
        alert('SAF-T D406 XML generat cu succes!');
      }
    } catch (error: any) {
      console.error('Failed to generate XML:', error);
      alert(`Eroare la generare: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadXml = async () => {
    if (!selectedPeriod) return;

    try {
      if (USE_MOCK) {
        // Create blob and download
        const blob = new Blob([generatedXml || mockSaftD406GenerationResult.xml || ''], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SAF-T_D406_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xml`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        await saftD406Service.download('user_001', selectedPeriod);
      }
    } catch (error: any) {
      console.error('Failed to download XML:', error);
      alert(`Eroare la descărcare: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPeriod) return;
    if (!confirm(`Sigur doriți să transmiteți SAF-T D406 pentru ${selectedPeriod}?`)) return;

    try {
      setSubmitting(true);
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert('SAF-T D406 transmis cu succes către ANAF SPV! (Mock)\nReferință: SAFT-2025-01-001');
        fetchDashboard();
      } else {
        const result = await saftD406Service.submit('user_001', selectedPeriod);
        alert(`SAF-T D406 transmis cu succes!\nReferință: ${result.reference}`);
        fetchDashboard();
      }
    } catch (error: any) {
      console.error('Failed to submit:', error);
      alert(`Eroare la transmitere: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate period options (last 24 months)
  const getPeriodOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
      options.push({ value: period, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      DRAFT: { variant: 'secondary', icon: FileText, label: 'Draft' },
      SUBMITTED: { variant: 'default', icon: Clock, label: 'Transmis' },
      ACCEPTED: { variant: 'default', icon: CheckCircle2, label: 'Acceptat' },
      REJECTED: { variant: 'destructive', icon: XCircle, label: 'Respins' },
    };
    const config = variants[status] || variants.DRAFT;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const gracePeriod = dashboard?.deadlines.gracePeriod;
  const isGracePeriodActive = gracePeriod?.active ?? false;

  return (
    <div className="space-y-4">
      {/* Grace Period Banner */}
      {isGracePeriodActive && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Perioadă pilot activă:</strong> {gracePeriod?.description}
            <br />
            <span className="text-sm text-blue-700">
              Fără penalități pentru întârzieri până pe {gracePeriod?.end ? new Date(gracePeriod.end).toLocaleDateString('ro-RO') : '-'}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts */}
      {dashboard && dashboard.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboard.alerts.map((alert, idx) => (
            <Alert
              key={idx}
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              className={
                alert.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                alert.type === 'info' ? 'bg-blue-50 border-blue-200' : ''
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Left Column: Generation & Submission */}
        <div className="md:col-span-2 space-y-4">
          {/* Period Selector & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Generare SAF-T D406</CardTitle>
              <CardDescription>
                Selectați perioada și generați raportul SAF-T D406 pentru transmitere ANAF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Period Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Perioadă raportare</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectați perioada" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPeriodOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleGenerateXml}
                  disabled={!selectedPeriod || generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generare...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generare XML
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowXmlPreview(!showXmlPreview)}
                  disabled={!generatedXml}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Previzualizare
                </Button>

                <Button
                  onClick={handleDownloadXml}
                  disabled={!generatedXml}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descărcare XML
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={!generatedXml || submitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transmitere...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Transmitere ANAF
                    </>
                  )}
                </Button>
              </div>

              {/* XML Preview */}
              {showXmlPreview && generatedXml && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Previzualizare XML</label>
                  <pre className="p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto max-h-64 border">
                    {generatedXml.slice(0, 1000)}...
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pre-Submission Checklist */}
          {checklist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Checklist pre-transmitere</span>
                  <Badge variant={checklist.ready ? 'default' : 'destructive'}>
                    Scor: {checklist.score}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklist.checklist.map((item, idx) => {
                    const Icon = item.status === 'ok' ? CheckCircle2 : item.status === 'warning' ? AlertTriangle : XCircle;
                    const color = item.status === 'ok' ? 'text-green-600' : item.status === 'warning' ? 'text-orange-600' : 'text-red-600';
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Icon className={`h-5 w-5 ${color} mt-0.5`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item}</p>
                          <p className="text-xs text-muted-foreground">{item.message}</p>
                        </div>
                        {item.required && (
                          <Badge variant="outline" className="text-xs">Obligatoriu</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Reports & Status */}
        <div className="space-y-4">
          {/* Compliance Status */}
          {dashboard?.currentPeriod && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status conformitate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Perioadă curentă:</span>
                  <span className="font-semibold">{dashboard.currentPeriod.period}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={
                    dashboard.currentPeriod.compliance.periodStatus === 'accepted' ? 'default' :
                    dashboard.currentPeriod.compliance.periodStatus === 'pending' ? 'secondary' :
                    'destructive'
                  }>
                    {dashboard.currentPeriod.compliance.periodStatus}
                  </Badge>
                </div>
                {dashboard.deadlines && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Termen:</span>
                    <span className={`font-semibold ${
                      dashboard.deadlines.isOverdue ? 'text-red-600' :
                      dashboard.deadlines.daysRemaining <= 5 ? 'text-orange-600' :
                      'text-gray-900'
                    }`}>
                      {dashboard.deadlines.daysRemaining} zile
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submission Stats */}
          {dashboard?.submissionStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistici transmisii</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboard.submissionStats.accepted}</div>
                    <div className="text-xs text-muted-foreground">Acceptate</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboard.submissionStats.submitted}</div>
                    <div className="text-xs text-muted-foreground">Trimise</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{dashboard.submissionStats.draft}</div>
                    <div className="text-xs text-muted-foreground">Draft</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{dashboard.submissionStats.rejected}</div>
                    <div className="text-xs text-muted-foreground">Respinse</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Rapoarte recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard?.recentReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{report.period}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.generatedAt).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
