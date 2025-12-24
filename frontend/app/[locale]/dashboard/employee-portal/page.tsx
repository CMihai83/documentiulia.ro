'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Calendar,
  FileText,
  Clock,
  Euro,
  Briefcase,
  GraduationCap,
  Heart,
  Plane,
  Home,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Plus,
  Bell,
  Settings,
  ChevronRight,
  TrendingUp,
  Award,
  Target,
  Coffee,
  Sun,
  Moon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LeaveBalance {
  type: string;
  icon: React.ReactNode;
  total: number;
  used: number;
  pending: number;
  color: string;
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

interface PaySlip {
  id: string;
  period: string;
  grossSalary: number;
  netSalary: number;
  paidDate: string;
}

// Sample data
const employeeInfo = {
  name: 'Ion Popescu',
  initials: 'IP',
  position: 'Senior Software Developer',
  department: 'IT',
  manager: 'Maria Ionescu',
  startDate: '2022-03-15',
  email: 'ion.popescu@company.ro',
  phone: '+40 721 234 567',
  contractType: 'Nedeterminat',
  workSchedule: '09:00 - 18:00',
};

const leaveBalances: LeaveBalance[] = [
  { type: 'Concediu Odihnă', icon: <Sun className="h-4 w-4" />, total: 21, used: 12, pending: 2, color: 'bg-blue-500' },
  { type: 'Zile Libere', icon: <Coffee className="h-4 w-4" />, total: 3, used: 1, pending: 0, color: 'bg-green-500' },
  { type: 'Concediu Medical', icon: <Heart className="h-4 w-4" />, total: 180, used: 5, pending: 0, color: 'bg-red-500' },
  { type: 'Work from Home', icon: <Home className="h-4 w-4" />, total: 48, used: 35, pending: 3, color: 'bg-purple-500' },
];

const leaveRequests: LeaveRequest[] = [
  { id: '1', type: 'Concediu Odihnă', startDate: '2024-12-23', endDate: '2024-12-27', days: 5, status: 'pending' },
  { id: '2', type: 'Work from Home', startDate: '2024-12-16', endDate: '2024-12-18', days: 3, status: 'approved' },
  { id: '3', type: 'Concediu Odihnă', startDate: '2024-11-01', endDate: '2024-11-08', days: 6, status: 'approved' },
  { id: '4', type: 'Zi Liberă', startDate: '2024-10-15', endDate: '2024-10-15', days: 1, status: 'approved' },
];

const paySlips: PaySlip[] = [
  { id: '1', period: 'Noiembrie 2024', grossSalary: 15000, netSalary: 9225, paidDate: '2024-11-30' },
  { id: '2', period: 'Octombrie 2024', grossSalary: 15000, netSalary: 9225, paidDate: '2024-10-31' },
  { id: '3', period: 'Septembrie 2024', grossSalary: 14500, netSalary: 8918, paidDate: '2024-09-30' },
  { id: '4', period: 'August 2024', grossSalary: 14500, netSalary: 8918, paidDate: '2024-08-31' },
];

const attendanceData = [
  { day: 'Lun', hours: 8.5 },
  { day: 'Mar', hours: 9 },
  { day: 'Mie', hours: 8 },
  { day: 'Joi', hours: 8.5 },
  { day: 'Vin', hours: 7.5 },
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'În Așteptare',
  approved: 'Aprobat',
  rejected: 'Respins',
};

export default function EmployeePortalPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO');
  };

  const totalLeaveAvailable = leaveBalances[0].total - leaveBalances[0].used - leaveBalances[0].pending;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-blue-100 text-blue-700">{employeeInfo.initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{employeeInfo.name}</h1>
            <p className="text-muted-foreground">{employeeInfo.position} • {employeeInfo.department}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            Notificări
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Setări
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">
            <Home className="mr-2 h-4 w-4" />
            Acasă
          </TabsTrigger>
          <TabsTrigger value="leave">
            <Plane className="mr-2 h-4 w-4" />
            Concedii
          </TabsTrigger>
          <TabsTrigger value="payslips">
            <Euro className="mr-2 h-4 w-4" />
            Fluturași
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documente
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profil
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zile Concediu</CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeaveAvailable}</div>
                <p className="text-xs text-muted-foreground">disponibile din {leaveBalances[0].total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ore Luna Aceasta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">168</div>
                <p className="text-xs text-green-600">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  100% prezență
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Salariu Net</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(9225)}</div>
                <p className="text-xs text-muted-foreground">luna curentă</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vechime</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2 ani 9 luni</div>
                <p className="text-xs text-muted-foreground">din {formatDate(employeeInfo.startDate)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ore Lucrate Săptămâna Aceasta</CardTitle>
                <CardDescription>Total: 41.5 ore</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cereri Recente</CardTitle>
                <CardDescription>Ultimele cereri de concediu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaveRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{req.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(req.startDate)} - {formatDate(req.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{req.days} zile</span>
                        <Badge className={statusColors[req.status]}>
                          {statusLabels[req.status]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leave Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Sold Concedii</CardTitle>
              <CardDescription>Disponibilitate pe tipuri de concediu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {leaveBalances.map((balance) => {
                  const available = balance.total - balance.used - balance.pending;
                  const usedPercent = (balance.used / balance.total) * 100;
                  return (
                    <div key={balance.type} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg ${balance.color} text-white`}>
                          {balance.icon}
                        </div>
                        <span className="font-medium">{balance.type}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Disponibil</span>
                          <span className="font-bold">{available} / {balance.total}</span>
                        </div>
                        <Progress value={usedPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Folosit: {balance.used}</span>
                          {balance.pending > 0 && <span>În așteptare: {balance.pending}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Tab */}
        <TabsContent value="leave" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Cerere Nouă
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Istoricul Cererilor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaveRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{req.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(req.startDate)} - {formatDate(req.endDate)} ({req.days} zile)
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[req.status]}>
                      {statusLabels[req.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payslips Tab */}
        <TabsContent value="payslips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fluturași de Salariu</CardTitle>
              <CardDescription>Descarcă fluturașii de salariu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paySlips.map((slip) => (
                  <div key={slip.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Euro className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{slip.period}</p>
                        <p className="text-sm text-muted-foreground">Plătit: {formatDate(slip.paidDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Brut</p>
                        <p className="font-medium">{formatCurrency(slip.grossSalary)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Net</p>
                        <p className="font-bold text-green-600">{formatCurrency(slip.netSalary)}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documentele Mele</CardTitle>
                  <CardDescription>Contract, adeverințe și alte documente</CardDescription>
                </div>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Încarcă
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Contract Individual de Muncă', date: '2022-03-15', type: 'Contract' },
                  { name: 'Act Adițional - Mărire Salariu', date: '2024-01-01', type: 'Act Adițional' },
                  { name: 'Adeverință Venit 2024', date: '2024-11-15', type: 'Adeverință' },
                  { name: 'Fișa Postului', date: '2022-03-15', type: 'Document' },
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.type} • {formatDate(doc.date)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Descarcă
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informații Personale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Nume Complet', value: employeeInfo.name },
                  { label: 'Email', value: employeeInfo.email },
                  { label: 'Telefon', value: employeeInfo.phone },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informații Profesionale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Poziție', value: employeeInfo.position },
                  { label: 'Departament', value: employeeInfo.department },
                  { label: 'Manager', value: employeeInfo.manager },
                  { label: 'Tip Contract', value: employeeInfo.contractType },
                  { label: 'Program', value: employeeInfo.workSchedule },
                  { label: 'Data Angajării', value: formatDate(employeeInfo.startDate) },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
