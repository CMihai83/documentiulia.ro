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
  Package,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  QrCode,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Wrench,
  Building,
  Car,
  Monitor,
  Sofa,
  FileText,
  BarChart3,
  ArrowRightLeft,
  ClipboardList,
  Shield,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckSquare,
  XSquare,
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
  Legend,
} from 'recharts';

type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'disposed' | 'lost' | 'pending_disposal';
type AssetCategory = 'equipment' | 'vehicle' | 'it_hardware' | 'furniture' | 'building' | 'land' | 'software' | 'intangible' | 'other';
type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'broken';

interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  category: AssetCategory;
  manufacturer?: string;
  model?: string;
  status: AssetStatus;
  condition: AssetCondition;
  locationName?: string;
  departmentName?: string;
  assignedToUserName?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  warrantyExpiry?: string;
}

interface AssetCheckout {
  id: string;
  assetName: string;
  assetTag: string;
  checkedOutTo: 'user' | 'location' | 'department';
  targetName: string;
  checkedOutAt: string;
  expectedReturn?: string;
  status: 'checked_out' | 'returned' | 'overdue';
}

interface AssetTransfer {
  id: string;
  assetName: string;
  fromName: string;
  toName: string;
  reason?: string;
  transferredAt: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
}

interface AssetRequest {
  id: string;
  requestType: 'new_asset' | 'repair' | 'replacement' | 'disposal' | 'transfer';
  requesterName: string;
  assetName?: string;
  description: string;
  estimatedCost?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
}

// Sample data
const sampleAssets: Asset[] = [
  {
    id: '1',
    name: 'Dell Latitude 5520 Laptop',
    assetTag: 'AT-DOC-001',
    serialNumber: 'DL5520-2024-001',
    category: 'it_hardware',
    manufacturer: 'Dell',
    model: 'Latitude 5520',
    status: 'active',
    condition: 'good',
    locationName: 'Sediu Central',
    departmentName: 'IT',
    assignedToUserName: 'Ion Popescu',
    purchaseDate: '2024-01-15',
    purchasePrice: 4500,
    currentValue: 3600,
    warrantyExpiry: '2027-01-15',
  },
  {
    id: '2',
    name: 'HP LaserJet Pro Printer',
    assetTag: 'AT-DOC-002',
    serialNumber: 'HP-LJP-2024-001',
    category: 'it_hardware',
    manufacturer: 'HP',
    model: 'LaserJet Pro M404dn',
    status: 'active',
    condition: 'excellent',
    locationName: 'Etaj 2',
    departmentName: 'Administrativ',
    purchaseDate: '2024-03-10',
    purchasePrice: 2200,
    currentValue: 1980,
    warrantyExpiry: '2026-03-10',
  },
  {
    id: '3',
    name: 'Volkswagen Transporter',
    assetTag: 'AT-DOC-003',
    serialNumber: 'WVGZZZ7HZ8H000001',
    category: 'vehicle',
    manufacturer: 'Volkswagen',
    model: 'Transporter T6.1',
    status: 'active',
    condition: 'good',
    locationName: 'Parcare',
    departmentName: 'Logistică',
    assignedToUserName: 'Marius Ionescu',
    purchaseDate: '2023-06-20',
    purchasePrice: 125000,
    currentValue: 95000,
    warrantyExpiry: '2026-06-20',
  },
  {
    id: '4',
    name: 'Birou Executive BEKANT',
    assetTag: 'AT-DOC-004',
    category: 'furniture',
    manufacturer: 'IKEA',
    model: 'BEKANT 160x80',
    status: 'active',
    condition: 'excellent',
    locationName: 'Biroul Directorului',
    departmentName: 'Management',
    purchaseDate: '2024-02-01',
    purchasePrice: 1200,
    currentValue: 1080,
  },
  {
    id: '5',
    name: 'Server Rack - Data Center',
    assetTag: 'AT-DOC-005',
    serialNumber: 'APC-NS42-001',
    category: 'equipment',
    manufacturer: 'APC',
    model: 'NetShelter SX 42U',
    status: 'active',
    condition: 'good',
    locationName: 'Sala Servere',
    departmentName: 'IT',
    purchaseDate: '2023-01-15',
    purchasePrice: 8500,
    currentValue: 6800,
    warrantyExpiry: '2028-01-15',
  },
  {
    id: '6',
    name: 'Microsoft Office 365 Business',
    assetTag: 'AT-DOC-006',
    category: 'software',
    manufacturer: 'Microsoft',
    model: 'Office 365 Business Premium',
    status: 'active',
    condition: 'excellent',
    departmentName: 'General',
    purchaseDate: '2024-01-01',
    purchasePrice: 6000,
    currentValue: 4500,
  },
  {
    id: '7',
    name: 'MacBook Pro 14"',
    assetTag: 'AT-DOC-007',
    serialNumber: 'FVFDJ123456',
    category: 'it_hardware',
    manufacturer: 'Apple',
    model: 'MacBook Pro 14" M3',
    status: 'maintenance',
    condition: 'fair',
    locationName: 'Service Apple',
    departmentName: 'Design',
    assignedToUserName: 'Ana Marin',
    purchaseDate: '2024-05-01',
    purchasePrice: 12000,
    currentValue: 10800,
    warrantyExpiry: '2026-05-01',
  },
  {
    id: '8',
    name: 'Scanner Canon DR-C225',
    assetTag: 'AT-DOC-008',
    category: 'it_hardware',
    manufacturer: 'Canon',
    model: 'DR-C225',
    status: 'disposed',
    condition: 'broken',
    departmentName: 'Contabilitate',
    purchaseDate: '2020-03-15',
    purchasePrice: 1500,
    currentValue: 0,
  },
];

