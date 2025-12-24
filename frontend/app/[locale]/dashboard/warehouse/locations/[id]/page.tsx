'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  MapPin,
  Warehouse,
  Package,
  Box,
  Boxes,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  Download,
  Printer,
  Barcode,
  ArrowUpDown,
  ArrowRight,
  QrCode,
  Layers,
  Ruler,
  ThermometerSun,
  RefreshCw,
  History,
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
} from 'recharts';

interface LocationItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  lastMovement: string;
  status: 'available' | 'reserved' | 'picking';
}

interface LocationMovement {
  id: string;
  type: 'RECEIPT' | 'TRANSFER' | 'PICK' | 'PUTAWAY' | 'ADJUSTMENT';
  itemSku: string;
  itemName: string;
  quantity: number;
  direction: 'in' | 'out';
  reference?: string;
  user: string;
  timestamp: string;
}

interface LocationDetail {
  id: string;
  code: string;
  name: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  type: 'RACK' | 'FLOOR' | 'DOCK' | 'STAGING' | 'BULK' | 'COLD_STORAGE';
  capacity: number;
  capacityUnit: string;
  currentUtilization: number;
  dimensions?: {
    width: number;
    depth: number;
    height: number;
    unit: string;
  };
  maxWeight?: number;
  weightUnit?: string;
  temperature?: {
    min: number;
    max: number;
    current?: number;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BLOCKED';
  items: LocationItem[];
  totalItems: number;
  totalSKUs: number;
  lastActivity: string;
  createdAt: string;
  notes?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Mock data for demo
const getMockLocation = (id: string): LocationDetail => ({
  id,
  code: 'A-01-03-02',
  name: 'Raft A1 - Nivel 3 - Poziția 2',
  zone: 'Zona A - Produse Rapide',
  aisle: 'A1',
  rack: '03',
  level: '3',
  position: '02',
  type: 'RACK',
  capacity: 500,
  capacityUnit: 'kg',
  currentUtilization: 68,
  dimensions: {
    width: 120,
    depth: 80,
    height: 60,
    unit: 'cm',
  },
  maxWeight: 500,
  weightUnit: 'kg',
  status: 'ACTIVE',
  items: [
    { id: 'item-1', sku: 'PAPER-A4-500', name: 'Hârtie A4 500 coli', quantity: 45, unit: 'top', lastMovement: '2025-12-16T10:30:00Z', status: 'available' },
    { id: 'item-2', sku: 'TONER-HP-85A', name: 'Toner HP 85A Original', quantity: 12, unit: 'buc', lastMovement: '2025-12-15T14:20:00Z', status: 'available' },
    { id: 'item-3', sku: 'PEN-BIC-BLUE', name: 'Pixuri BIC Cristal albastru', quantity: 8, unit: 'set', lastMovement: '2025-12-14T09:15:00Z', status: 'reserved' },
  ],
  totalItems: 65,
  totalSKUs: 3,
  lastActivity: '2025-12-16T10:30:00Z',
  createdAt: '2024-01-15T08:00:00Z',
  notes: 'Locație preferată pentru produse cu rotație rapidă',
});

const getMockMovements = (): LocationMovement[] => [
  { id: 'm1', type: 'RECEIPT', itemSku: 'PAPER-A4-500', itemName: 'Hârtie A4 500 coli', quantity: 50, direction: 'in', reference: 'PO-2025-0156', user: 'Maria Ionescu', timestamp: '2025-12-16T10:30:00Z' },
  { id: 'm2', type: 'PICK', itemSku: 'TONER-HP-85A', itemName: 'Toner HP 85A Original', quantity: 3, direction: 'out', reference: 'ORD-2025-0089', user: 'Ion Popescu', timestamp: '2025-12-15T16:45:00Z' },
  { id: 'm3', type: 'PUTAWAY', itemSku: 'PEN-BIC-BLUE', itemName: 'Pixuri BIC Cristal albastru', quantity: 10, direction: 'in', reference: 'PO-2025-0148', user: 'Maria Ionescu', timestamp: '2025-12-14T09:15:00Z' },
  { id: 'm4', type: 'TRANSFER', itemSku: 'PAPER-A4-500', itemName: 'Hârtie A4 500 coli', quantity: 20, direction: 'out', reference: 'TRF-2025-0034', user: 'Admin', timestamp: '2025-12-13T11:00:00Z' },
];

export default function WarehouseLocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const locationId = params.id as string;

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [movements, setMovements] = useState<LocationMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const [locRes, movRes] = await Promise.all([
        fetch(`${API_URL}/warehouse/locations/${locationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/warehouse/locations/${locationId}/movements?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (locRes.ok) {
        const data = await locRes.json();
        setLocation(data);
      } else {
        setLocation(getMockLocation(locationId));
      }

      if (movRes.ok) {
        const movData = await movRes.json();
        setMovements(movData.data || movData);
      } else {
        setMovements(getMockMovements());
      }
    } catch (err) {
      console.error('Error fetching location:', err);
      setLocation(getMockLocation(locationId));
      setMovements(getMockMovements());
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/warehouse/locations/${locationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Locație ștearsă', 'Locația a fost ștearsă cu succes.');
        router.push('/dashboard/warehouse');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge locația.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut șterge locația.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePrintLabel = () => {
    toast.success('Printare', 'Se generează eticheta locației...');
  };

  const handlePrintBarcode = () => {
    toast.success('Cod de bare', 'Se generează codul de bare...');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Activă', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-5 w-5 text-green-600" /> };
      case 'INACTIVE':
        return { label: 'Inactivă', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-5 w-5 text-gray-600" /> };
      case 'MAINTENANCE':
        return { label: 'Mentenanță', color: 'bg-yellow-100 text-yellow-800', icon: <RefreshCw className="h-5 w-5 text-yellow-600" /> };
      case 'BLOCKED':
        return { label: 'Blocată', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-5 w-5 text-red-600" /> };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-5 w-5" /> };
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      RACK: 'Raft',
      FLOOR: 'Podea',
      DOCK: 'Doc',
      STAGING: 'Zonă pregătire',
      BULK: 'Depozitare în vrac',
      COLD_STORAGE: 'Depozit frigorific',
    };
    return labels[type] || type;
  };

  const getMovementTypeConfig = (type: string, direction: string) => {
    if (direction === 'in') {
      return { label: type === 'RECEIPT' ? 'Recepție' : type === 'PUTAWAY' ? 'Depozitare' : 'Transfer intrare', color: 'bg-green-100 text-green-800', icon: <ArrowRight className="h-4 w-4 rotate-180" /> };
    }
    return { label: type === 'PICK' ? 'Picking' : 'Transfer ieșire', color: 'bg-red-100 text-red-800', icon: <ArrowRight className="h-4 w-4" /> };
  };

  const getItemStatusConfig = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Disponibil', color: 'bg-green-100 text-green-800' };
      case 'reserved':
        return { label: 'Rezervat', color: 'bg-yellow-100 text-yellow-800' };
      case 'picking':
        return { label: 'În picking', color: 'bg-blue-100 text-blue-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Locația nu a fost găsită.'}</p>
        <button
          onClick={() => router.push('/dashboard/warehouse')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Înapoi la depozit
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(location.status);
  const utilizationColor = location.currentUtilization > 90 ? '#EF4444' : location.currentUtilization > 70 ? '#F59E0B' : '#10B981';

  // Chart data
  const utilizationData = [
    { name: 'Utilizat', value: location.currentUtilization },
    { name: 'Liber', value: 100 - location.currentUtilization },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/warehouse')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{location.code}</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {getTypeLabel(location.type)}
              </span>
            </div>
            <p className="text-sm text-gray-500">{location.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          <button
            onClick={() => router.push(`/dashboard/warehouse/locations/${locationId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editează
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <button
                    onClick={handlePrintLabel}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printează etichetă
                  </button>
                  <button
                    onClick={handlePrintBarcode}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Barcode className="h-4 w-4" />
                    Generează cod bare
                  </button>
                  <button
                    onClick={() => toast.success('QR', 'Se generează codul QR...')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    Generează QR
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Șterge locația
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <Boxes className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{location.totalItems}</p>
              <p className="text-sm text-gray-500">Total articole</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <Package className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{location.totalSKUs}</p>
              <p className="text-sm text-gray-500">SKU-uri diferite</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <Layers className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{location.currentUtilization}%</p>
              <p className="text-sm text-gray-500">Utilizare</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('items')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'items'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Articole ({location.items.length})
                </button>
                <button
                  onClick={() => setActiveTab('movements')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'movements'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Mișcări ({movements.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'items' ? (
                <div className="space-y-3">
                  {location.items.map((item) => {
                    const itemStatus = getItemStatusConfig(item.status);
                    return (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Box className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${itemStatus.color}`}>
                              {itemStatus.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{item.quantity}</p>
                          <p className="text-xs text-gray-500">{item.unit}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-500">Ultima mișcare</p>
                          <p className="text-gray-600">{formatDateTime(item.lastMovement)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {location.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Box className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>Locația este goală</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => {
                    const movConfig = getMovementTypeConfig(movement.type, movement.direction);
                    return (
                      <div key={movement.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-lg ${movConfig.color}`}>
                          {movConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${movConfig.color}`}>
                              {movConfig.label}
                            </span>
                            <span className={`font-medium ${movement.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                              {movement.direction === 'in' ? '+' : '-'}{movement.quantity}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900">{movement.itemName}</p>
                          {movement.reference && (
                            <p className="text-xs text-gray-500">Ref: {movement.reference}</p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-600">{movement.user}</p>
                          <p className="text-gray-400">{formatDateTime(movement.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Utilization Chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Utilizare capacitate</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={utilizationData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill={utilizationColor} />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <p className="text-sm text-gray-500">
                {location.currentUtilization}% din {location.capacity} {location.capacityUnit}
              </p>
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Detalii locație</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Zonă</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {location.zone}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Culoar</p>
                  <p className="font-medium">{location.aisle}</p>
                </div>
                <div>
                  <p className="text-gray-500">Raft</p>
                  <p className="font-medium">{location.rack}</p>
                </div>
                <div>
                  <p className="text-gray-500">Nivel</p>
                  <p className="font-medium">{location.level}</p>
                </div>
                <div>
                  <p className="text-gray-500">Poziție</p>
                  <p className="font-medium">{location.position}</p>
                </div>
              </div>
              {location.dimensions && (
                <div>
                  <p className="text-sm text-gray-500">Dimensiuni</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-gray-400" />
                    {location.dimensions.width} × {location.dimensions.depth} × {location.dimensions.height} {location.dimensions.unit}
                  </p>
                </div>
              )}
              {location.maxWeight && (
                <div>
                  <p className="text-sm text-gray-500">Greutate maximă</p>
                  <p className="font-medium text-gray-900">{location.maxWeight} {location.weightUnit}</p>
                </div>
              )}
              {location.temperature && (
                <div>
                  <p className="text-sm text-gray-500">Temperatură</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <ThermometerSun className="h-4 w-4 text-gray-400" />
                    {location.temperature.min}°C - {location.temperature.max}°C
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h3>
            <div className="space-y-2">
              <button
                onClick={() => toast.success('Transfer', 'Se deschide fereastra de transfer...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                Transfer articole
              </button>
              <button
                onClick={() => toast.success('Inventar', 'Se deschide numărătoarea...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Boxes className="h-4 w-4" />
                Numărătoare stoc
              </button>
              <button
                onClick={() => router.push(`/dashboard/warehouse/locations/${locationId}/history`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Istoric complet
              </button>
            </div>
          </div>

          {/* Notes */}
          {location.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Note</h3>
              <p className="text-sm text-yellow-700">{location.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Confirmare ștergere</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Sigur dorești să ștergi locația <strong>{location.code}</strong>? Această acțiune nu poate fi anulată.
              {location.totalItems > 0 && (
                <span className="block mt-2 text-red-600">
                  Atenție: Locația conține {location.totalItems} articole!
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || location.totalItems > 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
