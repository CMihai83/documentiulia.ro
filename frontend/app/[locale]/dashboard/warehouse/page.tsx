'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  Package,
  Warehouse,
  ArrowUpDown,
  AlertTriangle,
  Barcode,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Search,
  Filter,
  PackageCheck,
  PackageX,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  MapPin,
  Box,
  Boxes,
  ClipboardList,
  FileText,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Types
interface WarehouseSummary {
  totalSKUs: number;
  inStockValue: number;
  lowStockAlerts: number;
  pendingReceipts: number;
  activeLocations: number;
  totalMovements: number;
  pendingCycleCounts: number;
  averageAccuracy: number;
}

interface WarehouseLocation {
  id: string;
  code: string;
  name: string;
  zone: string;
  type: 'RACK' | 'FLOOR' | 'DOCK' | 'STAGING';
  capacity: number;
  utilization: number;
  activeItems: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

interface StockMovement {
  id: string;
  type: 'RECEIPT' | 'TRANSFER' | 'ADJUSTMENT' | 'PICK' | 'PUTAWAY';
  itemSKU: string;
  itemName: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  timestamp: string;
  user: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  location: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  daysToStockout?: number;
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'ACTIVE': 'bg-green-100 text-green-800',
    'INACTIVE': 'bg-gray-100 text-gray-800',
    'MAINTENANCE': 'bg-yellow-100 text-yellow-800',
    'PENDING': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'CRITICAL': 'bg-red-100 text-red-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'ACTIVE': 'Activ',
    'INACTIVE': 'Inactiv',
    'MAINTENANCE': 'In Mentenanta',
    'PENDING': 'In Asteptare',
    'COMPLETED': 'Finalizat',
    'CANCELLED': 'Anulat',
    'CRITICAL': 'Critic',
    'HIGH': 'Ridicat',
    'MEDIUM': 'Mediu',
    'RECEIPT': 'Receptie',
    'TRANSFER': 'Transfer',
    'ADJUSTMENT': 'Ajustare',
    'PICK': 'Preluare',
    'PUTAWAY': 'Depozitare',
    'RACK': 'Raft',
    'FLOOR': 'Pardoseala',
    'DOCK': 'Doc',
    'STAGING': 'Zona Intermediara',
  };
  return labels[status] || status;
};