const sampleCheckouts: AssetCheckout[] = [
  {
    id: '1',
    assetName: 'Dell Latitude 5520 Laptop',
    assetTag: 'AT-DOC-001',
    checkedOutTo: 'user',
    targetName: 'Ion Popescu',
    checkedOutAt: '2024-11-01',
    expectedReturn: '2025-11-01',
    status: 'checked_out',
  },
  {
    id: '2',
    assetName: 'Proiector Epson',
    assetTag: 'AT-DOC-015',
    checkedOutTo: 'department',
    targetName: 'Marketing',
    checkedOutAt: '2024-12-01',
    expectedReturn: '2024-12-10',
    status: 'overdue',
  },
  {
    id: '3',
    assetName: 'Camera Sony Alpha',
    assetTag: 'AT-DOC-020',
    checkedOutTo: 'user',
    targetName: 'Maria Dumitrescu',
    checkedOutAt: '2024-12-10',
    expectedReturn: '2024-12-15',
    status: 'checked_out',
  },
];

const sampleTransfers: AssetTransfer[] = [
  {
    id: '1',
    assetName: 'Imprimantă HP Color',
    fromName: 'Etaj 1 - Contabilitate',
    toName: 'Etaj 3 - Marketing',
    reason: 'Reorganizare departamente',
    transferredAt: '2024-12-12',
    status: 'pending',
  },
  {
    id: '2',
    assetName: 'Birou Standing Desk',
    fromName: 'Depozit',
    toName: 'Biroul 305 - Ion Popescu',
    reason: 'Echipare birou nou angajat',
    transferredAt: '2024-12-10',
    status: 'approved',
  },
  {
    id: '3',
    assetName: 'Monitor Dell 27"',
    fromName: 'IT Department',
    toName: 'Design Department',
    transferredAt: '2024-12-05',
    status: 'completed',
  },
];

const sampleRequests: AssetRequest[] = [
  {
    id: '1',
    requestType: 'new_asset',
    requesterName: 'Elena Stancu',
    description: 'Laptop pentru angajat nou în departamentul HR',
    estimatedCost: 4500,
    priority: 'high',
    status: 'pending',
    createdAt: '2024-12-13',
  },
  {
    id: '2',
    requestType: 'repair',
    requesterName: 'Ana Marin',
    assetName: 'MacBook Pro 14"',
    description: 'Ecran defect - necesită înlocuire',
    estimatedCost: 2500,
    priority: 'urgent',
    status: 'approved',
    createdAt: '2024-12-10',
  },
  {
    id: '3',
    requestType: 'disposal',
    requesterName: 'Andrei Popa',
    assetName: 'Scanner Canon DR-C225',
    description: 'Echipament vechi, nu mai funcționează',
    priority: 'low',
    status: 'completed',
    createdAt: '2024-12-01',
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6b7280'];

const statusColors: Record<AssetStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  disposed: 'bg-red-100 text-red-800',
  lost: 'bg-purple-100 text-purple-800',
  pending_disposal: 'bg-orange-100 text-orange-800',
};

const statusLabels: Record<AssetStatus, string> = {
  active: 'Activ',
  inactive: 'Inactiv',
  maintenance: 'Mentenanță',
  disposed: 'Casat',
  lost: 'Pierdut',
  pending_disposal: 'În curs de casare',
};

const conditionColors: Record<AssetCondition, string> = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800',
  poor: 'bg-orange-100 text-orange-800',
  broken: 'bg-red-100 text-red-800',
};

const conditionLabels: Record<AssetCondition, string> = {
  excellent: 'Excelentă',
  good: 'Bună',
  fair: 'Acceptabilă',
  poor: 'Slabă',
  broken: 'Defectă',
};

