'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Leaf,
  Zap,
  Droplets,
  Recycle,
  FileText,
  Download,
  TrendingDown,
  TrendingUp,
  Target,
  Building2,
  Car,
  Factory,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
  Users,
  Shield,
} from 'lucide-react';

interface EmissionSource {
  category: string;
  source: string;
  scope: 1 | 2 | 3;
  emissions: number; // in tCO2e
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface SustainabilityGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'achieved' | 'behind';
}

const emissionSources: EmissionSource[] = [
  { category: 'Energie', source: 'Electricitate', scope: 2, emissions: 45.2, percentage: 35, trend: 'down', trendValue: 12 },
  { category: 'Transport', source: 'Flota Auto', scope: 1, emissions: 32.8, percentage: 25, trend: 'down', trendValue: 8 },
  { category: 'Încălzire', source: 'Gaz Natural', scope: 1, emissions: 25.5, percentage: 20, trend: 'stable', trendValue: 0 },
  { category: 'Călătorii', source: 'Avioane', scope: 3, emissions: 15.2, percentage: 12, trend: 'up', trendValue: 5 },
  { category: 'Deșeuri', source: 'Deșeuri Solide', scope: 3, emissions: 10.3, percentage: 8, trend: 'down', trendValue: 15 },
];

const sustainabilityGoals: SustainabilityGoal[] = [
  { id: '1', title: 'Reducere Emisii CO2', target: 50, current: 35, unit: '%', deadline: '2025-12-31', status: 'on_track' },
  { id: '2', title: 'Energie Regenerabilă', target: 100, current: 65, unit: '%', deadline: '2030-12-31', status: 'on_track' },
  { id: '3', title: 'Deșeuri Reciclate', target: 80, current: 72, unit: '%', deadline: '2025-06-30', status: 'at_risk' },
  { id: '4', title: 'Consum Apă', target: -30, current: -22, unit: '%', deadline: '2025-12-31', status: 'behind' },
  { id: '5', title: 'Certificare ISO 14001', target: 100, current: 100, unit: '%', deadline: '2024-12-31', status: 'achieved' },
];

const csrdRequirements = [
  { id: 'E1', name: 'Schimbări Climatice', status: 'complete', progress: 100 },
  { id: 'E2', name: 'Poluare', status: 'in_progress', progress: 75 },
  { id: 'E3', name: 'Apă și Resurse Marine', status: 'in_progress', progress: 60 },
  { id: 'E4', name: 'Biodiversitate', status: 'not_started', progress: 0 },
  { id: 'E5', name: 'Economie Circulară', status: 'in_progress', progress: 45 },
  { id: 'S1', name: 'Forță de Muncă Proprie', status: 'complete', progress: 100 },
  { id: 'S2', name: 'Lucrători în Lanțul Valoric', status: 'in_progress', progress: 30 },
  { id: 'S3', name: 'Comunități Afectate', status: 'not_started', progress: 0 },
  { id: 'S4', name: 'Consumatori', status: 'in_progress', progress: 55 },
  { id: 'G1', name: 'Conduita în Afaceri', status: 'complete', progress: 100 },
];

