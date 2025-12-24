'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Receipt,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  CreditCard,
  Banknote,
  Building2,
  User,
  FileText,
  BarChart3,
  TrendingUp,
  Eye,
  Edit,
  MoreHorizontal,
  Camera,
  CheckSquare,
  XSquare,
  Send,
  RefreshCw,
  Wallet,
  PieChart,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'reimbursed';
type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

interface Expense {
  id: string;
  employeeName: string;
  employeeInitials: string;
  categoryName: string;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  vendorName?: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  approvedBy?: string;
  tags: string[];
}

interface ExpenseReport {
  id: string;
  employeeName: string;
  title: string;
  expenseCount: number;
  totalAmount: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  submittedAt?: string;
  createdAt: string;
}

// Sample data
const sampleExpenses: Expense[] = [
  {
    id: '1',
    employeeName: 'Ion Popescu',
    employeeInitials: 'IP',
    categoryName: 'Transport',
    description: 'Bilet avion București - Cluj pentru conferință',
    amount: 450,
    vatAmount: 85.5,
    totalAmount: 535.5,
    currency: 'RON',
    expenseDate: '2024-12-10',
    paymentMethod: 'card',
    vendorName: 'Wizz Air',
    status: 'submitted',
    tags: ['conferință', 'deplasare'],
  },
  {
    id: '2',
    employeeName: 'Maria Ionescu',
    employeeInitials: 'MI',
    categoryName: 'Cazare',
    description: 'Hotel pentru 2 nopți - Training extern',
    amount: 680,
    vatAmount: 129.2,
    totalAmount: 809.2,
    currency: 'RON',
    expenseDate: '2024-12-08',
    paymentMethod: 'card',
    vendorName: 'Hotel Marriott',
    status: 'approved',
    approvedBy: 'Elena Stancu',
    tags: ['training'],
  },
  {
    id: '3',
    employeeName: 'Andrei Marin',
    employeeInitials: 'AM',
    categoryName: 'Consumabile',
    description: 'Achiziție toner imprimantă birou',
    amount: 185,
    vatAmount: 35.15,
    totalAmount: 220.15,
    currency: 'RON',
    expenseDate: '2024-12-12',
    paymentMethod: 'cash',
    vendorName: 'IT Store SRL',
    receiptUrl: '/receipts/3.pdf',
    status: 'draft',
    tags: ['birou'],
  },
  {
    id: '4',
    employeeName: 'Elena Dumitrescu',
    employeeInitials: 'ED',
    categoryName: 'Masă',
    description: 'Prânz cu client - negociere contract',
    amount: 320,
    vatAmount: 60.8,
    totalAmount: 380.8,
    currency: 'RON',
    expenseDate: '2024-12-11',
    paymentMethod: 'card',
    vendorName: 'Restaurant Caru cu Bere',
    status: 'rejected',
    tags: ['client', 'vânzări'],
  },
  {
    id: '5',
    employeeName: 'Alexandru Popa',
    employeeInitials: 'AP',
    categoryName: 'Software',
    description: 'Licență Adobe Creative Cloud - anual',
    amount: 2400,
    vatAmount: 456,
    totalAmount: 2856,
    currency: 'RON',
    expenseDate: '2024-12-01',
    paymentMethod: 'bank_transfer',
    vendorName: 'Adobe Systems',
    status: 'paid',
    approvedBy: 'Director Financiar',
    tags: ['software', 'licență'],
  },
  {
    id: '6',
    employeeName: 'Ana Vasilescu',
    employeeInitials: 'AV',
    categoryName: 'Transport',
    description: 'Combustibil - deplasare la client',
    amount: 250,
    vatAmount: 47.5,
    totalAmount: 297.5,
    currency: 'RON',
    expenseDate: '2024-12-13',
    paymentMethod: 'card',
    vendorName: 'OMV Petrom',
    status: 'submitted',
    tags: ['client', 'combustibil'],
  },
];

