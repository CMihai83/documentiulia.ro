'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Search,
  Plus,
  Filter,
  Download,
  Star,
  Euro,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  MoreHorizontal,
  Users,
  Package,
  Calendar,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

type VendorStatus = 'active' | 'inactive' | 'pending' | 'blocked';
type VendorCategory = 'it' | 'office' | 'services' | 'logistics' | 'materials' | 'other';

interface Vendor {
  id: string;
  name: string;
  cui: string;
  category: VendorCategory;
  status: VendorStatus;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  totalSpend: number;
  invoiceCount: number;
  paymentTerms: number;
  onTimePaymentRate: number;
  lastOrderDate?: string;
}

// Sample data
const sampleVendors: Vendor[] = [
  {
    id: '1',
    name: 'Tech Solutions SRL',
    cui: 'RO12345678',
    category: 'it',
    status: 'active',
    contactName: 'Alexandru Ionescu',
    email: 'contact@techsolutions.ro',
    phone: '+40 21 123 4567',
    address: 'București, Sector 1',
    rating: 4.8,
    totalSpend: 245000,
    invoiceCount: 45,
    paymentTerms: 30,
    onTimePaymentRate: 95,
    lastOrderDate: '2024-12-10',
  },
  {
    id: '2',
    name: 'Office Supplies Pro',
    cui: 'RO23456789',
    category: 'office',
    status: 'active',
    contactName: 'Maria Popa',
    email: 'comenzi@officesupplies.ro',
    phone: '+40 21 234 5678',
    address: 'București, Sector 3',
    rating: 4.5,
    totalSpend: 78000,
    invoiceCount: 120,
    paymentTerms: 15,
    onTimePaymentRate: 100,
    lastOrderDate: '2024-12-12',
  },
  {
    id: '3',
    name: 'Transport Express SRL',
    cui: 'RO34567890',
    category: 'logistics',
    status: 'active',
    contactName: 'Ion Marin',
    email: 'dispatch@transportexpress.ro',
    phone: '+40 21 345 6789',
    address: 'Ilfov, Voluntari',
    rating: 4.2,
    totalSpend: 156000,
    invoiceCount: 89,
    paymentTerms: 30,
    onTimePaymentRate: 88,
    lastOrderDate: '2024-12-11',
  },
  {
    id: '4',
    name: 'Consulting Partners',
    cui: 'RO45678901',
    category: 'services',
    status: 'active',
    contactName: 'Elena Stancu',
    email: 'office@consulting.ro',
    phone: '+40 21 456 7890',
    address: 'București, Sector 2',
    rating: 4.9,
    totalSpend: 320000,
    invoiceCount: 24,
    paymentTerms: 45,
    onTimePaymentRate: 100,
    lastOrderDate: '2024-12-05',
  },
  {
    id: '5',
    name: 'Raw Materials Co',
    cui: 'RO56789012',
    category: 'materials',
    status: 'pending',
    contactName: 'Andrei Dumitrescu',
    email: 'sales@rawmaterials.ro',
    phone: '+40 21 567 8901',
    address: 'Ploiești',
    rating: 0,
    totalSpend: 0,
    invoiceCount: 0,
    paymentTerms: 30,
    onTimePaymentRate: 0,
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const statusColors: Record<VendorStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  blocked: 'bg-red-100 text-red-800',
};

const statusLabels: Record<VendorStatus, string> = {
  active: 'Activ',
  inactive: 'Inactiv',
  pending: 'În Aprobare',
  blocked: 'Blocat',
};

const categoryLabels: Record<VendorCategory, string> = {
  it: 'IT & Software',
  office: 'Birou & Papetărie',
  services: 'Servicii',
  logistics: 'Logistică',
  materials: 'Materiale',
  other: 'Altele',
};

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const stats = {
    total: sampleVendors.length,
    active: sampleVendors.filter(v => v.status === 'active').length,
    pending: sampleVendors.filter(v => v.status === 'pending').length,
    totalSpend: sampleVendors.reduce((sum, v) => sum + v.totalSpend, 0),
    avgRating: sampleVendors.filter(v => v.rating > 0).reduce((sum, v) => sum + v.rating, 0) / sampleVendors.filter(v => v.rating > 0).length,
    topSpender: sampleVendors.reduce((max, v) => v.totalSpend > max.totalSpend ? v : max, sampleVendors[0]),
  };

  const categoryData = Object.entries(categoryLabels).map(([key, label]) => ({
    name: label,
    value: sampleVendors
      .filter(v => v.category === key)
      .reduce((sum, v) => sum + v.totalSpend, 0),
  })).filter(d => d.value > 0);

  const monthlySpend = [
    { month: 'Aug', spend: 125000 },
    { month: 'Sep', spend: 145000 },
    { month: 'Oct', spend: 168000 },
    { month: 'Nov', spend: 155000 },
    { month: 'Dec', spend: 89000 },
  ];

  const filteredVendors = sampleVendors.filter(vendor => {
    const matchesSearch = searchQuery === '' ||
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.cui.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || vendor.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestiune Furnizori</h1>
          <p className="text-muted-foreground">Administrare furnizori, evaluare și plăți</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Furnizor Nou
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="vendors">
            <Building2 className="mr-2 h-4 w-4" />
            Furnizori
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Award className="mr-2 h-4 w-4" />
            Performanță
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Furnizori</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active} activi, {stats.pending} în aprobare
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cheltuieli Totale</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalSpend)}</div>
                <p className="text-xs text-green-600">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +8% vs luna trecută
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rating Mediu</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}/5</div>
                <p className="text-xs text-muted-foreground">din {stats.active} furnizori evaluați</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Furnizor</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">{stats.topSpender.name}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.topSpender.totalSpend)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cheltuieli pe Categorii</CardTitle>
                <CardDescription>Distribuție achiziții</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evoluție Cheltuieli</CardTitle>
                <CardDescription>Ultimele 5 luni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySpend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare furnizor sau CUI..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
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
                {filteredVendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vendor.name}</span>
                          <Badge variant="outline">{vendor.cui}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{categoryLabels[vendor.category]}</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {vendor.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {vendor.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{vendor.rating}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(vendor.totalSpend)}</p>
                        <p className="text-xs text-muted-foreground">{vendor.invoiceCount} facturi</p>
                      </div>
                      <Badge className={statusColors[vendor.status]}>
                        {statusLabels[vendor.status]}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluare Performanță Furnizori</CardTitle>
              <CardDescription>Metrici de performanță pentru furnizori activi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sampleVendors.filter(v => v.status === 'active').map((vendor) => (
                  <div key={vendor.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-lg">{vendor.rating}</span>
                        </div>
                        <div>
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-sm text-muted-foreground">{categoryLabels[vendor.category]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(vendor.totalSpend)}</p>
                        <p className="text-xs text-muted-foreground">cheltuieli totale</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Plăți la Termen</span>
                          <span className="font-medium">{vendor.onTimePaymentRate}%</span>
                        </div>
                        <Progress value={vendor.onTimePaymentRate} className="h-2" />
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{vendor.invoiceCount}</p>
                        <p className="text-xs text-muted-foreground">facturi procesate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{vendor.paymentTerms}</p>
                        <p className="text-xs text-muted-foreground">zile termen plată</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
