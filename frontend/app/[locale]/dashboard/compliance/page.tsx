'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  FileText,
  Download,
  Send,
  RefreshCw,
  BarChart3,
  Lock,
  Eye,
  ChevronRight,
  Building2,
  ListChecks,
  Bell,
  TrendingUp,
} from 'lucide-react';

interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  category: 'anaf' | 'gdpr' | 'soc2' | 'internal';
  status: 'compliant' | 'warning' | 'non_compliant' | 'pending';
  deadline?: string;
  lastCheck?: string;
  progress?: number;
}

interface Declaration {
  id: string;
  code: string;
  name: string;
  period: string;
  deadline: string;
  status: 'submitted' | 'pending' | 'overdue' | 'draft';
  submittedAt?: string;
}

// Sample data
const complianceItems: ComplianceItem[] = [
  { id: '1', name: 'e-Factura', description: 'Integrare completă cu SPV ANAF', category: 'anaf', status: 'compliant', lastCheck: '2024-12-14' },
  { id: '2', name: 'SAF-T D406', description: 'Raportare lunară XML', category: 'anaf', status: 'compliant', lastCheck: '2024-12-14' },
  { id: '3', name: 'REVISAL', description: 'Sincronizare registru angajați', category: 'anaf', status: 'warning', lastCheck: '2024-12-10', deadline: '2024-12-15' },
  { id: '4', name: 'GDPR Consimțământ', description: 'Colectare și gestionare consimțăminte', category: 'gdpr', status: 'compliant', progress: 100 },
  { id: '5', name: 'GDPR Retenție Date', description: 'Politici de ștergere automată', category: 'gdpr', status: 'warning', progress: 85 },
  { id: '6', name: 'SOC 2 Acces', description: 'Control acces și autentificare', category: 'soc2', status: 'compliant', progress: 100 },
  { id: '7', name: 'SOC 2 Audit Trail', description: 'Logare completă activități', category: 'soc2', status: 'compliant', progress: 100 },
  { id: '8', name: 'Backup Date', description: 'Backup zilnic și retenție', category: 'internal', status: 'compliant', lastCheck: '2024-12-14' },
];

const declarations: Declaration[] = [
  { id: '1', code: 'D406', name: 'SAF-T Noiembrie', period: 'Noiembrie 2024', deadline: '2024-12-15', status: 'pending' },
  { id: '2', code: 'D112', name: 'Contribuții Sociale', period: 'Noiembrie 2024', deadline: '2024-12-25', status: 'draft' },
  { id: '3', code: 'D100', name: 'Impozit pe Venit', period: 'Q4 2024', deadline: '2024-12-25', status: 'draft' },
  { id: '4', code: 'D394', name: 'Tranzacții Intracomunitare', period: 'Noiembrie 2024', deadline: '2024-12-25', status: 'pending' },
  { id: '5', code: 'D406', name: 'SAF-T Octombrie', period: 'Octombrie 2024', deadline: '2024-11-15', status: 'submitted', submittedAt: '2024-11-14' },
];

const statusColors = {
  compliant: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  non_compliant: 'bg-red-100 text-red-800',
  pending: 'bg-blue-100 text-blue-800',
};

const statusLabels = {
  compliant: 'Conform',
  warning: 'Atenție',
  non_compliant: 'Neconform',
  pending: 'În Verificare',
};

const declStatusColors = {
  submitted: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
};

const declStatusLabels = {
  submitted: 'Depus',
  pending: 'De Depus',
  overdue: 'Întârziat',
  draft: 'Ciornă',
};

