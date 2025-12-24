'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Truck,
  MapPin,
  Fuel,
  Wrench,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  RefreshCw,
  Navigation,
  Calendar,
  TrendingUp,
  Users,
  Activity,
  Loader2,
  Zap,
  BarChart3,
  Route,
  Timer,
  DollarSign,
  Target,
  Play,
  Circle,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Map,
  Shield,
  Trash2,
  Eye,
  FileText,
  Download,
  PieChart
} from 'lucide-react';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  mileage: number;
  fuelType: string;
  maxPayloadKg?: number;
  currentLat?: number;
  currentLng?: number;
  assignedDriver?: { id: string; firstName: string; lastName: string };
}

interface FleetSummary {
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  maintenanceVehicles: number;
  todayRoutes: number;
  todayDeliveries: number;
  todayCompletedDeliveries: number;
  todayFailedDeliveries: number;
  monthlyFuelCost: number;
  monthlyMaintenanceCost: number;
}

interface RouteProgress {
  routeId: string;
  routeName: string;
  driverName: string;
  vehiclePlate: string;
  totalStops: number;
  completedStops: number;
  pendingStops: number;
  failedStops: number;
  status: string;
  currentLat?: number;
  currentLng?: number;
}

interface OptimizationResult {
  routeId: string;
  originalOrder: string[];
  optimizedOrder: string[];
  distanceSavedKm: number;
  timeSavedMinutes: number;
  fuelSavedLiters: number;
  applied: boolean;
  algorithm: string;
  originalDistanceKm?: number;
  optimizedDistanceKm?: number;
  improvementPercent?: number;
  message?: string;
}

interface BatchOptimizationResult {
  routesOptimized: number;
  totalDistanceSavedKm: number;
  totalTimeSavedMinutes: number;
  totalFuelSavedLiters: number;
  estimatedCostSavingsEur: number;
  results: OptimizationResult[];
}

interface DeliveryRoute {
  id: string;
  routeName: string;
  routeDate: string;
  vehicleId: string;
  driverId?: string;
  totalStops: number;
  completedStops: number;
  status: string;
  vehicle?: { licensePlate: string };
  driver?: { firstName: string; lastName: string };
}

interface VehicleTrackingInfo {
  vehicleId: string;
  licensePlate: string;
  driverName?: string;
  currentPosition: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    updatedAt: string;
  } | null;
  status: string;
  activeRoute?: {
    routeId: string;
    routeName: string;
    completedStops: number;
    totalStops: number;
    estimatedCompletion?: string;
  };
}

interface Geofence {
  id: string;
  name: string;
  description?: string;
  type: 'CIRCLE' | 'POLYGON';
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  deliveryZone?: string;
  isActive: boolean;
}

interface GeofenceEvent {
  geofenceId: string;
  geofenceName: string;
  vehicleId: string;
  licensePlate: string;
  eventType: 'ENTER' | 'EXIT';
  position: { lat: number; lng: number };
  occurredAt: string;
}

interface VehicleStatistics {
  totalDistanceKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  totalDrivingTimeMinutes: number;
  idleTimeMinutes: number;
  positionCount: number;
}

interface ReportType {
  type: string;
  name: string;
  description: string;
  exportFormats: string[];
}

interface FleetPerformanceReport {
  period: { from: string; to: string };
  summary: {
    totalRoutes: number;
    completedRoutes: number;
    partialRoutes: number;
    cancelledRoutes: number;
    completionRate: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    deliverySuccessRate: number;
    totalDistanceKm: number;
    avgDistancePerRouteKm: number;
  };
  byVehicle: Array<{
    vehicleId: string;
    licensePlate: string;
    routesCompleted: number;
    deliveriesCompleted: number;
    deliverySuccessRate: number;
    totalDistanceKm: number;
    avgDeliveriesPerRoute: number;
  }>;
  byDriver: Array<{
    driverId: string;
    driverName: string;
    routesCompleted: number;
    deliveriesCompleted: number;
    deliverySuccessRate: number;
    avgTimePerDeliveryMin: number;
  }>;
}

interface DriverPayoutReport {
  period: { from: string; to: string };
  summary: {
    totalDrivers: number;
    totalGrossEur: number;
    totalTaxWithholdingEur: number;
    totalNetEur: number;
    avgPayoutPerDriver: number;
    totalDeliveries: number;
    totalDistanceKm: number;
  };
  byDriver: Array<{
    driverId: string;
    driverName: string;
    routesCompleted: number;
    deliveries: number;
    parcels: number;
    distanceKm: number;
    grossPayEur: number;
    taxWithholdingEur: number;
    netPayEur: number;
    bonusesEur: number;
  }>;
}

interface MaintenanceSummary {
  totalVehicles: number;
  vehiclesNeedingService: number;
  overdueTasks: number;
  upcomingTasks7Days: number;
  upcomingTasks30Days: number;
  estimatedMonthlyMaintenanceCost: number;
  tuvExpiringThisMonth: number;
  insuranceExpiringThisMonth: number;
}

