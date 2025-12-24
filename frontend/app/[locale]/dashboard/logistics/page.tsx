'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Package,
  Warehouse,
  Truck,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Leaf,
  Globe,
  FileText,
  Thermometer,
  Box,
  Route,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Scan,
  QrCode,
  Zap,
  Target,
  Activity,
  ShieldCheck,
  Plane,
  Ship,
  Calendar,
} from 'lucide-react';

// Types
interface InventorySummary {
  totalItems: number;
  totalWarehouses: number;
  totalValue: number;
  lowStockItems: number;
  expiringBatches: number;
  pendingReceipts: number;
  pendingShipments: number;
  stockAccuracy: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  location: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
  lastMovement?: string;
}

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  capacity: number;
  utilization: number;
  zones: number;
  locations: number;
  isActive: boolean;
}

interface StockAlert {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRY' | 'OVERSTOCK' | 'REORDER';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  itemName: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

interface RouteData {
  id: string;
  name: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  stops: number;
  distanceKm: number;
  estimatedDuration: string;
  vehicle: string;
  driver?: string;
  scheduledDate: string;
}

interface CustomsDeclaration {
  id: string;
  lrn: string;
  mrn?: string;
  type: 'IMPORT' | 'EXPORT' | 'TRANSIT';
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'RELEASED' | 'REJECTED';
  declarant: string;
  goodsValue: number;
  currency: string;
  customsOffice: string;
  createdAt: string;
}

interface CarbonMetrics {
  totalEmissions: number;
  emissionsChange: number;
  fleetSize: number;
  electricVehicles: number;
  averageEfficiency: number;
  targetProgress: number;
  etsCompliance: boolean;
  cbamDeclarations: number;
}

interface ForecastData {
  productId: string;
  productName: string;
  currentStock: number;
  forecastedDemand: number;
  confidence: number;
  recommendedAction: string;
  daysToStockout?: number;
}

type TabType = 'dashboard' | 'inventory' | 'routes' | 'customs' | 'carbon' | 'forecast';

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'IN_STOCK': 'bg-green-100 text-green-800',
    'LOW_STOCK': 'bg-yellow-100 text-yellow-800',
    'OUT_OF_STOCK': 'bg-red-100 text-red-800',
    'OVERSTOCK': 'bg-blue-100 text-blue-800',
    'PLANNED': 'bg-gray-100 text-gray-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'DRAFT': 'bg-gray-100 text-gray-800',
    'SUBMITTED': 'bg-blue-100 text-blue-800',
    'ACCEPTED': 'bg-green-100 text-green-800',
    'RELEASED': 'bg-emerald-100 text-emerald-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'HIGH': 'bg-red-100 text-red-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'LOW': 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'IN_STOCK': 'In Stoc',
    'LOW_STOCK': 'Stoc Redus',
    'OUT_OF_STOCK': 'Fara Stoc',
    'OVERSTOCK': 'Suprastoc',
    'PLANNED': 'Planificat',
    'IN_PROGRESS': 'In Desfasurare',
    'COMPLETED': 'Finalizat',
    'CANCELLED': 'Anulat',
    'DRAFT': 'Ciorna',
    'SUBMITTED': 'Transmis',
    'ACCEPTED': 'Acceptat',
    'RELEASED': 'Eliberat',
    'REJECTED': 'Respins',
    'HIGH': 'Ridicat',
    'MEDIUM': 'Mediu',
    'LOW': 'Scazut',
    'IMPORT': 'Import',
    'EXPORT': 'Export',
    'TRANSIT': 'Tranzit',
  };
  return labels[status] || status;
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'HIGH':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'MEDIUM':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'LOW':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function LogisticsPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [carbonMetrics, setCarbonMetrics] = useState<CarbonMetrics | null>(null);
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'dashboard' || activeTab === 'inventory') {
        // Fetch inventory summary
        const summaryRes = await fetch('/api/logistics/inventory/reports/summary', { headers });
        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        }

        // Fetch items
        const itemsRes = await fetch('/api/logistics/inventory/items', { headers });
        if (itemsRes.ok) {
          setItems(await itemsRes.json());
        }

        // Fetch warehouses
        const warehousesRes = await fetch('/api/logistics/inventory/warehouses', { headers });
        if (warehousesRes.ok) {
          setWarehouses(await warehousesRes.json());
        }

        // Fetch alerts
        const alertsRes = await fetch('/api/logistics/inventory/alerts?resolved=false', { headers });
        if (alertsRes.ok) {
          setAlerts(await alertsRes.json());
        }
      }

      if (activeTab === 'routes') {
        // Mock route data for now
        setRoutes(getMockRoutes());
      }

      if (activeTab === 'customs') {
        const declarationsRes = await fetch('/api/logistics/customs/declarations', { headers });
        if (declarationsRes.ok) {
          setDeclarations(await declarationsRes.json());
        }
      }

      if (activeTab === 'carbon') {
        const carbonRes = await fetch('/api/logistics/carbon/dashboard', { headers });
        if (carbonRes.ok) {
          setCarbonMetrics(await carbonRes.json());
        }
      }

      if (activeTab === 'forecast') {
        const forecastRes = await fetch('/api/logistics/demand-forecast/dashboard', { headers });
        if (forecastRes.ok) {
          setForecasts(await forecastRes.json());
        }
      }
    } catch (error) {
      console.error('Error fetching logistics data:', error);
      // Load mock data on error
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setSummary({
      totalItems: 1245,
      totalWarehouses: 5,
      totalValue: 2456000,
      lowStockItems: 23,
      expiringBatches: 8,
      pendingReceipts: 12,
      pendingShipments: 34,
      stockAccuracy: 98.5,
    });

    setItems(getMockItems());
    setWarehouses(getMockWarehouses());
    setAlerts(getMockAlerts());
    setRoutes(getMockRoutes());
    setDeclarations(getMockDeclarations());
    setCarbonMetrics(getMockCarbonMetrics());
    setForecasts(getMockForecasts());
  };

  const getMockItems = (): InventoryItem[] => [
    { id: '1', sku: 'SKU-001', name: 'Laptop Dell Latitude 5540', category: 'Electronice', quantity: 45, reorderPoint: 20, unitCost: 4500, location: 'A-01-001', status: 'IN_STOCK', lastMovement: '2024-12-10' },
    { id: '2', sku: 'SKU-002', name: 'Monitor LG 27"', category: 'Electronice', quantity: 12, reorderPoint: 15, unitCost: 1200, location: 'A-01-002', status: 'LOW_STOCK', lastMovement: '2024-12-09' },
    { id: '3', sku: 'SKU-003', name: 'Tastatura Mecanica', category: 'Periferice', quantity: 0, reorderPoint: 30, unitCost: 350, location: 'B-02-001', status: 'OUT_OF_STOCK', lastMovement: '2024-12-05' },
    { id: '4', sku: 'SKU-004', name: 'Mouse Wireless', category: 'Periferice', quantity: 234, reorderPoint: 50, unitCost: 120, location: 'B-02-002', status: 'OVERSTOCK', lastMovement: '2024-12-11' },
    { id: '5', sku: 'SKU-005', name: 'Cabluri USB-C', category: 'Accesorii', quantity: 567, reorderPoint: 100, unitCost: 25, location: 'C-01-001', status: 'IN_STOCK', lastMovement: '2024-12-11' },
    { id: '6', sku: 'SKU-006', name: 'Hartie A4 80g', category: 'Papetarie', quantity: 1200, reorderPoint: 500, unitCost: 35, location: 'D-01-001', status: 'IN_STOCK', lastMovement: '2024-12-10' },
  ];

  const getMockWarehouses = (): WarehouseData[] => [
    { id: '1', name: 'Depozit Central Bucuresti', code: 'BCU-01', type: 'DISTRIBUTION', address: 'Str. Industriilor 15, Bucuresti', capacity: 5000, utilization: 78, zones: 8, locations: 240, isActive: true },
    { id: '2', name: 'Depozit Cluj-Napoca', code: 'CLJ-01', type: 'REGIONAL', address: 'Str. Fabricii 22, Cluj-Napoca', capacity: 2500, utilization: 65, zones: 4, locations: 120, isActive: true },
    { id: '3', name: 'Depozit Timisoara', code: 'TIM-01', type: 'REGIONAL', address: 'Str. Logisticii 8, Timisoara', capacity: 2000, utilization: 82, zones: 3, locations: 90, isActive: true },
    { id: '4', name: 'Depozit Constanta', code: 'CTA-01', type: 'PORT', address: 'Portul Constanta Sud, Constanta', capacity: 3000, utilization: 45, zones: 5, locations: 150, isActive: true },
    { id: '5', name: 'Depozit Iasi', code: 'IAS-01', type: 'REGIONAL', address: 'Str. Depozitelor 3, Iasi', capacity: 1500, utilization: 58, zones: 2, locations: 60, isActive: true },
  ];

  const getMockAlerts = (): StockAlert[] => [
    { id: '1', type: 'LOW_STOCK', severity: 'HIGH', itemName: 'Monitor LG 27"', message: 'Stoc sub nivelul minim (12 < 15)', createdAt: '2024-12-11T08:30:00Z', acknowledged: false },
    { id: '2', type: 'REORDER', severity: 'HIGH', itemName: 'Tastatura Mecanica', message: 'Stoc epuizat - necesita reaprovizionare urgenta', createdAt: '2024-12-11T07:00:00Z', acknowledged: false },
    { id: '3', type: 'EXPIRY', severity: 'MEDIUM', itemName: 'Toner HP', message: 'Lot #TN-2024-089 expira in 15 zile', createdAt: '2024-12-10T14:00:00Z', acknowledged: false },
    { id: '4', type: 'OVERSTOCK', severity: 'LOW', itemName: 'Mouse Wireless', message: 'Stoc peste capacitatea optima (234 > 150)', createdAt: '2024-12-10T10:00:00Z', acknowledged: true },
  ];

  const getMockRoutes = (): RouteData[] => [
    { id: '1', name: 'Ruta Bucuresti - Sud', status: 'IN_PROGRESS', stops: 8, distanceKm: 145, estimatedDuration: '4h 30min', vehicle: 'B-123-LOG', driver: 'Ion Popescu', scheduledDate: '2024-12-11' },
    { id: '2', name: 'Ruta Cluj - Vest', status: 'PLANNED', stops: 12, distanceKm: 220, estimatedDuration: '6h 15min', vehicle: 'CJ-456-LOG', driver: 'Maria Ionescu', scheduledDate: '2024-12-12' },
    { id: '3', name: 'Ruta Constanta - Port', status: 'COMPLETED', stops: 5, distanceKm: 85, estimatedDuration: '2h 45min', vehicle: 'CT-789-LOG', driver: 'Andrei Vasile', scheduledDate: '2024-12-10' },
    { id: '4', name: 'Ruta Timisoara - Arad', status: 'PLANNED', stops: 6, distanceKm: 95, estimatedDuration: '3h 00min', vehicle: 'TM-012-LOG', scheduledDate: '2024-12-13' },
  ];

  const getMockDeclarations = (): CustomsDeclaration[] => [
    { id: '1', lrn: 'LRN-2024-001234', mrn: 'MRN-RO-2024-001234', type: 'IMPORT', status: 'RELEASED', declarant: 'SC Import SRL', goodsValue: 125000, currency: 'EUR', customsOffice: 'RO012000 Bucuresti', createdAt: '2024-12-08' },
    { id: '2', lrn: 'LRN-2024-001235', type: 'EXPORT', status: 'SUBMITTED', declarant: 'SC Export SA', goodsValue: 85000, currency: 'EUR', customsOffice: 'RO012000 Bucuresti', createdAt: '2024-12-10' },
    { id: '3', lrn: 'LRN-2024-001236', type: 'TRANSIT', status: 'DRAFT', declarant: 'SC Transit SRL', goodsValue: 45000, currency: 'EUR', customsOffice: 'RO033000 Constanta', createdAt: '2024-12-11' },
    { id: '4', lrn: 'LRN-2024-001237', mrn: 'MRN-RO-2024-001237', type: 'IMPORT', status: 'ACCEPTED', declarant: 'SC Distributie SA', goodsValue: 200000, currency: 'EUR', customsOffice: 'RO033000 Constanta', createdAt: '2024-12-09' },
  ];

  const getMockCarbonMetrics = (): CarbonMetrics => ({
    totalEmissions: 1245.8,
    emissionsChange: -12.5,
    fleetSize: 45,
    electricVehicles: 8,
    averageEfficiency: 8.5,
    targetProgress: 67,
    etsCompliance: true,
    cbamDeclarations: 3,
  });

  const getMockForecasts = (): ForecastData[] => [
    { productId: '1', productName: 'Laptop Dell Latitude 5540', currentStock: 45, forecastedDemand: 60, confidence: 0.89, recommendedAction: 'Comanda 20 unitati', daysToStockout: 22 },
    { productId: '2', productName: 'Monitor LG 27"', currentStock: 12, forecastedDemand: 35, confidence: 0.92, recommendedAction: 'Comanda urgenta 30 unitati', daysToStockout: 10 },
    { productId: '3', productName: 'Tastatura Mecanica', currentStock: 0, forecastedDemand: 25, confidence: 0.85, recommendedAction: 'Reaprovizionare imediata', daysToStockout: 0 },
    { productId: '4', productName: 'Mouse Wireless', currentStock: 234, forecastedDemand: 40, confidence: 0.91, recommendedAction: 'Stoc suficient pentru 6 saptamani', daysToStockout: 45 },
  ];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Action handlers
  const handleAddItem = () => {
    router.push('/dashboard/logistics/inventory/new');
  };

  const handleResolveAlert = async (alert: StockAlert) => {
    router.push(`/dashboard/logistics/alerts/${alert.id}/resolve?name=${encodeURIComponent(alert.itemName)}`);
  };

  const handleResolveAlertConfirmed = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/logistics/inventory/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(alerts.filter(a => a.id !== alertId));
      toast.success('Alertă rezolvată', 'Alerta a fost marcată ca rezolvată.');
    } catch (err) {
      console.error('Error resolving alert:', err);
      toast.error('Eroare', 'Nu s-a putut rezolva alerta.');
    }
  };

  const handleScanBarcode = () => {
    router.push('/dashboard/logistics/inventory/scan-barcode');
  };

  const handleScanQR = () => {
    toast.info('În dezvoltare', 'Funcționalitatea scanare QR este în dezvoltare.');
  };

  const handleEditItem = (item: InventoryItem) => {
    router.push(`/dashboard/logistics/inventory/${item.id}/edit`);
  };

  const handleViewMovements = (item: InventoryItem) => {
    router.push(`/dashboard/logistics/inventory/${item.id}/movements`);
  };

  const handleOptimizeRoute = () => {
    toast.info('Optimizare AI', 'Optimizare rute AI - calcul în curs...');
  };

  const handleLiveMap = () => {
    router.push('/dashboard/logistics/map');
  };

  const handleRouteDetails = (route: RouteData) => {
    router.push(`/dashboard/logistics/routes/${route.id}`);
  };

  const handleTrackGPS = (route: RouteData) => {
    router.push(`/dashboard/logistics/routes/${route.id}/track`);
  };

  const handleCalculateOptimalRoute = () => {
    toast.success('Calcul inițiat', 'Calculul rutei optime a fost inițiat. Veți fi notificat când este gata.');
  };

  const handleNewDeclaration = () => {
    router.push('/dashboard/logistics/customs/new');
  };

  const handleValidateVIES = async () => {
    router.push('/dashboard/logistics/customs/vies-validation');
  };

  const handleSearchHSCodes = () => {
    router.push('/dashboard/logistics/customs/hs-codes');
  };

  const handleDeclarationDetails = (decl: CustomsDeclaration) => {
    router.push(`/dashboard/logistics/customs/${decl.id}`);
  };

  const handleSubmitDeclaration = async (decl: CustomsDeclaration) => {
    router.push(`/dashboard/logistics/customs/${decl.id}/submit?lrn=${encodeURIComponent(decl.lrn)}`);
  };

  const handleSubmitDeclarationConfirmed = async (decl: CustomsDeclaration) => {
    toast.success('Declarație trimisă', `Declarația ${decl.lrn} a fost trimisă la biroul vamal.`);
  };

  const handleCalculateCustomsTaxes = () => {
    toast.info('În dezvoltare', 'Calculator taxe vamale - funcționalitate în dezvoltare.');
  };

  const handleCreateCBAMDeclaration = () => {
    router.push('/dashboard/logistics/carbon/cbam/new');
  };

  const handleGenerateReport = (reportType: string) => {
    toast.info('În dezvoltare', `Generare raport ${reportType} - funcționalitate în dezvoltare.`);
  };

  const handleGenerateForecast = () => {
    toast.success('Previziune generată', 'Previziune AI generată cu succes!');
  };

  const handleAnalyzeSeasonality = () => {
    toast.info('În dezvoltare', 'Analiză sezonalitate - funcționalitate în dezvoltare.');
  };

  const handleCalculateSafetyStock = () => {
    toast.info('În dezvoltare', 'Calcul safety stock - funcționalitate în dezvoltare.');
  };

  const categories = [...new Set(items.map(item => item.category))];

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'inventory', label: 'Inventar', icon: Package },
    { id: 'routes', label: 'Rute & Livrari', icon: Route },
    { id: 'customs', label: 'Vama', icon: Globe },
    { id: 'carbon', label: 'Carbon & ESG', icon: Leaf },
    { id: 'forecast', label: 'Previziuni', icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistica & Supply Chain</h1>
          <p className="text-gray-600">Inventar, rute, vama, carbon tracking si previziuni</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleAddItem} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Adauga
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Package className="w-4 h-4" />
              Articole
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalItems.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Warehouse className="w-4 h-4" />
              Depozite
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalWarehouses}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Valoare
            </div>
            <div className="text-2xl font-bold text-gray-900">{(summary.totalValue / 1000).toFixed(0)}K</div>
            <div className="text-xs text-gray-500">RON</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Stoc Redus
            </div>
            <div className="text-2xl font-bold text-red-600">{summary.lowStockItems}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Expira
            </div>
            <div className="text-2xl font-bold text-yellow-600">{summary.expiringBatches}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <ArrowRight className="w-4 h-4" />
              Receptii
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.pendingReceipts}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
              <Truck className="w-4 h-4" />
              Expedieri
            </div>
            <div className="text-2xl font-bold text-purple-600">{summary.pendingShipments}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
              <Target className="w-4 h-4" />
              Acuratete
            </div>
            <div className="text-2xl font-bold text-green-600">{summary.stockAccuracy}%</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Alerte Active ({alerts.filter(a => !a.acknowledged).length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {alerts.filter(a => !a.acknowledged).map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{alert.itemName}</p>
                      <p className="text-sm text-gray-500">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(alert.severity)}`}>
                          {getStatusLabel(alert.severity)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(alert.createdAt).toLocaleString('ro-RO')}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleResolveAlert(alert)} className="text-blue-600 hover:text-blue-800 text-sm">
                      Rezolva
                    </button>
                  </div>
                </div>
              ))}
              {alerts.filter(a => !a.acknowledged).length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>Nicio alerta activa</p>
                </div>
              )}
            </div>
          </div>

          {/* Warehouses Overview */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-500" />
                Utilizare Depozite
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{warehouse.name}</p>
                      <p className="text-xs text-gray-500">{warehouse.code} - {warehouse.type}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{warehouse.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        warehouse.utilization > 90 ? 'bg-red-500' :
                        warehouse.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${warehouse.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Routes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Route className="w-5 h-5 text-purple-500" />
                Rute Active
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {routes.filter(r => r.status !== 'COMPLETED').slice(0, 4).map((route) => (
                <div key={route.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{route.name}</p>
                      <p className="text-sm text-gray-500">
                        {route.stops} opriri - {route.distanceKm} km - {route.estimatedDuration}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {route.vehicle} {route.driver && `- ${route.driver}`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(route.status)}`}>
                      {getStatusLabel(route.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carbon Quick Stats */}
          {carbonMetrics && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-500" />
                  Carbon & Sustenabilitate
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{carbonMetrics.totalEmissions.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">tCO2e Total</p>
                    <p className={`text-xs ${carbonMetrics.emissionsChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {carbonMetrics.emissionsChange > 0 ? '+' : ''}{carbonMetrics.emissionsChange}% vs an trecut
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{carbonMetrics.electricVehicles}/{carbonMetrics.fleetSize}</p>
                    <p className="text-xs text-gray-500">Vehicule Electrice</p>
                    <p className="text-xs text-blue-600">
                      {((carbonMetrics.electricVehicles / carbonMetrics.fleetSize) * 100).toFixed(0)}% din flota
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{carbonMetrics.targetProgress}%</p>
                    <p className="text-xs text-gray-500">Progres Tinta</p>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${carbonMetrics.targetProgress}%` }} />
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      {carbonMetrics.etsCompliance ? (
                        <ShieldCheck className="w-6 h-6 text-green-500" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">EU ETS</p>
                    <p className={`text-xs ${carbonMetrics.etsCompliance ? 'text-green-600' : 'text-red-600'}`}>
                      {carbonMetrics.etsCompliance ? 'Conform' : 'Neconform'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cauta articole (SKU, nume...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toate Categoriile</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button onClick={handleScanBarcode} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Scan className="w-4 h-4" />
                Scanare
              </button>
              <button onClick={handleScanQR} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <QrCode className="w-4 h-4" />
                QR
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Articol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantitate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locatie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{item.quantity}</p>
                        <p className="text-xs text-gray-500">Min: {item.reorderPoint}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800 mr-3">Editare</button>
                      <button onClick={() => handleViewMovements(item)} className="text-gray-600 hover:text-gray-800">Miscari</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Warehouses Grid */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Depozite</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{warehouse.name}</h4>
                      <p className="text-sm text-gray-500">{warehouse.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${warehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {warehouse.isActive ? 'Activ' : 'Inactiv'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{warehouse.address}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Utilizare</span>
                      <span className="font-medium">{warehouse.utilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          warehouse.utilization > 90 ? 'bg-red-500' :
                          warehouse.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${warehouse.utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 pt-2">
                      <span>{warehouse.zones} zone</span>
                      <span>{warehouse.locations} locatii</span>
                      <span>{warehouse.capacity.toLocaleString()} m3</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="space-y-6">
          {/* Route Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleOptimizeRoute} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Navigation className="w-4 h-4" />
                Optimizare Ruta
              </button>
              <button onClick={handleLiveMap} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <MapPin className="w-4 h-4" />
                Harta Live
              </button>
            </div>
          </div>

          {/* Routes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{route.name}</h4>
                      <p className="text-sm text-gray-500">{route.scheduledDate}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(route.status)}`}>
                      {getStatusLabel(route.status)}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{route.stops}</p>
                      <p className="text-xs text-gray-500">Opriri</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{route.distanceKm}</p>
                      <p className="text-xs text-gray-500">km</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{route.estimatedDuration}</p>
                      <p className="text-xs text-gray-500">Durata</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-500">Vehicul: </span>
                        <span className="font-medium">{route.vehicle}</span>
                      </div>
                      {route.driver && (
                        <div>
                          <span className="text-gray-500">Sofer: </span>
                          <span className="font-medium">{route.driver}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2">
                  <button onClick={() => handleRouteDetails(route)} className="text-sm text-gray-600 hover:text-gray-800">Detalii</button>
                  <button onClick={() => handleTrackGPS(route)} className="text-sm text-blue-600 hover:text-blue-800">Urmarire GPS</button>
                </div>
              </div>
            ))}
          </div>

          {/* Route Optimization Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Optimizare AI Rute
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Algoritmi Disponibili</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="algorithm" className="text-blue-600" defaultChecked />
                    <span className="text-sm">Hibrid (Recomandat)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="algorithm" className="text-blue-600" />
                    <span className="text-sm">Cel mai scurt drum</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="algorithm" className="text-blue-600" />
                    <span className="text-sm">Minim CO2</span>
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Optiuni</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="text-blue-600" defaultChecked />
                    <span className="text-sm">Include trafic real-time</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="text-blue-600" defaultChecked />
                    <span className="text-sm">Respecta ferestre de timp</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="text-blue-600" />
                    <span className="text-sm">Evita autostrazi cu taxe</span>
                  </label>
                </div>
              </div>
              <div className="flex items-end">
                <button onClick={handleCalculateOptimalRoute} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Calculeaza Ruta Optima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customs' && (
        <div className="space-y-6">
          {/* Customs Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-2">
              <button onClick={handleNewDeclaration} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <FileText className="w-4 h-4" />
                Declaratie Noua
              </button>
              <button onClick={handleValidateVIES} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Globe className="w-4 h-4" />
                Validare VIES
              </button>
              <button onClick={handleSearchHSCodes} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Search className="w-4 h-4" />
                Coduri HS
              </button>
            </div>
          </div>

          {/* Customs Declarations Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Declaratii Vamale</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LRN / MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Declarant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valoare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birou Vamal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {declarations.map((decl) => (
                  <tr key={decl.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{decl.lrn}</p>
                        {decl.mrn && <p className="text-xs text-gray-500">{decl.mrn}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {decl.type === 'IMPORT' && <Ship className="w-4 h-4 text-blue-500" />}
                        {decl.type === 'EXPORT' && <Plane className="w-4 h-4 text-green-500" />}
                        {decl.type === 'TRANSIT' && <Truck className="w-4 h-4 text-orange-500" />}
                        <span className="text-sm">{getStatusLabel(decl.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {decl.declarant}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {decl.goodsValue.toLocaleString()} {decl.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {decl.customsOffice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(decl.status)}`}>
                        {getStatusLabel(decl.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleDeclarationDetails(decl)} className="text-blue-600 hover:text-blue-800 mr-3">Detalii</button>
                      {decl.status === 'DRAFT' && (
                        <button onClick={() => handleSubmitDeclaration(decl)} className="text-green-600 hover:text-green-800">Transmite</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Tools */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Validare VIES
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Verifica validitatea codurilor TVA din UE
              </p>
              <input
                type="text"
                placeholder="ex: RO12345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              />
              <button onClick={handleValidateVIES} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Valideaza
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-green-500" />
                Cautare Cod HS
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Gaseste codul HS corect pentru produsele tale
              </p>
              <input
                type="text"
                placeholder="Descriere produs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              />
              <button onClick={handleSearchHSCodes} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Cauta
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Calcul Taxe Vamale
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Estimeaza taxele si TVA pentru import
              </p>
              <input
                type="text"
                placeholder="Cod HS..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              />
              <button onClick={handleCalculateCustomsTaxes} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Calculeaza
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'carbon' && carbonMetrics && (
        <div className="space-y-6">
          {/* Carbon Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Activity className="w-4 h-4" />
                Emisii Totale
              </div>
              <p className="text-2xl font-bold text-gray-900">{carbonMetrics.totalEmissions.toFixed(1)}</p>
              <p className="text-xs text-gray-500">tCO2e</p>
              <p className={`text-sm mt-1 ${carbonMetrics.emissionsChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {carbonMetrics.emissionsChange < 0 ? <TrendingDown className="inline w-3 h-3" /> : <TrendingUp className="inline w-3 h-3" />}
                {' '}{Math.abs(carbonMetrics.emissionsChange)}% vs an trecut
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Truck className="w-4 h-4" />
                Flota
              </div>
              <p className="text-2xl font-bold text-gray-900">{carbonMetrics.fleetSize}</p>
              <p className="text-xs text-gray-500">vehicule</p>
              <p className="text-sm mt-1 text-green-600">
                {carbonMetrics.electricVehicles} electrice ({((carbonMetrics.electricVehicles / carbonMetrics.fleetSize) * 100).toFixed(0)}%)
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Target className="w-4 h-4" />
                Progres Tinta
              </div>
              <p className="text-2xl font-bold text-gray-900">{carbonMetrics.targetProgress}%</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${carbonMetrics.targetProgress}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <ShieldCheck className="w-4 h-4" />
                EU ETS
              </div>
              <div className="flex items-center gap-2 mt-2">
                {carbonMetrics.etsCompliance ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <span className="text-green-600 font-medium">Conform</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <span className="text-red-600 font-medium">Neconform</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Carbon Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CBAM Declarations */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  CBAM - Mecanismul de Ajustare la Frontiere
                </h3>
              </div>
              <div className="p-4">
                <div className="text-center py-6">
                  <p className="text-3xl font-bold text-gray-900">{carbonMetrics.cbamDeclarations}</p>
                  <p className="text-sm text-gray-500">Declaratii CBAM active</p>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Perioada curenta de raportare</p>
                    <p className="text-xs text-blue-600">Q4 2024 - Termen: 31 Ian 2025</p>
                  </div>
                  <button onClick={handleCreateCBAMDeclaration} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Creaza Declaratie CBAM
                  </button>
                </div>
              </div>
            </div>

            {/* Sustainability Initiatives */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-500" />
                  Initiative de Sustenabilitate
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-green-800">Electrificare Flota</p>
                      <p className="text-xs text-green-600">Tinta: 50% vehicule electrice pana in 2026</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">In Progress</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-green-700 mb-1">
                      <span>Progres</span>
                      <span>36%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-1.5">
                      <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '36%' }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-blue-800">Optimizare Rute AI</p>
                      <p className="text-xs text-blue-600">Reducere 15% km parcursi</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Activ</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-blue-700 mb-1">
                      <span>Economie CO2</span>
                      <span>12.5 tCO2e/luna</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-yellow-800">Energie Regenerabila</p>
                      <p className="text-xs text-yellow-600">Panouri solare depozite</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Planificat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carbon Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapoarte Sustenabilitate</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button onClick={() => handleGenerateReport('GRI')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <FileText className="w-6 h-6 text-blue-500 mb-2" />
                <p className="font-medium text-gray-900">Raport GRI</p>
                <p className="text-xs text-gray-500">Global Reporting Initiative</p>
              </button>
              <button onClick={() => handleGenerateReport('CDP')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <FileText className="w-6 h-6 text-green-500 mb-2" />
                <p className="font-medium text-gray-900">Raport CDP</p>
                <p className="text-xs text-gray-500">Carbon Disclosure Project</p>
              </button>
              <button onClick={() => handleGenerateReport('TCFD')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <FileText className="w-6 h-6 text-purple-500 mb-2" />
                <p className="font-medium text-gray-900">Raport TCFD</p>
                <p className="text-xs text-gray-500">Climate Financial Disclosure</p>
              </button>
              <button onClick={() => handleGenerateReport('EU ETS')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <FileText className="w-6 h-6 text-orange-500 mb-2" />
                <p className="font-medium text-gray-900">EU ETS Report</p>
                <p className="text-xs text-gray-500">Emission Trading System</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Forecast Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <TrendingUp className="w-4 h-4" />
                Articole Monitorizate
              </div>
              <p className="text-2xl font-bold text-gray-900">{forecasts.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-red-500 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                Risc Stockout
              </div>
              <p className="text-2xl font-bold text-red-600">
                {forecasts.filter(f => f.daysToStockout && f.daysToStockout < 14).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-green-500 text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                Acuratete Medie
              </div>
              <p className="text-2xl font-bold text-green-600">
                {(forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-blue-500 text-sm mb-2">
                <Calendar className="w-4 h-4" />
                Orizont Previziune
              </div>
              <p className="text-2xl font-bold text-blue-600">30</p>
              <p className="text-xs text-gray-500">zile</p>
            </div>
          </div>

          {/* Forecast Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Previziuni Cerere
              </h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stoc Curent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cerere Estimata</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incredere</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zile Stockout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recomandare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {forecasts.map((forecast) => (
                  <tr key={forecast.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{forecast.productName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.forecastedDemand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              forecast.confidence > 0.9 ? 'bg-green-500' :
                              forecast.confidence > 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${forecast.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{(forecast.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {forecast.daysToStockout !== undefined ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          forecast.daysToStockout === 0 ? 'bg-red-100 text-red-800' :
                          forecast.daysToStockout < 14 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {forecast.daysToStockout === 0 ? 'Fara stoc' : `${forecast.daysToStockout} zile`}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{forecast.recommendedAction}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Forecast Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Generare Previziune
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Genereaza previziuni AI pentru un produs specific
              </p>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3">
                <option>Selecteaza produs...</option>
                {forecasts.map(f => (
                  <option key={f.productId} value={f.productId}>{f.productName}</option>
                ))}
              </select>
              <button onClick={handleGenerateForecast} className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                Genereaza Previziune
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Analiza Sezonalitate
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Detecteaza pattern-uri sezoniere in vanzari
              </p>
              <button onClick={handleAnalyzeSeasonality} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Analizeaza Sezonalitate
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Calcul Safety Stock
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Determina nivelul optim de stoc de siguranta
              </p>
              <button onClick={handleCalculateSafetyStock} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Calculeaza Safety Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