export default function WarehousePage() {
  const t = useTranslations('warehouse');
  const toast = useToast();
  const [summary, setSummary] = useState<WarehouseSummary | null>(null);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const fetchWarehouseData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      let usedMockData = false;

      // Fetch warehouse summary from API
      try {
        const summaryRes = await fetch(`${API_URL}/warehouse/summary`, { headers });
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data);
        } else {
          throw new Error('Summary API unavailable');
        }
      } catch {
        usedMockData = true;
        setSummary(getMockSummary());
      }

      // Fetch warehouse locations from API
      try {
        const locationsRes = await fetch(`${API_URL}/warehouse/locations`, { headers });
        if (locationsRes.ok) {
          const data = await locationsRes.json();
          setLocations(data.locations || data || []);
        } else {
          throw new Error('Locations API unavailable');
        }
      } catch {
        usedMockData = true;
        setLocations(getMockLocations());
      }

      // Fetch stock movements from API
      try {
        const movementsRes = await fetch(`${API_URL}/warehouse/movements`, { headers });
        if (movementsRes.ok) {
          const data = await movementsRes.json();
          setMovements(data.movements || data || []);
        } else {
          throw new Error('Movements API unavailable');
        }
      } catch {
        usedMockData = true;
        setMovements(getMockMovements());
      }

      // Fetch low stock alerts from API
      try {
        const lowStockRes = await fetch(`${API_URL}/warehouse/low-stock`, { headers });
        if (lowStockRes.ok) {
          const data = await lowStockRes.json();
          setLowStockItems(data.items || data || []);
        } else {
          throw new Error('Low stock API unavailable');
        }
      } catch {
        usedMockData = true;
        setLowStockItems(getMockLowStockItems());
      }

      if (usedMockData) {
        console.warn('Warehouse: Using demo data - backend unavailable');
      }
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  // Demo data functions for fallback
  const getMockSummary = (): WarehouseSummary => ({
    totalSKUs: 1847,
    inStockValue: 3456000,
    lowStockAlerts: 18,
    pendingReceipts: 7,
    activeLocations: 156,
    totalMovements: 234,
    pendingCycleCounts: 3,
    averageAccuracy: 98.7,
  });

  const getMockLocations = (): WarehouseLocation[] => [
    { id: '1', code: 'A-01-001', name: 'Zone A - Raft 1 - Nivel 1', zone: 'A', type: 'RACK', capacity: 500, utilization: 85, activeItems: 45, status: 'ACTIVE' },
    { id: '2', code: 'A-01-002', name: 'Zone A - Raft 1 - Nivel 2', zone: 'A', type: 'RACK', capacity: 500, utilization: 72, activeItems: 38, status: 'ACTIVE' },
    { id: '3', code: 'B-02-001', name: 'Zone B - Raft 2 - Nivel 1', zone: 'B', type: 'RACK', capacity: 600, utilization: 91, activeItems: 52, status: 'ACTIVE' },
    { id: '4', code: 'C-01-F01', name: 'Zone C - Pardoseala 1', zone: 'C', type: 'FLOOR', capacity: 1000, utilization: 45, activeItems: 12, status: 'ACTIVE' },
    { id: '5', code: 'D-01-DOC', name: 'Zone D - Doc Incarcare 1', zone: 'D', type: 'DOCK', capacity: 200, utilization: 35, activeItems: 8, status: 'ACTIVE' },
    { id: '6', code: 'E-01-STG', name: 'Zone E - Zona Intermediara', zone: 'E', type: 'STAGING', capacity: 400, utilization: 58, activeItems: 23, status: 'ACTIVE' },
  ];

  const getMockMovements = (): StockMovement[] => [
    { id: '1', type: 'RECEIPT', itemSKU: 'SKU-1001', itemName: 'Laptop Dell Latitude 5540', quantity: 25, toLocation: 'A-01-001', timestamp: new Date().toISOString(), user: 'Ion Popescu', status: 'COMPLETED' },
    { id: '2', type: 'TRANSFER', itemSKU: 'SKU-1002', itemName: 'Monitor LG 27"', quantity: 10, fromLocation: 'A-01-001', toLocation: 'B-02-001', timestamp: new Date().toISOString(), user: 'Maria Ionescu', status: 'COMPLETED' },
    { id: '3', type: 'PICK', itemSKU: 'SKU-1003', itemName: 'Tastatura Mecanica', quantity: 5, fromLocation: 'B-02-001', timestamp: new Date().toISOString(), user: 'Andrei Vasile', status: 'COMPLETED' },
    { id: '4', type: 'RECEIPT', itemSKU: 'SKU-1004', itemName: 'Mouse Wireless', quantity: 50, toLocation: 'A-01-002', timestamp: new Date().toISOString(), user: 'Ion Popescu', status: 'PENDING' },
    { id: '5', type: 'ADJUSTMENT', itemSKU: 'SKU-1005', itemName: 'Cabluri USB-C', quantity: -3, toLocation: 'C-01-F01', timestamp: new Date().toISOString(), user: 'Maria Ionescu', status: 'COMPLETED' },
  ];

  const getMockLowStockItems = (): LowStockItem[] => [
    { id: '1', sku: 'SKU-2001', name: 'Monitor LG 27"', currentStock: 5, reorderPoint: 15, location: 'A-01-001', severity: 'CRITICAL', daysToStockout: 3 },
    { id: '2', sku: 'SKU-2002', name: 'Tastatura Mecanica', currentStock: 8, reorderPoint: 20, location: 'B-02-001', severity: 'HIGH', daysToStockout: 7 },
    { id: '3', sku: 'SKU-2003', name: 'Mouse Wireless', currentStock: 18, reorderPoint: 30, location: 'A-01-002', severity: 'MEDIUM', daysToStockout: 12 },
    { id: '4', sku: 'SKU-2004', name: 'Cabluri HDMI', currentStock: 3, reorderPoint: 25, location: 'C-01-F01', severity: 'CRITICAL', daysToStockout: 2 },
  ];

  const loadMockData = () => {
    setSummary(getMockSummary());
    setLocations(getMockLocations());
    setMovements(getMockMovements());
    setLowStockItems(getMockLowStockItems());
  };

  const filteredMovements = movements.filter(movement =>
    movement.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.itemSKU.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <h1 className="text-2xl font-bold text-gray-900">Depozit & Inventar</h1>
          <p className="text-gray-600">Gestionare depozit, locatii, miscari stoc si inventariere</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchWarehouseData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Adauga
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Package className="w-4 h-4" />
              Total SKUs
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalSKUs.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Valoare Stoc
            </div>
            <div className="text-2xl font-bold text-gray-900">{(summary.inStockValue / 1000).toFixed(0)}K</div>
            <div className="text-xs text-gray-500">RON</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Stoc Redus
            </div>
            <div className="text-2xl font-bold text-red-600">{summary.lowStockAlerts}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
              <PackageCheck className="w-4 h-4" />
              Receptii
            </div>
            <div className="text-2xl font-bold text-purple-600">{summary.pendingReceipts}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
              <Warehouse className="w-4 h-4" />
              Locatii
            </div>
            <div className="text-2xl font-bold text-green-600">{summary.activeLocations}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-orange-500 text-sm mb-1">
              <ArrowUpDown className="w-4 h-4" />
              Miscari
            </div>
            <div className="text-2xl font-bold text-orange-600">{summary.totalMovements}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-indigo-500 text-sm mb-1">
              <ClipboardList className="w-4 h-4" />
              Inventarieri
            </div>
            <div className="text-2xl font-bold text-indigo-600">{summary.pendingCycleCounts}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-cyan-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Acuratete
            </div>
            <div className="text-2xl font-bold text-cyan-600">{summary.averageAccuracy}%</div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Locations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Locatii Depozit
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.map((location) => (
                <div key={location.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{location.code}</p>
                      <p className="text-xs text-gray-500">{location.name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(location.status)}`}>
                      {getStatusLabel(location.status)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Zona: {location.zone}</span>
                    <span>Tip: {getStatusLabel(location.type)}</span>
                    <span>{location.activeItems} articole</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Utilizare</span>
                      <span className="font-medium">{location.utilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          location.utilization > 90 ? 'bg-red-500' :
                          location.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${location.utilization}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Alerte Stoc Redus ({lowStockItems.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {lowStockItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sku}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        Stoc: <span className="font-medium text-red-600">{item.currentStock}</span>
                      </span>
                      <span className="text-gray-500">
                        Min: <span className="font-medium">{item.reorderPoint}</span>
                      </span>
                      <span className="text-gray-500">
                        Loc: <span className="font-medium">{item.location}</span>
                      </span>
                    </div>
                    {item.daysToStockout !== undefined && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <Clock className="w-3 h-3" />
                        <span>{item.daysToStockout} zile pana la epuizare</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.severity)}`}>
                    {getStatusLabel(item.severity)}
                  </span>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Toate articolele sunt in stoc suficient</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Stock Movements */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-orange-500" />
              Miscari Recente Stoc
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cauta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Articol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantitate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locatie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Ora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilizator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      movement.type === 'RECEIPT' ? 'bg-green-100 text-green-800' :
                      movement.type === 'TRANSFER' ? 'bg-blue-100 text-blue-800' :
                      movement.type === 'PICK' ? 'bg-purple-100 text-purple-800' :
                      movement.type === 'PUTAWAY' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {getStatusLabel(movement.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900">{movement.itemName}</p>
                      <p className="text-xs text-gray-500">{movement.itemSKU}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${movement.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.fromLocation && movement.toLocation ? (
                      <div className="flex items-center gap-1">
                        <span>{movement.fromLocation}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{movement.toLocation}</span>
                      </div>
                    ) : movement.toLocation ? (
                      movement.toLocation
                    ) : movement.fromLocation ? (
                      movement.fromLocation
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(movement.timestamp).toLocaleString('ro-RO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(movement.status)}`}>
                      {getStatusLabel(movement.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <PackageCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Receptie Noua</h4>
              <p className="text-xs text-gray-500">Inregistreaza marfa primita</p>
            </div>
          </div>
          <button
            onClick={() => toast.info('Receptie', 'Funcționalitate în dezvoltare. Vă rugăm reveniți.')}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Creaza Receptie
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowUpDown className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Transfer Stoc</h4>
              <p className="text-xs text-gray-500">Muta stoc intre locatii</p>
            </div>
          </div>
          <button
            onClick={() => toast.info('Transfer', 'Funcționalitate în dezvoltare. Vă rugăm reveniți.')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            Transfer Stoc
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Inventariere Ciclica</h4>
              <p className="text-xs text-gray-500">Verifica acuratetea stocului</p>
            </div>
          </div>
          <button
            onClick={() => toast.info('Inventariere', 'Funcționalitate în dezvoltare. Vă rugăm reveniți.')}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            <Barcode className="w-4 h-4" />
            Incepe Numarare
          </button>
        </div>
      </div>
    </div>
  );
}