export default function SustainabilityPage() {
  const [selectedYear, setSelectedYear] = useState('2025');

  const totalEmissions = emissionSources.reduce((sum, source) => sum + source.emissions, 0);
  const scope1 = emissionSources.filter(s => s.scope === 1).reduce((sum, s) => sum + s.emissions, 0);
  const scope2 = emissionSources.filter(s => s.scope === 2).reduce((sum, s) => sum + s.emissions, 0);
  const scope3 = emissionSources.filter(s => s.scope === 3).reduce((sum, s) => sum + s.emissions, 0);

  const getStatusBadge = (status: string) => {
    const configs = {
      on_track: { color: 'bg-green-100 text-green-700', label: 'Pe Drum Bun', icon: CheckCircle2 },
      at_risk: { color: 'bg-amber-100 text-amber-700', label: 'Risc', icon: AlertTriangle },
      behind: { color: 'bg-red-100 text-red-700', label: 'În Urmă', icon: AlertTriangle },
      achieved: { color: 'bg-blue-100 text-blue-700', label: 'Realizat', icon: CheckCircle2 },
    };
    const config = configs[status as keyof typeof configs];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getCSRDStatus = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-700">Complet</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-100 text-amber-700">În Lucru</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Neînceput</Badge>;
    }
  };

  const csrdProgress = Math.round(
    csrdRequirements.reduce((sum, req) => sum + req.progress, 0) / csrdRequirements.length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Raportare Sustenabilitate</h1>
          <p className="text-muted-foreground">
            Monitor ESG și conformitate CSRD pentru afacerea ta
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-md border px-3 py-2"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Raport
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEmissions.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">tCO2e Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 p-3">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">65%</p>
              <p className="text-sm text-muted-foreground">Energie Verde</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-cyan-100 p-3">
              <Droplets className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">-22%</p>
              <p className="text-sm text-muted-foreground">Consum Apă</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-amber-100 p-3">
              <Recycle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">72%</p>
              <p className="text-sm text-muted-foreground">Deșeuri Reciclate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="emissions">
        <TabsList>
          <TabsTrigger value="emissions">Emisii Carbon</TabsTrigger>
          <TabsTrigger value="goals">Obiective ESG</TabsTrigger>
          <TabsTrigger value="csrd">Conformitate CSRD</TabsTrigger>
        </TabsList>

        {/* Emissions Tab */}
        <TabsContent value="emissions" className="mt-6 space-y-6">
          {/* Scope Distribution */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Factory className="h-5 w-5 text-red-500" />
                  Scope 1 - Directe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{scope1.toFixed(1)} tCO2e</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Emisii din surse proprii (combustie, vehicule)
                </p>
                <Progress value={(scope1 / totalEmissions) * 100} className="mt-3 h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  {((scope1 / totalEmissions) * 100).toFixed(0)}% din total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Scope 2 - Indirecte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{scope2.toFixed(1)} tCO2e</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Emisii din energie cumpărată (electricitate)
                </p>
                <Progress value={(scope2 / totalEmissions) * 100} className="mt-3 h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  {((scope2 / totalEmissions) * 100).toFixed(0)}% din total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Scope 3 - Lanț Valoric
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{scope3.toFixed(1)} tCO2e</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Emisii indirecte din lanțul de aprovizionare
                </p>
                <Progress value={(scope3 / totalEmissions) * 100} className="mt-3 h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  {((scope3 / totalEmissions) * 100).toFixed(0)}% din total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Emissions */}
          <Card>
            <CardHeader>
              <CardTitle>Detalii Emisii pe Categorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emissionSources.map((source, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-32 font-medium">{source.source}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{source.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{source.emissions} tCO2e</span>
                          <Badge outline>Scope {source.scope}</Badge>
                          {source.trend === 'down' ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              -{source.trendValue}%
                            </span>
                          ) : source.trend === 'up' ? (
                            <span className="flex items-center text-red-600 text-sm">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              +{source.trendValue}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">~0%</span>
                          )}
                        </div>
                      </div>
                      <Progress value={source.percentage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {sustainabilityGoals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                    {getStatusBadge(goal.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold">
                        {goal.current}{goal.unit}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        / {goal.target}{goal.unit}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Deadline: {new Date(goal.deadline).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                  <Progress
                    value={Math.abs(goal.current / goal.target) * 100}
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground">
                    {((Math.abs(goal.current) / Math.abs(goal.target)) * 100).toFixed(0)}% din obiectiv atins
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CSRD Tab */}
        <TabsContent value="csrd" className="mt-6 space-y-6">
          {/* CSRD Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Conformitate CSRD</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Corporate Sustainability Reporting Directive - ESRS Standards
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{csrdProgress}%</div>
                  <p className="text-sm text-muted-foreground">Progres Total</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={csrdProgress} className="h-4" />
            </CardContent>
          </Card>

          {/* ESRS Standards */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Environmental */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Leaf className="h-5 w-5 text-green-500" />
                  Standarde de Mediu (E)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {csrdRequirements.filter(r => r.id.startsWith('E')).map((req) => (
                  <div key={req.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{req.id}</span>
                      <span>{req.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={req.progress} className="w-20 h-2" />
                      {getCSRDStatus(req.status)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Social */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-blue-500" />
                  Standarde Sociale (S)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {csrdRequirements.filter(r => r.id.startsWith('S')).map((req) => (
                  <div key={req.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{req.id}</span>
                      <span>{req.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={req.progress} className="w-20 h-2" />
                      {getCSRDStatus(req.status)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Governance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  Standarde de Guvernanță (G)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {csrdRequirements.filter(r => r.id.startsWith('G')).map((req) => (
                  <div key={req.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{req.id}</span>
                      <span>{req.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={req.progress} className="w-20 h-2" />
                      {getCSRDStatus(req.status)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-start gap-4 p-6">
              <Info className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-blue-900">Despre CSRD</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Directiva CSRD se aplică companiilor mari și listate din UE începând cu 2024.
                  IMM-urile listate vor fi obligate să raporteze din 2026. DocumentIulia te ajută
                  să te pregătești pentru aceste cerințe.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