const sampleReports: ExpenseReport[] = [
  {
    id: '1',
    employeeName: 'Ion Popescu',
    title: 'Deplasare Conferință Tech Summit 2024',
    expenseCount: 5,
    totalAmount: 2850,
    status: 'submitted',
    submittedAt: '2024-12-10',
    createdAt: '2024-12-08',
  },
  {
    id: '2',
    employeeName: 'Maria Ionescu',
    title: 'Training Management Q4',
    expenseCount: 3,
    totalAmount: 1450,
    status: 'approved',
    submittedAt: '2024-12-05',
    createdAt: '2024-12-03',
  },
  {
    id: '3',
    employeeName: 'Andrei Marin',
    title: 'Cheltuieli birou Decembrie',
    expenseCount: 8,
    totalAmount: 650,
    status: 'draft',
    createdAt: '2024-12-12',
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const statusColors: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-purple-100 text-purple-800',
  reimbursed: 'bg-emerald-100 text-emerald-800',
};

const statusLabels: Record<ExpenseStatus, string> = {
  draft: 'Ciornă',
  submitted: 'Trimis',
  approved: 'Aprobat',
  rejected: 'Respins',
  paid: 'Plătit',
  reimbursed: 'Rambursat',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Numerar',
  card: 'Card',
  bank_transfer: 'Transfer',
  other: 'Altul',
};

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  bank_transfer: <Building2 className="h-4 w-4" />,
  other: <Wallet className="h-4 w-4" />,
};

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Calculate statistics
  const stats = {
    total: sampleExpenses.length,
    draft: sampleExpenses.filter(e => e.status === 'draft').length,
    pending: sampleExpenses.filter(e => e.status === 'submitted').length,
    approved: sampleExpenses.filter(e => e.status === 'approved' || e.status === 'paid').length,
    rejected: sampleExpenses.filter(e => e.status === 'rejected').length,
    totalAmount: sampleExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
    pendingAmount: sampleExpenses
      .filter(e => e.status === 'submitted')
      .reduce((sum, e) => sum + e.totalAmount, 0),
    thisMonth: sampleExpenses.filter(e => new Date(e.expenseDate).getMonth() === 11).length,
  };

  // Category data for chart
  const categoryData = [...new Set(sampleExpenses.map(e => e.categoryName))].map(cat => ({
    name: cat,
    value: sampleExpenses
      .filter(e => e.categoryName === cat)
      .reduce((sum, e) => sum + e.totalAmount, 0),
  }));

  // Monthly trend
  const monthlyData = [
    { month: 'Aug', amount: 8500 },
    { month: 'Sep', amount: 12300 },
    { month: 'Oct', amount: 9800 },
    { month: 'Nov', amount: 11200 },
    { month: 'Dec', amount: stats.totalAmount },
  ];

  // Filter expenses
  const filteredExpenses = sampleExpenses.filter(expense => {
    const matchesSearch = searchQuery === '' ||
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || expense.categoryName === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = [...new Set(sampleExpenses.map(e => e.categoryName))];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestiune Cheltuieli</h1>
          <p className="text-muted-foreground">
            Înregistrare, aprobare și rambursare cheltuieli angajați
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Camera className="mr-2 h-4 w-4" />
            Scanare Bon
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Cheltuială Nouă
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="mr-2 h-4 w-4" />
            Cheltuieli
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Rapoarte
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <CheckSquare className="mr-2 h-4 w-4" />
            Aprobări
            {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-2">{stats.pending}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cheltuieli</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.thisMonth} luna aceasta
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valoare Totală</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
                <p className="text-xs text-green-600">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12% vs luna trecută
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">În Așteptare</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.pendingAmount)} valoare
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprobate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.rejected} respinse
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cheltuieli pe Categorii</CardTitle>
                <CardDescription>Distribuție valoare per categorie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evoluție Lunară</CardTitle>
                <CardDescription>Trend cheltuieli ultimele 5 luni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cheltuieli Recente</CardTitle>
                  <CardDescription>Ultimele cheltuieli înregistrate</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Vezi toate
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleExpenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{expense.employeeInitials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.employeeName} • {expense.categoryName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(expense.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(expense.expenseDate)}</p>
                      </div>
                      <Badge className={statusColors[expense.status]}>
                        {statusLabels[expense.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare după descriere, angajat, furnizor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{expense.employeeInitials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{expense.description}</span>
                          {expense.receiptUrl && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Bon
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {expense.employeeName}
                          </span>
                          <span>{expense.categoryName}</span>
                          {expense.vendorName && <span>{expense.vendorName}</span>}
                          <span className="flex items-center gap-1">
                            {paymentMethodIcons[expense.paymentMethod]}
                            {paymentMethodLabels[expense.paymentMethod]}
                          </span>
                        </div>
                        {expense.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {expense.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(expense.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">
                          TVA: {formatCurrency(expense.vatAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(expense.expenseDate)}</p>
                      </div>
                      <Badge className={statusColors[expense.status]}>
                        {statusLabels[expense.status]}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rapoarte Cheltuieli</CardTitle>
                  <CardDescription>Grupări de cheltuieli pentru aprobare</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Raport Nou
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{report.employeeName}</span>
                          <span>{report.expenseCount} cheltuieli</span>
                          <span>Creat: {formatDate(report.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(report.totalAmount)}</p>
                        {report.submittedAt && (
                          <p className="text-xs text-muted-foreground">
                            Trimis: {formatDate(report.submittedAt)}
                          </p>
                        )}
                      </div>
                      <Badge className={statusColors[report.status as ExpenseStatus] || 'bg-gray-100 text-gray-800'}>
                        {report.status === 'under_review' ? 'În Review' : statusLabels[report.status as ExpenseStatus] || report.status}
                      </Badge>
                      {report.status === 'draft' && (
                        <Button size="sm">
                          <Send className="mr-2 h-3 w-3" />
                          Trimite
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cheltuieli de Aprobat</CardTitle>
              <CardDescription>Cheltuieli care necesită aprobare</CardDescription>
            </CardHeader>
            <CardContent>
              {sampleExpenses.filter(e => e.status === 'submitted').length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">Toate cheltuielile au fost procesate</p>
                  <p className="text-muted-foreground">Nu există cheltuieli în așteptare</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sampleExpenses.filter(e => e.status === 'submitted').map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/50">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{expense.employeeInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{expense.employeeName}</span>
                            <span>{expense.categoryName}</span>
                            <span>{formatDate(expense.expenseDate)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-lg">{formatCurrency(expense.totalAmount)}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                            <XSquare className="mr-2 h-4 w-4" />
                            Respinge
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckSquare className="mr-2 h-4 w-4" />
                            Aprobă
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
