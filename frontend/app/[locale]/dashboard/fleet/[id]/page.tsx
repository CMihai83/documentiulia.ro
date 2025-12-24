'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Truck,
  MapPin,
  Fuel,
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Navigation,
  Gauge,
  User,
  Clock,
  Route,
  FileText,
  Settings,
  Shield,
  Activity,
  TrendingUp,
  DollarSign,
  Edit,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  Package,
  Timer,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface VehicleDetail {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  mileage: number;
  fuelType: 'DIESEL' | 'PETROL' | 'ELECTRIC' | 'HYBRID' | 'LPG';
  fuelCapacityLiters?: number;
  currentFuelLevel?: number;
  maxPayloadKg?: number;
  dimensions?: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  currentLat?: number;
  currentLng?: number;
  lastPositionUpdate?: string;
  assignedDriver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    licenseNumber?: string;
  };
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  registrationExpiry?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  notes?: string;
  tags?: string[];
}

interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  date: string;
  mileageAtService: number;
  cost: number;
  provider?: string;
  nextDue?: string;
  nextDueMileage?: number;
}

interface RouteHistoryItem {
  id: string;
  routeName: string;
  date: string;
  stops: number;
  completedStops: number;
  distanceKm: number;
  durationMinutes: number;
  driverName?: string;
  status: 'COMPLETED' | 'PARTIAL' | 'CANCELLED';
}

interface FuelRecord {
  id: string;
  date: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  mileage: number;
  fullTank: boolean;
  station?: string;
}

interface VehicleStats {
  totalDistanceKm: number;
  avgFuelConsumption: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  routesCompleted: number;
  deliveriesCompleted: number;
  avgDeliveriesPerRoute: number;
  utilizationPercent: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'AVAILABLE': 'bg-green-100 text-green-800',
    'IN_USE': 'bg-blue-100 text-blue-800',
    'MAINTENANCE': 'bg-yellow-100 text-yellow-800',
    'OUT_OF_SERVICE': 'bg-red-100 text-red-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'PARTIAL': 'bg-yellow-100 text-yellow-800',
    'CANCELLED': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'AVAILABLE': 'Disponibil',
    'IN_USE': 'In Folosinta',
    'MAINTENANCE': 'Mentenanta',
    'OUT_OF_SERVICE': 'Indisponibil',
    'COMPLETED': 'Finalizat',
    'PARTIAL': 'Partial',
    'CANCELLED': 'Anulat',
    'DIESEL': 'Motorina',
    'PETROL': 'Benzina',
    'ELECTRIC': 'Electric',
    'HYBRID': 'Hibrid',
    'LPG': 'GPL',
  };
  return labels[status] || status;
};