interface MaintenanceTask {
  id: string;
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  type: string;
  dueDate: string;
  dueMileage?: number;
  currentMileage?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCostEur?: number;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface MaintenanceAlert {
  vehicleId: string;
  licensePlate: string;
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
  message: string;
  dueDate?: string;
  daysRemaining?: number;
}

interface MaintenanceForecast {
  month: string;
  estimatedCostEur: number;
  maintenanceCount: number;
  details: Array<{ vehiclePlate: string; type: string; cost: number }>;
}

// Demo data functions for graceful degradation
const getMockFleetSummary = (): FleetSummary => ({
  totalVehicles: 24,
  availableVehicles: 8,
  inUseVehicles: 12,
  maintenanceVehicles: 4,
  todayRoutes: 15,
  todayDeliveries: 156,
  todayCompletedDeliveries: 128,
  todayFailedDeliveries: 3,
  monthlyFuelCost: 12500,
  monthlyMaintenanceCost: 3200,
});

const getMockVehicles = (): Vehicle[] => [
  {
    id: '1',
    licensePlate: 'B-123-ABC',
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2022,
    status: 'IN_USE',
    fuelType: 'DIESEL',
    mileage: 45000,
    maxPayloadKg: 1200,
    currentLat: 44.4268,
    currentLng: 26.1025,
    assignedDriver: { id: 'drv-1', firstName: 'Ion', lastName: 'Popescu' },
  },
  {
    id: '2',
    licensePlate: 'B-456-DEF',
    make: 'Volkswagen',
    model: 'Crafter',
    year: 2021,
    status: 'IN_USE',
    fuelType: 'DIESEL',
    mileage: 62000,
    maxPayloadKg: 1000,
    currentLat: 44.4368,
    currentLng: 26.0925,
    assignedDriver: { id: 'drv-2', firstName: 'Maria', lastName: 'Ionescu' },
  },
  {
    id: '3',
    licensePlate: 'B-789-GHI',
    make: 'Ford',
    model: 'Transit',
    year: 2023,
    status: 'MAINTENANCE',
    fuelType: 'DIESEL',
    mileage: 28000,
    maxPayloadKg: 1100,
  },
  {
    id: '4',
    licensePlate: 'B-321-JKL',
    make: 'Renault',
    model: 'Master',
    year: 2020,
    status: 'AVAILABLE',
    fuelType: 'DIESEL',
    mileage: 85000,
    maxPayloadKg: 1300,
  },
];

const getMockLiveRoutes = (): RouteProgress[] => [
  {
    routeId: 'route-1',
    routeName: 'Sector 1 - Dimineața',
    driverName: 'Ion Popescu',
    vehiclePlate: 'B-123-ABC',
    totalStops: 12,
    completedStops: 7,
    pendingStops: 5,
    failedStops: 0,
    status: 'IN_PROGRESS',
    currentLat: 44.4268,
    currentLng: 26.1025,
  },
  {
    routeId: 'route-2',
    routeName: 'Sector 3 - Centru',
    driverName: 'Maria Ionescu',
    vehiclePlate: 'B-456-DEF',
    totalStops: 8,
    completedStops: 3,
    pendingStops: 4,
    failedStops: 1,
    status: 'IN_PROGRESS',
    currentLat: 44.4368,
    currentLng: 26.0925,
  },
];

export default function FleetDashboardPage() {
  const router = useRouter();
  const t = useTranslations('fleet');
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [liveRoutes, setLiveRoutes] = useState<RouteProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'routes' | 'tracking' | 'optimization' | 'reports' | 'maintenance'>('overview');
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Route optimization state
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<BatchOptimizationResult | null>(null);
  const [selectedRouteForOptimization, setSelectedRouteForOptimization] = useState<string | null>(null);
  const [singleOptResult, setSingleOptResult] = useState<OptimizationResult | null>(null);

  // GPS Tracking state
  const [fleetTracking, setFleetTracking] = useState<VehicleTrackingInfo[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([]);
  const [selectedVehicleForStats, setSelectedVehicleForStats] = useState<string | null>(null);
  const [vehicleStats, setVehicleStats] = useState<VehicleStatistics | null>(null);
  const [trackingSubTab, setTrackingSubTab] = useState<'live' | 'geofences' | 'history'>('live');
  const [creatingMunichZones, setCreatingMunichZones] = useState(false);

  // Reports state
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string>('fleet_performance');
  const [reportDateRange, setReportDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [currentReport, setCurrentReport] = useState<FleetPerformanceReport | DriverPayoutReport | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  // Maintenance state
  const [maintenanceSummary, setMaintenanceSummary] = useState<MaintenanceSummary | null>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [maintenanceForecast, setMaintenanceForecast] = useState<MaintenanceForecast[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'overview' | 'scheduled' | 'alerts' | 'forecast'>('overview');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    fetchData();
    // Refresh live tracking every 30 seconds
    const interval = setInterval(fetchLiveRoutes, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchVehicles(), fetchLiveRoutes()]);
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        throw new Error('API unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch fleet summary:', err);
      setSummary(getMockFleetSummary());
    }
  };

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      } else {
        throw new Error('API unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setVehicles(getMockVehicles());
    }
  };