const categoryLabels = {
  anaf: 'ANAF',
  gdpr: 'GDPR',
  soc2: 'SOC 2',
  internal: 'Intern',
};

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = {
    total: complianceItems.length,
    compliant: complianceItems.filter(i => i.status === 'compliant').length,
    warnings: complianceItems.filter(i => i.status === 'warning').length,
    nonCompliant: complianceItems.filter(i => i.status === 'non_compliant').length,
    pendingDeclarations: declarations.filter(d => d.status === 'pending' || d.status === 'draft').length,
    upcomingDeadlines: declarations.filter(d => {
      const deadline = new Date(d.deadline);
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return deadline <= sevenDays && deadline >= now && d.status !== 'submitted';
    }).length,
  };

  const complianceScore = Math.round((stats.compliant / stats.total) * 100);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO');
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conformitate</h1>
          <p className="text-muted-foreground">Monitorizare ANAF, GDPR, SOC 2 și standarde interne</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Raport Audit
          </Button>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Verificare Completă
          </Button>
        </div>
      </div>

      {/* Compliance Score Card */}
      <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Scor Conformitate</h2>
                <p className="text-green-100">Toate sistemele verificate</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold">{complianceScore}%</div>
                <div className="text-xs text-green-100">Scor general</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.compliant}/{stats.total}</div>
                <div className="text-xs text-green-100">Cerințe îndeplinite</div>
              </div>
              {stats.warnings > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">{stats.warnings}</div>
                  <div className="text-xs text-green-100">Atenționări</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="declarations">
            <FileText className="mr-2 h-4 w-4" />
            Declarații
          </TabsTrigger>
          <TabsTrigger value="requirements">
            <ListChecks className="mr-2 h-4 w-4" />
            Cerințe
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conforme</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.compliant}</div>
                <p className="text-xs text-muted-foreground">cerințe îndeplinite</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atenționări</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
                <p className="text-xs text-muted-foreground">necesită atenție</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Declarații</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingDeclarations}</div>
                <p className="text-xs text-muted-foreground">de depus</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Termene Apropiate</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</div>
                <p className="text-xs text-muted-foreground">în 7 zile</p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance by Category */}
          <div className="grid gap-4 md:grid-cols-2">
            {['anaf', 'gdpr', 'soc2', 'internal'].map((category) => {
              const items = complianceItems.filter(i => i.category === category);
              const compliantCount = items.filter(i => i.status === 'compliant').length;
              const score = Math.round((compliantCount / items.length) * 100);

              return (
                <Card key={category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{categoryLabels[category as keyof typeof categoryLabels]}</CardTitle>
                      <Badge className={score === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {score}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={score} className="h-2 mb-4" />
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            {item.status === 'compliant' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <Badge className={statusColors[item.status]} variant="secondary">
                            {statusLabels[item.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="declarations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Declarații ANAF</CardTitle>
              <CardDescription>Starea depunerilor obligatorii</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {declarations.map((decl) => {
                  const daysUntil = getDaysUntil(decl.deadline);
                  const isUrgent = daysUntil <= 3 && decl.status !== 'submitted';

                  return (
                    <div key={decl.id} className={`flex items-center justify-between p-4 border rounded-lg ${isUrgent ? 'border-orange-300 bg-orange-50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${decl.status === 'submitted' ? 'bg-green-100' : 'bg-muted'}`}>
                          <FileText className={`h-5 w-5 ${decl.status === 'submitted' ? 'text-green-600' : ''}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{decl.code}</Badge>
                            <span className="font-medium">{decl.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{decl.period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Termen: {formatDate(decl.deadline)}</p>
                          {decl.status !== 'submitted' && (
                            <p className={`text-xs ${daysUntil <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {daysUntil > 0 ? `${daysUntil} zile rămase` : 'ASTĂZI'}
                            </p>
                          )}
                          {decl.submittedAt && (
                            <p className="text-xs text-green-600">Depus: {formatDate(decl.submittedAt)}</p>
                          )}
                        </div>
                        <Badge className={declStatusColors[decl.status]}>
                          {declStatusLabels[decl.status]}
                        </Badge>
                        {decl.status !== 'submitted' && (
                          <Button size="sm">
                            <Send className="mr-2 h-3 w-3" />
                            Depune
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Toate Cerințele de Conformitate</CardTitle>
              <CardDescription>Listă completă cerințe și status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        item.status === 'compliant' ? 'bg-green-100' :
                        item.status === 'warning' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        {item.status === 'compliant' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : item.status === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="outline">{categoryLabels[item.category]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.progress !== undefined && (
                        <div className="w-24">
                          <Progress value={item.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center mt-1">{item.progress}%</p>
                        </div>
                      )}
                      {item.lastCheck && (
                        <p className="text-sm text-muted-foreground">
                          Verificat: {formatDate(item.lastCheck)}
                        </p>
                      )}
                      <Badge className={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Obligații</CardTitle>
              <CardDescription>Termene și obligații pe luni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {['Decembrie 2024', 'Ianuarie 2025', 'Februarie 2025'].map((month, idx) => (
                  <Card key={month}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{month}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {idx === 0 ? (
                          <>
                            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                              <span className="text-sm">15 - D406 SAF-T</span>
                              <Badge className="bg-yellow-100 text-yellow-800">Urgent</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">25 - D112</span>
                              <Badge variant="outline">Ciornă</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">25 - D100</span>
                              <Badge variant="outline">Ciornă</Badge>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Termene în curs de planificare
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