const getFuelTypeIcon = (fuelType: string) => {
  switch (fuelType) {
    case 'ELECTRIC':
      return <Zap className="w-4 h-4 text-green-500" />;
    case 'HYBRID':
      return <Activity className="w-4 h-4 text-blue-500" />;
    default:
      return <Fuel className="w-4 h-4 text-orange-500" />;
  }
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'routes' | 'fuel' | 'documents'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails();
    }
  }, [vehicleId]);

  const fetchVehicleDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const vehicleRes = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}`, { headers });
      if (vehicleRes.ok) {
        setVehicle(await vehicleRes.json());
      }

      const maintenanceRes = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/maintenance`, { headers });
      if (maintenanceRes.ok) {
        setMaintenance(await maintenanceRes.json());
      }

      const routesRes = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/routes`, { headers });
      if (routesRes.ok) {
        setRoutes(await routesRes.json());
      }

      const fuelRes = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/fuel`, { headers });
      if (fuelRes.ok) {
        setFuelRecords(await fuelRes.json());
      }

      const statsRes = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/stats`, { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setVehicle({
      id: vehicleId,
      licensePlate: 'B-123-LOG',
      make: 'Mercedes-Benz',
      model: 'Sprinter 316 CDI',
      year: 2022,
      vin: 'WDB9066331S123456',
      status: 'IN_USE',
      mileage: 45230,
      fuelType: 'DIESEL',
      fuelCapacityLiters: 75,
      currentFuelLevel: 62,
      maxPayloadKg: 1500,
      dimensions: { lengthCm: 700, widthCm: 200, heightCm: 230 },
      currentLat: 44.4268,
      currentLng: 26.1025,
      lastPositionUpdate: new Date().toISOString(),
      assignedDriver: {
        id: 'drv-001',
        firstName: 'Ion',
        lastName: 'Popescu',
        phone: '+40722123456',
        licenseNumber: 'RO-B-123456',
      },
      insuranceExpiry: '2025-06-30',
      inspectionExpiry: '2025-08-15',
      registrationExpiry: '2025-12-31',
      purchaseDate: '2022-03-15',
      purchasePrice: 52000,
      currentValue: 38000,
      notes: 'Vehicul principal pentru rute Bucuresti-Sud',
      tags: ['prioritar', 'frigorific'],
    });

    setMaintenance([
      {
        id: 'm-001',
        type: 'Schimb ulei',
        description: 'Schimb ulei motor + filtru ulei',
        date: '2024-11-15',
        mileageAtService: 42500,
        cost: 850,
        provider: 'Service Auto Expert SRL',
        nextDue: '2025-02-15',
        nextDueMileage: 52500,
      },
      {
        id: 'm-002',
        type: 'Revizie completa',
        description: 'Revizie anuala completa cu toate verificarile',
        date: '2024-08-20',
        mileageAtService: 38000,
        cost: 2400,
        provider: 'Mercedes-Benz Romania',
        nextDue: '2025-08-20',
      },
      {
        id: 'm-003',
        type: 'Anvelope',
        description: 'Inlocuire anvelope fata - set iarna',
        date: '2024-10-25',
        mileageAtService: 41200,
        cost: 1800,
        provider: 'Vulcanizare Rapid',
      },
      {
        id: 'm-004',
        type: 'Frane',
        description: 'Inlocuire placute frana fata',
        date: '2024-06-10',
        mileageAtService: 35000,
        cost: 650,
        provider: 'Service Auto Expert SRL',
        nextDue: '2025-06-10',
        nextDueMileage: 55000,
      },
    ]);

    setRoutes([
      {
        id: 'r-001',
        routeName: 'Ruta Bucuresti - Sud A',
        date: '2024-12-16',
        stops: 12,
        completedStops: 12,
        distanceKm: 145,
        durationMinutes: 420,
        driverName: 'Ion Popescu',
        status: 'COMPLETED',
      },
      {
        id: 'r-002',
        routeName: 'Ruta Bucuresti - Vest',
        date: '2024-12-15',
        stops: 8,
        completedStops: 8,
        distanceKm: 98,
        durationMinutes: 285,
        driverName: 'Ion Popescu',
        status: 'COMPLETED',
      },
      {
        id: 'r-003',
        routeName: 'Ruta Express Centru',
        date: '2024-12-14',
        stops: 15,
        completedStops: 13,
        distanceKm: 62,
        durationMinutes: 340,
        driverName: 'Andrei Vasile',
        status: 'PARTIAL',
      },
      {
        id: 'r-004',
        routeName: 'Ruta Bucuresti - Nord',
        date: '2024-12-13',
        stops: 10,
        completedStops: 10,
        distanceKm: 125,
        durationMinutes: 380,
        driverName: 'Ion Popescu',
        status: 'COMPLETED',
      },
    ]);

    setFuelRecords([
      { id: 'f-001', date: '2024-12-16', liters: 65, costPerLiter: 7.25, totalCost: 471.25, mileage: 45230, fullTank: true, station: 'OMV Bucuresti' },
      { id: 'f-002', date: '2024-12-13', liters: 58, costPerLiter: 7.20, totalCost: 417.60, mileage: 44850, fullTank: true, station: 'Petrom Voluntari' },
      { id: 'f-003', date: '2024-12-10', liters: 62, costPerLiter: 7.18, totalCost: 445.16, mileage: 44420, fullTank: true, station: 'OMV Bucuresti' },
      { id: 'f-004', date: '2024-12-07', liters: 55, costPerLiter: 7.22, totalCost: 397.10, mileage: 43980, fullTank: false, station: 'Mol Pipera' },
      { id: 'f-005', date: '2024-12-04', liters: 68, costPerLiter: 7.15, totalCost: 486.20, mileage: 43520, fullTank: true, station: 'OMV Bucuresti' },
    ]);

    setStats({
      totalDistanceKm: 45230,
      avgFuelConsumption: 9.2,
      totalFuelCost: 28500,
      totalMaintenanceCost: 5700,
      routesCompleted: 342,
      deliveriesCompleted: 4128,
      avgDeliveriesPerRoute: 12.1,
      utilizationPercent: 78,
    });
  };

  const handleChangeStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status actualizat cu succes');
        fetchVehicleDetails();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Eroare la actualizarea statusului');
      // Update locally for demo
      if (vehicle) {
        setVehicle({ ...vehicle, status: newStatus as VehicleDetail['status'] });
        toast.success('Status actualizat (demo)');
      }
    }
  };

  const handleDeleteVehicle = async () => {
    router.push(`/dashboard/fleet/vehicles/${vehicleId}/delete`);
  };

  const handleTrackVehicle = () => {
    if (vehicle?.currentLat && vehicle?.currentLng) {
      window.open(`https://www.google.com/maps?q=${vehicle.currentLat},${vehicle.currentLng}`, '_blank');
    } else {
      toast.error('Pozitia GPS nu este disponibila');
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntil = (date: string): number => {
    const today = new Date();
    const target = new Date(date);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (date?: string): { color: string; label: string } => {
    if (!date) return { color: 'text-gray-500', label: 'N/A' };
    const days = getDaysUntil(date);
    if (days < 0) return { color: 'text-red-600', label: 'Expirat' };
    if (days < 30) return { color: 'text-orange-600', label: `${days} zile` };
    if (days < 90) return { color: 'text-yellow-600', label: `${days} zile` };
    return { color: 'text-green-600', label: `${days} zile` };
  };

  // Chart data for fuel consumption
  const fuelChartData = fuelRecords.slice().reverse().map((record, index) => ({
    name: formatDate(record.date),
    consum: index > 0 ? ((record.liters / (record.mileage - (fuelRecords[fuelRecords.length - index]?.mileage || record.mileage - 400))) * 100).toFixed(1) : 9.2,
    cost: record.totalCost,
  }));

  // Utilization pie chart data
  const utilizationData = stats ? [
    { name: 'Utilizat', value: stats.utilizationPercent },
    { name: 'Disponibil', value: 100 - stats.utilizationPercent },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Vehicul negasit</h2>
        <p className="text-gray-500 mb-4">Vehiculul solicitat nu a fost gasit sau a fost sters.</p>
        <button
          onClick={() => router.push('/dashboard/fleet')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Inapoi la Flota
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/fleet')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{vehicle.licensePlate}</h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(vehicle.status)}`}>
                {getStatusLabel(vehicle.status)}
              </span>
            </div>
            <p className="text-gray-600">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchVehicleDetails}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Actualizeaza"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleTrackVehicle}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Navigation className="w-4 h-4" />
            Urmarire GPS
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Editeaza
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Gauge className="w-4 h-4" />
              Kilometraj
            </div>
            <div className="text-xl font-bold text-gray-900">{vehicle.mileage.toLocaleString()}</div>
            <div className="text-xs text-gray-500">km</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Fuel className="w-4 h-4" />
              Consum Mediu
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.avgFuelConsumption}</div>
            <div className="text-xs text-gray-500">L/100km</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Route className="w-4 h-4" />
              Rute
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.routesCompleted}</div>
            <div className="text-xs text-gray-500">finalizate</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Package className="w-4 h-4" />
              Livrari
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.deliveriesCompleted}</div>
            <div className="text-xs text-gray-500">total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Cost Combustibil
            </div>
            <div className="text-xl font-bold text-gray-900">{(stats.totalFuelCost / 1000).toFixed(1)}K</div>
            <div className="text-xs text-gray-500">RON total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Wrench className="w-4 h-4" />
              Cost Mentenanta
            </div>
            <div className="text-xl font-bold text-gray-900">{(stats.totalMaintenanceCost / 1000).toFixed(1)}K</div>
            <div className="text-xs text-gray-500">RON total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Utilizare
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.utilizationPercent}%</div>
            <div className="text-xs text-gray-500">din capacitate</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Activity className="w-4 h-4" />
              Media/Ruta
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.avgDeliveriesPerRoute}</div>
            <div className="text-xs text-gray-500">livrari</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Prezentare', icon: Truck },
            { id: 'maintenance', label: 'Mentenanta', icon: Wrench },
            { id: 'routes', label: 'Rute', icon: Route },
            { id: 'fuel', label: 'Combustibil', icon: Fuel },
            { id: 'documents', label: 'Documente', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Informatii Vehicul
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Marca / Model</p>
                  <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">An Fabricatie</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">VIN</p>
                  <p className="font-medium font-mono text-sm">{vehicle.vin || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tip Combustibil</p>
                  <p className="font-medium flex items-center gap-2">
                    {getFuelTypeIcon(vehicle.fuelType)}
                    {getStatusLabel(vehicle.fuelType)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacitate Rezervor</p>
                  <p className="font-medium">{vehicle.fuelCapacityLiters || 'N/A'} L</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nivel Combustibil</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          (vehicle.currentFuelLevel || 0) < 20 ? 'bg-red-500' :
                          (vehicle.currentFuelLevel || 0) < 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${vehicle.currentFuelLevel || 0}%` }}
                      />
                    </div>
                    <span className="font-medium">{vehicle.currentFuelLevel || 0}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacitate Maxima</p>
                  <p className="font-medium">{vehicle.maxPayloadKg?.toLocaleString() || 'N/A'} kg</p>
                </div>
                {vehicle.dimensions && (
                  <div>
                    <p className="text-sm text-gray-500">Dimensiuni (L x l x H)</p>
                    <p className="font-medium">
                      {vehicle.dimensions.lengthCm} x {vehicle.dimensions.widthCm} x {vehicle.dimensions.heightCm} cm
                    </p>
                  </div>
                )}
              </div>

              {vehicle.tags && vehicle.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Etichete</p>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {vehicle.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Note</p>
                  <p className="text-sm text-gray-700">{vehicle.notes}</p>
                </div>
              )}
            </div>

            {/* Assigned Driver */}
            {vehicle.assignedDriver && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-500" />
                  Sofer Alocat
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {vehicle.assignedDriver.firstName} {vehicle.assignedDriver.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{vehicle.assignedDriver.phone}</p>
                    <p className="text-xs text-gray-400">Permis: {vehicle.assignedDriver.licenseNumber}</p>
                  </div>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    Schimba Sofer
                  </button>
                </div>
              </div>
            )}

            {/* Utilization Chart */}
            {stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Utilizare Vehicul
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={utilizationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {utilizationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Utilizat ({stats.utilizationPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Disponibil ({100 - stats.utilizationPercent}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Actiuni Rapide
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleChangeStatus('AVAILABLE')}
                  disabled={vehicle.status === 'AVAILABLE'}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcheaza Disponibil
                </button>
                <button
                  onClick={() => handleChangeStatus('IN_USE')}
                  disabled={vehicle.status === 'IN_USE'}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  Marcheaza In Folosinta
                </button>
                <button
                  onClick={() => handleChangeStatus('MAINTENANCE')}
                  disabled={vehicle.status === 'MAINTENANCE'}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wrench className="w-4 h-4" />
                  Trimite la Mentenanta
                </button>
                <button
                  onClick={() => handleChangeStatus('OUT_OF_SERVICE')}
                  disabled={vehicle.status === 'OUT_OF_SERVICE'}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pause className="w-4 h-4" />
                  Scoate din Uz
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleDeleteVehicle}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Sterge Vehicul
                </button>
              </div>
            </div>

            {/* Document Expiry */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Documente & Expirari
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Asigurare RCA</p>
                    <p className="text-sm text-gray-500">
                      {vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : 'N/A'}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${getExpiryStatus(vehicle.insuranceExpiry).color}`}>
                    {getExpiryStatus(vehicle.insuranceExpiry).label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">ITP</p>
                    <p className="text-sm text-gray-500">
                      {vehicle.inspectionExpiry ? formatDate(vehicle.inspectionExpiry) : 'N/A'}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${getExpiryStatus(vehicle.inspectionExpiry).color}`}>
                    {getExpiryStatus(vehicle.inspectionExpiry).label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Inmatriculare</p>
                    <p className="text-sm text-gray-500">
                      {vehicle.registrationExpiry ? formatDate(vehicle.registrationExpiry) : 'N/A'}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${getExpiryStatus(vehicle.registrationExpiry).color}`}>
                    {getExpiryStatus(vehicle.registrationExpiry).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Value */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Valoare Vehicul
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pret Achizitie</span>
                  <span className="font-medium">{vehicle.purchasePrice?.toLocaleString() || 'N/A'} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data Achizitie</span>
                  <span className="font-medium">{vehicle.purchaseDate ? formatDate(vehicle.purchaseDate) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Valoare Curenta</span>
                  <span className="font-medium text-green-600">{vehicle.currentValue?.toLocaleString() || 'N/A'} EUR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Depreciere</span>
                  <span className="text-red-500">
                    -{vehicle.purchasePrice && vehicle.currentValue
                      ? ((1 - vehicle.currentValue / vehicle.purchasePrice) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Istoric Mentenanta</h3>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Wrench className="w-4 h-4" />
              Adauga Interventie
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kilometraj</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Furnizor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urmatoarea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {maintenance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{record.type}</p>
                        <p className="text-sm text-gray-500">{record.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.mileageAtService.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.cost.toLocaleString()} RON
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.provider || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.nextDue ? (
                        <span className={getDaysUntil(record.nextDue) < 30 ? 'text-orange-600' : 'text-gray-500'}>
                          {formatDate(record.nextDue)}
                          {record.nextDueMileage && ` / ${record.nextDueMileage.toLocaleString()} km`}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Istoric Rute</h3>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opriri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distanta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durata</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sofer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {routes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{route.routeName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(route.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.completedStops}/{route.stops}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.distanceKm} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(route.durationMinutes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {route.driverName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(route.status)}`}>
                        {getStatusLabel(route.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Inregistrari Combustibil</h3>
            <button
              onClick={() => setShowFuelModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Fuel className="w-4 h-4" />
              Adauga Alimentare
            </button>
          </div>

          {/* Fuel Consumption Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-medium text-gray-900 mb-4">Evolutie Cost Combustibil</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fuelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cost" stroke="#3B82F6" fill="#93C5FD" name="Cost (RON)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Litri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pret/L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kilometraj</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fuelRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.liters} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.costPerLiter.toFixed(2)} RON
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.totalCost.toFixed(2)} RON
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.mileage.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.station || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.fullTank ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Certificat Inmatriculare</h4>
                  <p className="text-sm text-gray-500">Talon auto</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Vizualizeaza / Incarca
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Polita RCA</h4>
                  <p className="text-sm text-gray-500">Asigurare obligatorie</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Vizualizeaza / Incarca
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Certificat ITP</h4>
                  <p className="text-sm text-gray-500">Inspectie tehnica periodica</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Vizualizeaza / Incarca
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Carte Service</h4>
                  <p className="text-sm text-gray-500">Istoric revizii</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Vizualizeaza / Incarca
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Polita CASCO</h4>
                  <p className="text-sm text-gray-500">Asigurare facultativa</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Vizualizeaza / Incarca
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Alte Documente</h4>
                  <p className="text-sm text-gray-500">Certificate, autorizatii</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Vizualizeaza / Incarca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