  const fetchLiveRoutes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/live-tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiveRoutes(data);
      } else {
        throw new Error('API unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch live routes:', err);
      setLiveRoutes(getMockLiveRoutes());
    }
  };

  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/routes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoutes(data);
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    }
  };

  const optimizeAllRoutes = async () => {
    setOptimizing(true);
    setOptimizationResults(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/optimize-all?autoApply=false`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOptimizationResults(data);
      }
    } catch (err) {
      console.error('Failed to optimize routes:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const optimizeSingleRoute = async (routeId: string, autoApply: boolean = false) => {
    setOptimizing(true);
    setSingleOptResult(null);
    setSelectedRouteForOptimization(routeId);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/routes/${routeId}/optimize?autoApply=${autoApply}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSingleOptResult(data);
      }
    } catch (err) {
      console.error('Failed to optimize route:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = async (routeId: string, optimizedOrder: string[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/routes/${routeId}/optimize/apply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optimizedOrder }),
      });
      if (res.ok) {
        // Refresh routes after applying
        fetchRoutes();
        setSingleOptResult(null);
        setSelectedRouteForOptimization(null);
      }
    } catch (err) {
      console.error('Failed to apply optimization:', err);
    }
  };

  // GPS Tracking Functions
  const fetchFleetTracking = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/gps/fleet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFleetTracking(data);
      }
    } catch (err) {
      console.error('Failed to fetch fleet tracking:', err);
    }
  };

  const fetchGeofences = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/geofences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGeofences(data);
      }
    } catch (err) {
      console.error('Failed to fetch geofences:', err);
    }
  };

  const fetchGeofenceEvents = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const today = new Date();
      const from = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const res = await fetch(`${API_URL}/api/v1/fleet/geofences/events?from=${from}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGeofenceEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch geofence events:', err);
    }
  };

  const createMunichZones = async () => {
    setCreatingMunichZones(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/geofences/munich-zones`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchGeofences();
      }
    } catch (err) {
      console.error('Failed to create Munich zones:', err);
    } finally {
      setCreatingMunichZones(false);
    }
  };

  const fetchVehicleStatistics = async (vehicleId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const to = new Date().toISOString();
      const res = await fetch(
        `${API_URL}/api/v1/fleet/gps/vehicles/${vehicleId}/statistics?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setVehicleStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch vehicle statistics:', err);
    }
  };

  const deleteGeofence = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/geofences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGeofences(geofences.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete geofence:', err);
    }
  };

  // Report Functions
  const fetchReportTypes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/reports/types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReportTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch report types:', err);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    setCurrentReport(null);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        from: reportDateRange.from,
        to: reportDateRange.to,
      });
      const res = await fetch(
        `${API_URL}/api/v1/fleet/reports/${selectedReportType.replace('_', '-')}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setCurrentReport(data);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const exportReport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        type: selectedReportType,
        from: reportDateRange.from,
        to: reportDateRange.to,
        format: exportFormat,
      });
      const res = await fetch(
        `${API_URL}/api/v1/fleet/reports/generate?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const result = await res.json();
        // Create download
        const blob = new Blob(
          [exportFormat === 'csv' ? result.data : JSON.stringify(result.data, null, 2)],
          { type: result.contentType }
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  };

  // Maintenance Functions
  const fetchMaintenanceData = async () => {
    setLoadingMaintenance(true);
    await Promise.all([
      fetchMaintenanceSummary(),
      fetchMaintenanceTasks(),
      fetchMaintenanceAlerts(),
      fetchMaintenanceForecast(),
    ]);
    setLoadingMaintenance(false);
  };

  const fetchMaintenanceSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/maintenance/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance summary:', err);
    }
  };

  const fetchMaintenanceTasks = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/maintenance/scheduled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance tasks:', err);
    }
  };

  const fetchMaintenanceAlerts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/maintenance/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance alerts:', err);
    }
  };

  const fetchMaintenanceForecast = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/maintenance/forecast?months=6`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceForecast(data);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance forecast:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'URGENT': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatMaintenanceType = (type: string) => {
    const labels: Record<string, string> = {
      OIL_CHANGE: 'Oil Change',
      BRAKE_SERVICE: 'Brake Service',
      TIRE_ROTATION: 'Tire Rotation',
      SCHEDULED_SERVICE: 'Scheduled Service',
      TUV_INSPECTION: 'TÜV Inspection',
      REPAIR: 'Repair',
      UNSCHEDULED_REPAIR: 'Unscheduled Repair',
      CLEANING: 'Cleaning',
      OTHER: 'Other',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'IN_USE': return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      case 'OUT_OF_SERVICE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRouteStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Vehicle action handlers
  const handleEditVehicle = (vehicle: Vehicle) => {
    router.push(`/dashboard/fleet/vehicles/${vehicle.id}/edit`);
  };

  const handleViewVehicleDetails = (vehicle: Vehicle) => {
    router.push(`/dashboard/fleet/vehicles/${vehicle.id}`);
  };

  const handleCreateRoute = () => {
    router.push('/dashboard/fleet/routes/new');
  };

  const handleScheduleMaintenance = (vehicle: Vehicle) => {
    router.push(`/dashboard/fleet/maintenance/schedule?vehicleId=${vehicle.id}&plate=${vehicle.licensePlate}`);
  };

  const handleAssignDriver = (vehicle: Vehicle) => {
    router.push(`/dashboard/fleet/vehicles/${vehicle.id}/assign-driver`);
  };

  const handleTrackFuelConsumption = (vehicle: Vehicle) => {
    router.push(`/dashboard/fleet/fuel/record?vehicleId=${vehicle.id}&plate=${vehicle.licensePlate}`);
  };

  const handleViewFleetReport = () => {
    setActiveTab('reports');
    setSelectedReportType('fleet_performance');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Fleet Management'}</h1>
          <p className="text-gray-500">{t('subtitle') || 'Manage your 10-van delivery fleet'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh') || 'Refresh'}
          </button>
          <button
            onClick={() => setShowAddVehicle(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addVehicle') || 'Add Vehicle'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'vehicles', 'routes', 'tracking', 'optimization', 'reports', 'maintenance'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                if (tab === 'optimization') fetchRoutes();
                if (tab === 'tracking') {
                  fetchFleetTracking();
                  fetchGeofences();
                  fetchGeofenceEvents();
                }
                if (tab === 'reports') {
                  fetchReportTypes();
                }
                if (tab === 'maintenance') {
                  fetchMaintenanceData();
                }
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' && (t('tabOverview') || 'Overview')}
              {tab === 'vehicles' && (t('tabVehicles') || 'Vehicles')}
              {tab === 'routes' && (t('tabRoutes') || 'Routes')}
              {tab === 'tracking' && (t('tabTracking') || 'Live Tracking')}
              {tab === 'optimization' && (
                <span className="flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  {t('tabOptimization') || 'AI Optimization'}
                </span>
              )}
              {tab === 'reports' && (
                <span className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  {t('tabReports') || 'Reports'}
                </span>
              )}
              {tab === 'maintenance' && (
                <span className="flex items-center">
                  <Wrench className="h-4 w-4 mr-1" />
                  {t('tabMaintenance') || 'Maintenance'}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Truck className="h-10 w-10 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">{t('totalVehicles') || 'Total Vehicles'}</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalVehicles}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  {summary.availableVehicles} {t('available') || 'Available'}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {summary.inUseVehicles} {t('inUse') || 'In Use'}
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  {summary.maintenanceVehicles} {t('maintenance') || 'Maintenance'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Package className="h-10 w-10 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">{t('todayDeliveries') || "Today's Deliveries"}</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.todayDeliveries}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {summary.todayCompletedDeliveries} {t('completed') || 'Completed'}
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {summary.todayFailedDeliveries} {t('failed') || 'Failed'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Fuel className="h-10 w-10 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">{t('monthlyFuel') || 'Monthly Fuel Cost'}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.monthlyFuelCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Wrench className="h-10 w-10 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">{t('monthlyMaintenance') || 'Monthly Maintenance'}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.monthlyMaintenanceCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Routes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-500" />
                {t('activeRoutes') || 'Active Routes Today'}
              </h2>
            </div>
            <div className="p-6">
              {liveRoutes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">{t('noActiveRoutes') || 'No active routes today'}</p>
              ) : (
                <div className="space-y-4">
                  {liveRoutes.map((route) => (
                    <div key={route.routeId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Navigation className="h-5 w-5 text-blue-500 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{route.routeName}</p>
                          <p className="text-sm text-gray-500">
                            {route.driverName} - {route.vehiclePlate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {route.completedStops}/{route.totalStops} {t('stops') || 'stops'}
                          </p>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${(route.completedStops / route.totalStops) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRouteStatusColor(route.status)}`}>
                          {route.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('vehicle') || 'Vehicle'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('licensePlate') || 'License Plate'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('driver') || 'Driver'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('mileage') || 'Mileage'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status') || 'Status'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {t('noVehicles') || 'No vehicles found. Add your first vehicle to get started.'}
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{vehicle.make} {vehicle.model}</p>
                          <p className="text-sm text-gray-500">{vehicle.year} - {vehicle.fuelType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-medium">{vehicle.licensePlate}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vehicle.assignedDriver ? (
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-2" />
                          {vehicle.assignedDriver.firstName} {vehicle.assignedDriver.lastName}
                        </div>
                      ) : (
                        <span className="text-gray-400">{t('unassigned') || 'Unassigned'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {vehicle.mileage?.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => handleEditVehicle(vehicle)} className="text-blue-600 hover:text-blue-800 mr-3">{t('edit') || 'Edit'}</button>
                      <button onClick={() => handleViewVehicleDetails(vehicle)} className="text-gray-600 hover:text-gray-800 mr-3">{t('details') || 'Details'}</button>
                      <button onClick={() => handleScheduleMaintenance(vehicle)} className="text-yellow-600 hover:text-yellow-800 mr-3" title="Schedule Maintenance">
                        <Wrench className="h-4 w-4 inline" />
                      </button>
                      <button onClick={() => handleAssignDriver(vehicle)} className="text-purple-600 hover:text-purple-800 mr-3" title="Assign Driver">
                        <Users className="h-4 w-4 inline" />
                      </button>
                      <button onClick={() => handleTrackFuelConsumption(vehicle)} className="text-green-600 hover:text-green-800" title="Track Fuel">
                        <Fuel className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Routes Tab */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">{t('deliveryRoutes') || 'Delivery Routes'}</h2>
            <button onClick={handleCreateRoute} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              {t('createRoute') || 'Create Route'}
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{t('selectDateForRoutes') || 'Select a date to view routes'}</p>
          </div>
        </div>
      )}

      {/* Live Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Tracking Sub-tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'live', label: t('livePositions') || 'Live Positions', icon: Navigation },
                  { id: 'geofences', label: t('geofences') || 'Geofences', icon: Shield },
                  { id: 'history', label: t('eventHistory') || 'Event History', icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTrackingSubTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      trackingSubTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Live Positions Sub-tab */}
            {trackingSubTab === 'live' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-500" />
                    {t('realTimeFleetTracking') || 'Real-Time Fleet Tracking'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 flex items-center">
                      <Circle className="h-2 w-2 text-green-500 mr-2 animate-pulse" />
                      {t('liveUpdates') || 'Live Updates'}
                    </span>
                    <button
                      onClick={fetchFleetTracking}
                      className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {t('refresh') || 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Map placeholder with GPS points */}
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-80 relative mb-6 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Map className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">{t('interactiveMapView') || 'Interactive Map View'}</p>
                      <p className="text-sm text-gray-400">{t('leafletIntegration') || 'Leaflet/MapBox integration ready'}</p>
                    </div>
                  </div>
                  {/* Simulated GPS points */}
                  {fleetTracking.filter(v => v.currentPosition).map((vehicle, idx) => (
                    <div
                      key={vehicle.vehicleId}
                      className="absolute"
                      style={{
                        top: `${20 + idx * 15}%`,
                        left: `${30 + idx * 10}%`,
                      }}
                    >
                      <div className="relative">
                        <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {vehicle.licensePlate}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vehicle Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fleetTracking.map((vehicle) => (
                    <div
                      key={vehicle.vehicleId}
                      className={`rounded-lg p-4 border-2 ${
                        vehicle.currentPosition ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            vehicle.currentPosition ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`} />
                          <span className="font-bold">{vehicle.licensePlate}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(vehicle.status)}`}>
                          {vehicle.status}
                        </span>
                      </div>

                      {vehicle.driverName && (
                        <p className="text-sm text-gray-600 mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {vehicle.driverName}
                        </p>
                      )}

                      {vehicle.currentPosition ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>{t('coordinates') || 'Coordinates'}:</span>
                            <span className="font-mono">
                              {vehicle.currentPosition.latitude.toFixed(4)}, {vehicle.currentPosition.longitude.toFixed(4)}
                            </span>
                          </div>
                          {vehicle.currentPosition.speed !== undefined && (
                            <div className="flex justify-between text-gray-600">
                              <span className="flex items-center">
                                <Gauge className="h-4 w-4 mr-1" />
                                {t('speed') || 'Speed'}:
                              </span>
                              <span className="font-semibold">{vehicle.currentPosition.speed} km/h</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            {t('updated') || 'Updated'}: {new Date(vehicle.currentPosition.updatedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">{t('noGpsSignal') || 'No GPS signal'}</p>
                      )}

                      {vehicle.activeRoute && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{vehicle.activeRoute.routeName}</span>
                            <span className="font-medium">
                              {vehicle.activeRoute.completedStops}/{vehicle.activeRoute.totalStops}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${(vehicle.activeRoute.completedStops / vehicle.activeRoute.totalStops) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedVehicleForStats(vehicle.vehicleId);
                          fetchVehicleStatistics(vehicle.vehicleId);
                        }}
                        className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('viewStatistics') || 'View Statistics'}
                      </button>
                    </div>
                  ))}

                  {fleetTracking.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-gray-500">
                      <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>{t('noVehiclesTracking') || 'No vehicles with GPS data'}</p>
                    </div>
                  )}
                </div>

                {/* Vehicle Statistics Modal */}
                {selectedVehicleForStats && vehicleStats && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                      <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-lg font-semibold">{t('vehicleStatistics') || 'Vehicle Statistics (This Month)'}</h3>
                        <button onClick={() => setSelectedVehicleForStats(null)} className="text-gray-400 hover:text-gray-600">
                          &times;
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">{t('totalDistance') || 'Total Distance'}</p>
                            <p className="text-2xl font-bold text-blue-700">{vehicleStats.totalDistanceKm} km</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">{t('avgSpeed') || 'Avg Speed'}</p>
                            <p className="text-2xl font-bold text-green-700">{vehicleStats.averageSpeedKmh} km/h</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">{t('maxSpeed') || 'Max Speed'}</p>
                            <p className="text-2xl font-bold text-orange-700">{vehicleStats.maxSpeedKmh} km/h</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">{t('drivingTime') || 'Driving Time'}</p>
                            <p className="text-2xl font-bold text-purple-700">{Math.round(vehicleStats.totalDrivingTimeMinutes / 60)}h</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('idleTime') || 'Idle Time'}: {vehicleStats.idleTimeMinutes} min •
                          {t('dataPoints') || 'Data Points'}: {vehicleStats.positionCount}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Geofences Sub-tab */}
            {trackingSubTab === 'geofences' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-500" />
                    {t('geofenceManagement') || 'Geofence Management'}
                  </h2>
                  <button
                    onClick={createMunichZones}
                    disabled={creatingMunichZones}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  >
                    {creatingMunichZones ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {t('createMunichZones') || 'Create Munich Zones'}
                  </button>
                </div>

                {geofences.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">{t('noGeofences') || 'No geofences configured'}</p>
                    <p className="text-sm text-gray-400">
                      {t('geofenceHelp') || 'Click "Create Munich Zones" to add predefined Munich delivery zones'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {geofences.map((geofence) => (
                      <div key={geofence.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                              geofence.type === 'CIRCLE' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              {geofence.type === 'CIRCLE' ? (
                                <Circle className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Map className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{geofence.name}</p>
                              <p className="text-xs text-gray-500">{geofence.type}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteGeofence(geofence.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {geofence.description && (
                          <p className="text-sm text-gray-600 mb-2">{geofence.description}</p>
                        )}

                        {geofence.type === 'CIRCLE' && geofence.radiusMeters && (
                          <div className="text-sm text-gray-500">
                            <p>{t('radius') || 'Radius'}: {geofence.radiusMeters}m</p>
                            {geofence.centerLat && geofence.centerLng && (
                              <p className="font-mono text-xs">
                                {geofence.centerLat.toFixed(4)}, {geofence.centerLng.toFixed(4)}
                              </p>
                            )}
                          </div>
                        )}

                        {geofence.deliveryZone && (
                          <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            {geofence.deliveryZone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Event History Sub-tab */}
            {trackingSubTab === 'history' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-orange-500" />
                    {t('geofenceEvents') || 'Geofence Events Today'}
                  </h2>
                  <button
                    onClick={fetchGeofenceEvents}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t('refresh') || 'Refresh'}
                  </button>
                </div>

                {geofenceEvents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>{t('noGeofenceEvents') || 'No geofence events today'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {geofenceEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          event.eventType === 'ENTER' ? 'bg-green-50' : 'bg-orange-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                            event.eventType === 'ENTER' ? 'bg-green-100' : 'bg-orange-100'
                          }`}>
                            {event.eventType === 'ENTER' ? (
                              <ArrowRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowLeft className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              <span className="text-gray-900">{event.licensePlate}</span>
                              <span className="text-gray-500 mx-2">
                                {event.eventType === 'ENTER' ? t('entered') || 'entered' : t('exited') || 'exited'}
                              </span>
                              <span className="text-purple-600">{event.geofenceName}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(event.occurredAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 font-mono">
                          {event.position.lat.toFixed(4)}, {event.position.lng.toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Optimization Tab */}
      {activeTab === 'optimization' && (
        <div className="space-y-6">
          {/* Optimization Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Zap className="h-6 w-6 mr-2" />
                  {t('aiRouteOptimization') || 'AI Route Optimization'}
                </h2>
                <p className="mt-2 text-purple-100">
                  {t('optimizationDescription') || 'Optimize delivery routes using AI algorithms to reduce distance, time, and fuel consumption.'}
                </p>
              </div>
              <button
                onClick={optimizeAllRoutes}
                disabled={optimizing}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 disabled:opacity-50 flex items-center"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('optimizing') || 'Optimizing...'}
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    {t('optimizeAllRoutes') || 'Optimize All Routes'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Batch Optimization Results */}
          {optimizationResults && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-500" />
                {t('optimizationResults') || 'Optimization Results'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Route className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">{t('routesOptimized') || 'Routes Optimized'}</p>
                      <p className="text-2xl font-bold text-green-700">{optimizationResults.routesOptimized}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Navigation className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">{t('distanceSaved') || 'Distance Saved'}</p>
                      <p className="text-2xl font-bold text-blue-700">{optimizationResults.totalDistanceSavedKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Timer className="h-8 w-8 text-purple-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">{t('timeSaved') || 'Time Saved'}</p>
                      <p className="text-2xl font-bold text-purple-700">{optimizationResults.totalTimeSavedMinutes} min</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">{t('costSavings') || 'Cost Savings'}</p>
                      <p className="text-2xl font-bold text-yellow-700">€{optimizationResults.estimatedCostSavingsEur.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center">
                <Fuel className="h-4 w-4 mr-1" />
                {t('fuelSaved') || 'Fuel Saved'}: {optimizationResults.totalFuelSavedLiters.toFixed(1)} L
              </div>
            </div>
          )}

          {/* Routes List for Optimization */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">{t('routesToOptimize') || 'Routes Available for Optimization'}</h3>
            </div>
            <div className="divide-y">
              {routes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Route className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('noRoutes') || 'No routes available'}</p>
                </div>
              ) : (
                routes.filter(r => r.status === 'PLANNED').map((route) => (
                  <div key={route.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <Route className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{route.routeName || `Route ${route.id.slice(-6)}`}</p>
                          <p className="text-sm text-gray-500">
                            {route.vehicle?.licensePlate} • {route.totalStops} {t('stops') || 'stops'}
                            {route.driver && ` • ${route.driver.firstName} ${route.driver.lastName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${getRouteStatusColor(route.status)}`}>
                          {route.status}
                        </span>
                        <button
                          onClick={() => optimizeSingleRoute(route.id)}
                          disabled={optimizing && selectedRouteForOptimization === route.id}
                          className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 disabled:opacity-50 flex items-center text-sm"
                        >
                          {optimizing && selectedRouteForOptimization === route.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4 mr-1" />
                          )}
                          {t('optimize') || 'Optimize'}
                        </button>
                      </div>
                    </div>

                    {/* Single Route Optimization Result */}
                    {singleOptResult && selectedRouteForOptimization === route.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-700">
                            {t('optimizationResult') || 'Optimization Result'}
                          </span>
                          <span className="text-sm text-gray-500">
                            Algorithm: {singleOptResult.algorithm}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">{t('improvement') || 'Improvement'}</p>
                            <p className="font-bold text-green-600">{singleOptResult.improvementPercent?.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">{t('distanceSaved') || 'Distance'}</p>
                            <p className="font-bold">{singleOptResult.distanceSavedKm.toFixed(1)} km</p>
                          </div>
                          <div>
                            <p className="text-gray-500">{t('timeSaved') || 'Time'}</p>
                            <p className="font-bold">{singleOptResult.timeSavedMinutes} min</p>
                          </div>
                          <div>
                            <p className="text-gray-500">{t('fuelSaved') || 'Fuel'}</p>
                            <p className="font-bold">{singleOptResult.fuelSavedLiters.toFixed(2)} L</p>
                          </div>
                        </div>
                        {!singleOptResult.applied && (singleOptResult.improvementPercent || 0) > 0 && (
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => applyOptimization(route.id, singleOptResult.optimizedOrder)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('applyOptimization') || 'Apply Optimization'}
                            </button>
                            <button
                              onClick={() => {
                                setSingleOptResult(null);
                                setSelectedRouteForOptimization(null);
                              }}
                              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                            >
                              {t('dismiss') || 'Dismiss'}
                            </button>
                          </div>
                        )}
                        {singleOptResult.message && (
                          <p className="mt-2 text-sm text-gray-500">{singleOptResult.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Algorithm Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{t('algorithmsUsed') || 'Optimization Algorithms'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-blue-600">Nearest Neighbor + 2-Opt</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {t('nnDescription') || 'Fast heuristic that builds routes by always visiting the nearest unvisited stop, then improves with local optimization.'}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-purple-600">Genetic Algorithm</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {t('gaDescription') || 'Evolutionary approach that evolves a population of route solutions over generations to find optimal paths.'}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-orange-600">Simulated Annealing</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {t('saDescription') || 'Probabilistic technique that explores route variations, accepting worse solutions early to escape local optima.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Selection Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <BarChart3 className="h-6 w-6 mr-2" />
                  {t('fleetReports') || 'Fleet Reports & Analytics'}
                </h2>
                <p className="mt-2 text-blue-100">
                  {t('reportsDescription') || 'Generate comprehensive fleet performance, fuel, maintenance, and payout reports.'}
                </p>
              </div>
            </div>
          </div>

          {/* Report Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reportType') || 'Report Type'}
                </label>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="fleet_performance">{t('fleetPerformance') || 'Fleet Performance'}</option>
                  <option value="fuel_consumption">{t('fuelConsumption') || 'Fuel Consumption'}</option>
                  <option value="vehicle_utilization">{t('vehicleUtilization') || 'Vehicle Utilization'}</option>
                  <option value="maintenance_cost">{t('maintenanceCost') || 'Maintenance Cost'}</option>
                  <option value="driver_payout">{t('driverPayout') || 'Driver Payout'}</option>
                  <option value="courier_reconciliation">{t('courierReconciliation') || 'Courier Reconciliation'}</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fromDate') || 'From'}
                </label>
                <input
                  type="date"
                  value={reportDateRange.from}
                  onChange={(e) => setReportDateRange({ ...reportDateRange, from: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('toDate') || 'To'}
                </label>
                <input
                  type="date"
                  value={reportDateRange.to}
                  onChange={(e) => setReportDateRange({ ...reportDateRange, to: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              {/* Generate Button */}
              <div className="flex items-end gap-2">
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {generatingReport ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <PieChart className="h-4 w-4 mr-2" />
                      {t('generate') || 'Generate'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Report Display */}
          {currentReport && (
            <div className="bg-white rounded-lg shadow">
              {/* Report Header */}
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedReportType === 'fleet_performance' && (t('fleetPerformanceReport') || 'Fleet Performance Report')}
                    {selectedReportType === 'driver_payout' && (t('driverPayoutReport') || 'Driver Payout Report')}
                    {selectedReportType === 'fuel_consumption' && (t('fuelConsumptionReport') || 'Fuel Consumption Report')}
                    {selectedReportType === 'vehicle_utilization' && (t('vehicleUtilizationReport') || 'Vehicle Utilization Report')}
                    {selectedReportType === 'maintenance_cost' && (t('maintenanceCostReport') || 'Maintenance Cost Report')}
                    {selectedReportType === 'courier_reconciliation' && (t('courierReconciliationReport') || 'Courier Reconciliation Report')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {currentReport.period.from} - {currentReport.period.to}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                  <button
                    onClick={exportReport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('export') || 'Export'}
                  </button>
                </div>
              </div>

              {/* Fleet Performance Report Content */}
              {selectedReportType === 'fleet_performance' && 'summary' in currentReport && 'completionRate' in (currentReport as FleetPerformanceReport).summary && (
                <div className="p-6 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('totalRoutes') || 'Total Routes'}</p>
                      <p className="text-2xl font-bold text-blue-700">{(currentReport as FleetPerformanceReport).summary.totalRoutes}</p>
                      <p className="text-sm text-blue-600">
                        {(currentReport as FleetPerformanceReport).summary.completionRate}% {t('completionRate') || 'completed'}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('totalDeliveries') || 'Total Deliveries'}</p>
                      <p className="text-2xl font-bold text-green-700">{(currentReport as FleetPerformanceReport).summary.totalDeliveries}</p>
                      <p className="text-sm text-green-600">
                        {(currentReport as FleetPerformanceReport).summary.deliverySuccessRate}% {t('successRate') || 'success rate'}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('totalDistance') || 'Total Distance'}</p>
                      <p className="text-2xl font-bold text-purple-700">{(currentReport as FleetPerformanceReport).summary.totalDistanceKm} km</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('avgDistancePerRoute') || 'Avg per Route'}</p>
                      <p className="text-2xl font-bold text-orange-700">{(currentReport as FleetPerformanceReport).summary.avgDistancePerRouteKm} km</p>
                    </div>
                  </div>

                  {/* By Vehicle Table */}
                  {(currentReport as FleetPerformanceReport).byVehicle.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        {t('performanceByVehicle') || 'Performance by Vehicle'}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">{t('vehicle') || 'Vehicle'}</th>
                              <th className="px-4 py-2 text-right">{t('routes') || 'Routes'}</th>
                              <th className="px-4 py-2 text-right">{t('deliveries') || 'Deliveries'}</th>
                              <th className="px-4 py-2 text-right">{t('successRate') || 'Success Rate'}</th>
                              <th className="px-4 py-2 text-right">{t('distance') || 'Distance'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(currentReport as FleetPerformanceReport).byVehicle.map((v) => (
                              <tr key={v.vehicleId}>
                                <td className="px-4 py-2 font-medium">{v.licensePlate}</td>
                                <td className="px-4 py-2 text-right">{v.routesCompleted}</td>
                                <td className="px-4 py-2 text-right">{v.deliveriesCompleted}</td>
                                <td className="px-4 py-2 text-right">
                                  <span className={v.deliverySuccessRate >= 90 ? 'text-green-600' : v.deliverySuccessRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                                    {v.deliverySuccessRate}%
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right">{v.totalDistanceKm} km</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* By Driver Table */}
                  {(currentReport as FleetPerformanceReport).byDriver.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {t('performanceByDriver') || 'Performance by Driver'}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">{t('driver') || 'Driver'}</th>
                              <th className="px-4 py-2 text-right">{t('routes') || 'Routes'}</th>
                              <th className="px-4 py-2 text-right">{t('deliveries') || 'Deliveries'}</th>
                              <th className="px-4 py-2 text-right">{t('successRate') || 'Success Rate'}</th>
                              <th className="px-4 py-2 text-right">{t('avgTimePerDelivery') || 'Avg Time/Delivery'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(currentReport as FleetPerformanceReport).byDriver.map((d) => (
                              <tr key={d.driverId}>
                                <td className="px-4 py-2 font-medium">{d.driverName}</td>
                                <td className="px-4 py-2 text-right">{d.routesCompleted}</td>
                                <td className="px-4 py-2 text-right">{d.deliveriesCompleted}</td>
                                <td className="px-4 py-2 text-right">
                                  <span className={d.deliverySuccessRate >= 90 ? 'text-green-600' : d.deliverySuccessRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                                    {d.deliverySuccessRate}%
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right">{d.avgTimePerDeliveryMin} min</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Driver Payout Report Content */}
              {selectedReportType === 'driver_payout' && 'summary' in currentReport && 'totalGrossEur' in (currentReport as DriverPayoutReport).summary && (
                <div className="p-6 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('totalDrivers') || 'Total Drivers'}</p>
                      <p className="text-2xl font-bold text-blue-700">{(currentReport as DriverPayoutReport).summary.totalDrivers}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('totalGross') || 'Total Gross'}</p>
                      <p className="text-2xl font-bold text-green-700">€{(currentReport as DriverPayoutReport).summary.totalGrossEur.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('taxWithholding') || 'Tax Withholding (19%)'}</p>
                      <p className="text-2xl font-bold text-red-700">€{(currentReport as DriverPayoutReport).summary.totalTaxWithholdingEur.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">{t('totalNet') || 'Total Net'}</p>
                      <p className="text-2xl font-bold text-purple-700">€{(currentReport as DriverPayoutReport).summary.totalNetEur.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Driver Payout Table */}
                  {(currentReport as DriverPayoutReport).byDriver.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        {t('payoutByDriver') || 'Payout by Driver'}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">{t('driver') || 'Driver'}</th>
                              <th className="px-4 py-2 text-right">{t('routes') || 'Routes'}</th>
                              <th className="px-4 py-2 text-right">{t('deliveries') || 'Deliveries'}</th>
                              <th className="px-4 py-2 text-right">{t('parcels') || 'Parcels'}</th>
                              <th className="px-4 py-2 text-right">{t('distance') || 'Distance'}</th>
                              <th className="px-4 py-2 text-right">{t('gross') || 'Gross'}</th>
                              <th className="px-4 py-2 text-right">{t('tax') || 'Tax'}</th>
                              <th className="px-4 py-2 text-right">{t('net') || 'Net'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(currentReport as DriverPayoutReport).byDriver.map((d) => (
                              <tr key={d.driverId}>
                                <td className="px-4 py-2 font-medium">{d.driverName}</td>
                                <td className="px-4 py-2 text-right">{d.routesCompleted}</td>
                                <td className="px-4 py-2 text-right">{d.deliveries}</td>
                                <td className="px-4 py-2 text-right">{d.parcels}</td>
                                <td className="px-4 py-2 text-right">{d.distanceKm} km</td>
                                <td className="px-4 py-2 text-right text-green-600">€{d.grossPayEur.toFixed(2)}</td>
                                <td className="px-4 py-2 text-right text-red-600">€{d.taxWithholdingEur.toFixed(2)}</td>
                                <td className="px-4 py-2 text-right font-semibold text-purple-600">€{d.netPayEur.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generic Report Fallback */}
              {!['fleet_performance', 'driver_payout'].includes(selectedReportType) && (
                <div className="p-6">
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(currentReport, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!currentReport && !generatingReport && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noReportGenerated') || 'No Report Generated'}</h3>
              <p className="text-gray-500">
                {t('selectReportTypeAndDateRange') || 'Select a report type and date range, then click Generate to create a report.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {loadingMaintenance ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Maintenance Summary Cards */}
              {maintenanceSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">{t('overdueTasks') || 'Overdue Tasks'}</p>
                        <p className="text-2xl font-bold text-red-600">{maintenanceSummary.overdueTasks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">{t('upcoming7Days') || 'Due in 7 Days'}</p>
                        <p className="text-2xl font-bold text-orange-600">{maintenanceSummary.upcomingTasks7Days}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Shield className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">{t('tuvExpiring') || 'TÜV Expiring'}</p>
                        <p className="text-2xl font-bold text-yellow-600">{maintenanceSummary.tuvExpiringThisMonth}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">{t('estimatedMonthlyCost') || 'Est. Monthly Cost'}</p>
                        <p className="text-2xl font-bold text-purple-600">
                          €{maintenanceSummary.estimatedMonthlyMaintenanceCost.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tabs */}
              <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-4 px-4">
                    {[
                      { key: 'overview', label: t('maintenanceOverview') || 'Overview' },
                      { key: 'scheduled', label: t('scheduledTasks') || 'Scheduled Tasks' },
                      { key: 'alerts', label: t('alerts') || 'Alerts' },
                      { key: 'forecast', label: t('costForecast') || 'Cost Forecast' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setMaintenanceSubTab(tab.key as any)}
                        className={`py-3 px-3 border-b-2 font-medium text-sm ${
                          maintenanceSubTab === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Overview Sub-tab */}
                {maintenanceSubTab === 'overview' && maintenanceSummary && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{t('fleetStatus') || 'Fleet Status'}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('totalVehicles') || 'Total Vehicles'}</span>
                            <span className="font-medium">{maintenanceSummary.totalVehicles}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('needingService') || 'Needing Service'}</span>
                            <span className="font-medium text-orange-600">{maintenanceSummary.vehiclesNeedingService}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('insuranceExpiring') || 'Insurance Expiring'}</span>
                            <span className="font-medium text-yellow-600">{maintenanceSummary.insuranceExpiringThisMonth}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{t('upcomingTasks') || 'Upcoming Tasks'}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('overdue') || 'Overdue'}</span>
                            <span className="font-medium text-red-600">{maintenanceSummary.overdueTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('next7Days') || 'Next 7 Days'}</span>
                            <span className="font-medium text-orange-600">{maintenanceSummary.upcomingTasks7Days}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('next30Days') || 'Next 30 Days'}</span>
                            <span className="font-medium text-yellow-600">{maintenanceSummary.upcomingTasks30Days}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{t('compliance') || 'Compliance'}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('tuvExpiring') || 'TÜV Expiring'}</span>
                            <span className="font-medium">{maintenanceSummary.tuvExpiringThisMonth}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('insuranceExpiring') || 'Insurance Expiring'}</span>
                            <span className="font-medium">{maintenanceSummary.insuranceExpiringThisMonth}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Priority Tasks */}
                    {maintenanceTasks.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">{t('priorityTasks') || 'Priority Tasks'}</h4>
                        <div className="space-y-2">
                          {maintenanceTasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className="ml-3 font-medium">{task.licensePlate}</span>
                                <span className="ml-2 text-gray-500">{formatMaintenanceType(task.type)}</span>
                              </div>
                              <div className="text-right">
                                <span className={task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                  {task.isOverdue ? `${Math.abs(task.daysUntilDue)} days overdue` : `${task.daysUntilDue} days`}
                                </span>
                                {task.estimatedCostEur && (
                                  <span className="ml-2 text-gray-500">€{task.estimatedCostEur}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Scheduled Tasks Sub-tab */}
                {maintenanceSubTab === 'scheduled' && (
                  <div className="p-6">
                    {maintenanceTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>{t('noScheduledTasks') || 'No scheduled maintenance tasks'}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left">{t('vehicle') || 'Vehicle'}</th>
                              <th className="px-4 py-3 text-left">{t('type') || 'Type'}</th>
                              <th className="px-4 py-3 text-left">{t('dueDate') || 'Due Date'}</th>
                              <th className="px-4 py-3 text-left">{t('priority') || 'Priority'}</th>
                              <th className="px-4 py-3 text-right">{t('estimatedCost') || 'Est. Cost'}</th>
                              <th className="px-4 py-3 text-left">{t('status') || 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {maintenanceTasks.map((task) => (
                              <tr key={task.id} className={task.isOverdue ? 'bg-red-50' : ''}>
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium">{task.licensePlate}</p>
                                    <p className="text-gray-500 text-xs">{task.make} {task.model}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">{formatMaintenanceType(task.type)}</td>
                                <td className="px-4 py-3">
                                  <div>
                                    <p>{new Date(task.dueDate).toLocaleDateString('de-DE')}</p>
                                    {task.dueMileage && (
                                      <p className="text-gray-500 text-xs">
                                        {task.currentMileage?.toLocaleString()} / {task.dueMileage.toLocaleString()} km
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {task.estimatedCostEur ? `€${task.estimatedCostEur}` : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  {task.isOverdue ? (
                                    <span className="text-red-600 font-medium flex items-center">
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      {Math.abs(task.daysUntilDue)}d overdue
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">{task.daysUntilDue}d remaining</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Alerts Sub-tab */}
                {maintenanceSubTab === 'alerts' && (
                  <div className="p-6">
                    {maintenanceAlerts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                        <p>{t('noAlerts') || 'No maintenance alerts - all vehicles in good condition!'}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {maintenanceAlerts.map((alert, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center">
                                {alert.severity === 'CRITICAL' && <AlertCircle className="h-5 w-5 mr-2 text-red-600" />}
                                {alert.severity === 'URGENT' && <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />}
                                {alert.severity === 'WARNING' && <Clock className="h-5 w-5 mr-2 text-yellow-600" />}
                                {alert.severity === 'INFO' && <Activity className="h-5 w-5 mr-2 text-blue-600" />}
                                <div>
                                  <p className="font-semibold">{alert.licensePlate}</p>
                                  <p className="text-sm">{alert.message}</p>
                                </div>
                              </div>
                              <span className="text-xs font-medium uppercase">{alert.alertType.replace('_', ' ')}</span>
                            </div>
                            {alert.daysRemaining !== undefined && (
                              <p className="text-xs mt-2 opacity-75">
                                {alert.daysRemaining > 0
                                  ? `${alert.daysRemaining} days remaining`
                                  : `${Math.abs(alert.daysRemaining)} days overdue`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cost Forecast Sub-tab */}
                {maintenanceSubTab === 'forecast' && (
                  <div className="p-6">
                    {maintenanceForecast.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>{t('noForecast') || 'No forecast data available'}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-6 gap-2">
                          {maintenanceForecast.map((month) => (
                            <div key={month.month} className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500">{month.month}</p>
                              <p className="text-lg font-bold text-purple-600">€{month.estimatedCostEur}</p>
                              <p className="text-xs text-gray-400">{month.maintenanceCount} tasks</p>
                            </div>
                          ))}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-3">{t('forecastDetails') || 'Forecast Details'}</h4>
                          <div className="space-y-2">
                            {maintenanceForecast
                              .filter(m => m.details.length > 0)
                              .flatMap(m => m.details.map((d, i) => ({
                                ...d,
                                month: m.month,
                                key: `${m.month}-${i}`
                              })))
                              .slice(0, 10)
                              .map((detail) => (
                                <div key={detail.key} className="flex justify-between text-sm py-1 border-b border-gray-100">
                                  <div>
                                    <span className="font-medium">{detail.vehiclePlate}</span>
                                    <span className="text-gray-500 ml-2">{detail.type}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 mr-2">{detail.month}</span>
                                    <span className="font-medium">€{detail.cost}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{t('total6MonthForecast') || 'Total 6-Month Forecast'}</span>
                            <span className="text-2xl font-bold text-purple-700">
                              €{maintenanceForecast.reduce((sum, m) => sum + m.estimatedCostEur, 0).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <AddVehicleModal
          onClose={() => setShowAddVehicle(false)}
          onSuccess={() => {
            setShowAddVehicle(false);
            fetchVehicles();
          }}
        />
      )}
    </div>
  );
}

// Add Vehicle Modal Component
function AddVehicleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations('fleet');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    fuelType: 'DIESEL',
    maxPayloadKg: 1500,
    cargoVolumeM3: 12,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/fleet/vehicles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        console.error('Failed to create vehicle');
      }
    } catch (err) {
      console.error('Error creating vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">{t('addVehicle') || 'Add New Vehicle'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('licensePlate') || 'License Plate'}
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="M-AB 1234"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('make') || 'Make'}</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Mercedes"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('model') || 'Model'}</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Sprinter"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('year') || 'Year'}</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                min={2000}
                max={2030}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fuelType') || 'Fuel Type'}</label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="ELECTRIC">Electric</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('maxPayload') || 'Max Payload (kg)'}</label>
              <input
                type="number"
                value={formData.maxPayloadKg}
                onChange={(e) => setFormData({ ...formData, maxPayloadKg: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('cargoVolume') || 'Cargo Volume (m³)'}</label>
              <input
                type="number"
                value={formData.cargoVolumeM3}
                onChange={(e) => setFormData({ ...formData, cargoVolumeM3: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                min={0}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save') || 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