const categoryLabels: Record<AssetCategory, string> = {
  equipment: 'Echipamente',
  vehicle: 'Vehicule',
  it_hardware: 'Hardware IT',
  furniture: 'Mobilier',
  building: 'Clădiri',
  land: 'Terenuri',
  software: 'Software',
  intangible: 'Intangibile',
  other: 'Altele',
};

const categoryIcons: Record<AssetCategory, React.ReactNode> = {
  equipment: <Package className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  it_hardware: <Monitor className="h-4 w-4" />,
  furniture: <Sofa className="h-4 w-4" />,
  building: <Building className="h-4 w-4" />,
  land: <MapPin className="h-4 w-4" />,
  software: <FileText className="h-4 w-4" />,
  intangible: <FileText className="h-4 w-4" />,
  other: <Package className="h-4 w-4" />,
};

const requestTypeLabels: Record<string, string> = {
  new_asset: 'Activ Nou',
  repair: 'Reparație',
  replacement: 'Înlocuire',
  disposal: 'Casare',
  transfer: 'Transfer',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<string, string> = {
  low: 'Scăzută',
  medium: 'Medie',
  high: 'Ridicată',
  urgent: 'Urgentă',
};

export default function AssetManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Calculate statistics
  const stats = {
    total: sampleAssets.length,
    active: sampleAssets.filter(a => a.status === 'active').length,
    maintenance: sampleAssets.filter(a => a.status === 'maintenance').length,
    disposed: sampleAssets.filter(a => a.status === 'disposed').length,
    totalValue: sampleAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0),
    totalPurchaseValue: sampleAssets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0),
    overdueCheckouts: sampleCheckouts.filter(c => c.status === 'overdue').length,
    pendingTransfers: sampleTransfers.filter(t => t.status === 'pending').length,
    pendingRequests: sampleRequests.filter(r => r.status === 'pending').length,
  };

  const depreciation = stats.totalPurchaseValue - stats.totalValue;
  const depreciationPercent = stats.totalPurchaseValue > 0
    ? ((depreciation / stats.totalPurchaseValue) * 100).toFixed(1)
    : 0;

  // Category distribution data for charts
  const categoryData = Object.entries(categoryLabels).map(([key, label]) => ({
    name: label,
    value: sampleAssets.filter(a => a.category === key).length,
  })).filter(d => d.value > 0);

  const categoryValueData = Object.entries(categoryLabels).map(([key, label]) => ({
    name: label,
    value: sampleAssets
      .filter(a => a.category === key)
      .reduce((sum, a) => sum + (a.currentValue || 0), 0),
  })).filter(d => d.value > 0);

  const conditionData = Object.entries(conditionLabels).map(([key, label]) => ({
    name: label,
    value: sampleAssets.filter(a => a.condition === key).length,
  })).filter(d => d.value > 0);

  // Filter assets
  const filteredAssets = sampleAssets.filter(asset => {
    const matchesSearch = searchQuery === '' ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Gestiune Active</h1>
          <p className="text-muted-foreground">
            Administrare completă a activelor fixe și inventarului companiei
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            Scanare QR
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Activ Nou
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prezentare
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Package className="mr-2 h-4 w-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="checkouts">
            <ClipboardList className="mr-2 h-4 w-4" />
            Împrumuturi
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transferuri
          </TabsTrigger>
          <TabsTrigger value="requests">
            <FileText className="mr-2 h-4 w-4" />
            Cereri
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Active</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active} active, {stats.maintenance} în mentenanță
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valoare Totală</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Amortizare: {formatCurrency(depreciation)} ({depreciationPercent}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Împrumuturi Active</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleCheckouts.filter(c => c.status !== 'returned').length}</div>
                {stats.overdueCheckouts > 0 ? (
                  <p className="text-xs text-red-600">
                    <AlertTriangle className="inline h-3 w-3 mr-1" />
                    {stats.overdueCheckouts} întârziate
                  </p>
                ) : (
                  <p className="text-xs text-green-600">
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    Toate la termen
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cereri în Așteptare</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingRequests + stats.pendingTransfers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingRequests} cereri, {stats.pendingTransfers} transferuri
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuție pe Categorii</CardTitle>
                <CardDescription>Număr de active per categorie</CardDescription>
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
                      <Tooltip formatter={(value: number) => [`${value} active`, 'Cantitate']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valoare pe Categorii</CardTitle>
                <CardDescription>Valoare curentă per categorie (RON)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryValueData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valoare']} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Condition and Alerts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stare Active</CardTitle>
                <CardDescription>Distribuție după condiție</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conditionData.map((item, index) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value} active</span>
                      </div>
                      <Progress
                        value={(item.value / stats.total) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alerte și Notificări</CardTitle>
                <CardDescription>Necesită atenție imediată</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.overdueCheckouts > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Împrumuturi Întârziate</p>
                        <p className="text-sm text-red-600">{stats.overdueCheckouts} active nu au fost returnate la termen</p>
                      </div>
                    </div>
                  )}
                  {stats.maintenance > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Wrench className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">În Mentenanță</p>
                        <p className="text-sm text-yellow-600">{stats.maintenance} active sunt în service</p>
                      </div>
                    </div>
                  )}
                  {stats.pendingRequests > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-800">Cereri în Așteptare</p>
                        <p className="text-sm text-blue-600">{stats.pendingRequests} cereri necesită aprobare</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Garanții Active</p>
                      <p className="text-sm text-green-600">5 active cu garanție valabilă</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Căutare după nume, tag, serie..."
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
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate statusurile</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Mai multe filtre
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assets List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista Active ({filteredAssets.length})</CardTitle>
              <CardDescription>Toate activele înregistrate în sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {categoryIcons[asset.category]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{asset.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {asset.assetTag}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{categoryLabels[asset.category]}</span>
                          {asset.manufacturer && <span>{asset.manufacturer} {asset.model}</span>}
                          {asset.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {asset.locationName}
                            </span>
                          )}
                          {asset.assignedToUserName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {asset.assignedToUserName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">
                          {asset.currentValue ? formatCurrency(asset.currentValue) : '-'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusColors[asset.status]}>
                            {statusLabels[asset.status]}
                          </Badge>
                          <Badge className={conditionColors[asset.condition]}>
                            {conditionLabels[asset.condition]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checkouts Tab */}
        <TabsContent value="checkouts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Împrumuturi Active</CardTitle>
                  <CardDescription>Active împrumutate către angajați sau departamente</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Împrumut Nou
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleCheckouts.map((checkout) => (
                  <div
                    key={checkout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        checkout.status === 'overdue' ? 'bg-red-100' :
                        checkout.status === 'checked_out' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {checkout.status === 'overdue' ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : checkout.status === 'checked_out' ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{checkout.assetName}</span>
                          <Badge variant="outline">{checkout.assetTag}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {checkout.targetName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(checkout.checkedOutAt)}
                          </span>
                          {checkout.expectedReturn && (
                            <span className={checkout.status === 'overdue' ? 'text-red-600' : ''}>
                              Retur: {formatDate(checkout.expectedReturn)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={
                        checkout.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        checkout.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {checkout.status === 'overdue' ? 'Întârziat' :
                         checkout.status === 'checked_out' ? 'Împrumutat' : 'Returnat'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Returnare
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transferuri</CardTitle>
                  <CardDescription>Mișcări de active între locații și departamente</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Transfer Nou
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        transfer.status === 'pending' ? 'bg-yellow-100' :
                        transfer.status === 'approved' ? 'bg-blue-100' :
                        transfer.status === 'completed' ? 'bg-green-100' :
                        'bg-red-100'
                      }`}>
                        <ArrowRightLeft className={`h-4 w-4 ${
                          transfer.status === 'pending' ? 'text-yellow-600' :
                          transfer.status === 'approved' ? 'text-blue-600' :
                          transfer.status === 'completed' ? 'text-green-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium">{transfer.assetName}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{transfer.fromName}</span>
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>{transfer.toName}</span>
                        </div>
                        {transfer.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transfer.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={
                          transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          transfer.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {transfer.status === 'pending' ? 'În Așteptare' :
                           transfer.status === 'approved' ? 'Aprobat' :
                           transfer.status === 'completed' ? 'Finalizat' : 'Respins'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(transfer.transferredAt)}
                        </p>
                      </div>
                      {transfer.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 text-green-600">
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-600">
                            <XSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cereri Active</CardTitle>
                  <CardDescription>Cereri pentru achiziții, reparații, casări</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Cerere Nouă
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {request.requestType === 'new_asset' ? <Plus className="h-4 w-4" /> :
                         request.requestType === 'repair' ? <Wrench className="h-4 w-4" /> :
                         request.requestType === 'disposal' ? <Trash2 className="h-4 w-4" /> :
                         <ArrowRightLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{requestTypeLabels[request.requestType]}</Badge>
                          {request.assetName && (
                            <span className="font-medium">{request.assetName}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.requesterName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(request.createdAt)}
                          </span>
                          {request.estimatedCost && (
                            <span>Cost estimat: {formatCurrency(request.estimatedCost)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={priorityColors[request.priority]}>
                            {priorityLabels[request.priority]}
                          </Badge>
                          <Badge className={
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {request.status === 'pending' ? 'În Așteptare' :
                             request.status === 'approved' ? 'Aprobat' :
                             request.status === 'completed' ? 'Finalizat' :
                             request.status === 'rejected' ? 'Respins' : 'Anulat'}
                          </Badge>
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 text-green-600">
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-600">
                            <XSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
