'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Truck, Building2, Stethoscope, ShoppingCart, Briefcase, FileText,
  MapPin, Clock, Package, Users, Calendar, Clipboard, Activity,
  TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface WidgetData {
  id: string;
  title: string;
  value: string;
  trend: string;
  color: string;
}

interface AlertData {
  type: 'warning' | 'success' | 'info';
  message: string;
}

interface BusinessData {
  widgets: WidgetData[];
  alerts: AlertData[];
}

// Business-specific widget configurations
const businessWidgets = {
  logistics: {
    icon: Truck,
    title: 'Fleet Overview',
    widgets: [
      { id: 'fleet', icon: Truck, title: 'Active Vehicles', value: '12', trend: '+2 this week', color: 'blue' },
      { id: 'routes', icon: MapPin, title: 'Active Routes', value: '8', trend: '3 completed today', color: 'green' },
      { id: 'drivers', icon: Users, title: 'Drivers On Duty', value: '10', trend: '2 on break', color: 'purple' },
      { id: 'etransport', icon: FileText, title: 'e-Transport CMR', value: '24', trend: '5 pending', color: 'orange' },
    ],
    alerts: [
      { type: 'warning', message: 'Vehicle RO-B-123 maintenance due in 3 days' },
      { type: 'info', message: 'e-Transport declaration deadline: Jan 25' },
    ],
  },
  construction: {
    icon: Building2,
    title: 'Project Dashboard',
    widgets: [
      { id: 'projects', icon: Building2, title: 'Active Projects', value: '4', trend: '1 near completion', color: 'blue' },
      { id: 'materials', icon: Package, title: 'Material Orders', value: '12', trend: '3 in transit', color: 'green' },
      { id: 'workers', icon: Users, title: 'Workers Today', value: '28', trend: 'On 3 sites', color: 'purple' },
      { id: 'phases', icon: Clipboard, title: 'Phases Complete', value: '67%', trend: 'On schedule', color: 'orange' },
    ],
    alerts: [
      { type: 'warning', message: 'Material delivery delayed for Site A' },
      { type: 'success', message: 'Phase 2 completed for Project Residence' },
    ],
  },
  healthcare: {
    icon: Stethoscope,
    title: 'Practice Overview',
    widgets: [
      { id: 'patients', icon: Users, title: 'Patients Today', value: '18', trend: '3 new registrations', color: 'blue' },
      { id: 'appointments', icon: Calendar, title: 'Appointments', value: '24', trend: '4 cancelled', color: 'green' },
      { id: 'waittime', icon: Clock, title: 'Avg Wait Time', value: '12m', trend: '-3m from last week', color: 'purple' },
      { id: 'billing', icon: FileText, title: 'Pending Bills', value: '8', trend: 'CNAS claims: 5', color: 'orange' },
    ],
    alerts: [
      { type: 'info', message: 'CNAS contract renewal due Feb 1' },
      { type: 'warning', message: '3 lab results pending review' },
    ],
  },
  retail: {
    icon: ShoppingCart,
    title: 'Store Dashboard',
    widgets: [
      { id: 'sales', icon: TrendingUp, title: 'Today Sales', value: '4,250 RON', trend: '+15% vs yesterday', color: 'blue' },
      { id: 'inventory', icon: Package, title: 'Low Stock Items', value: '7', trend: 'Reorder needed', color: 'orange' },
      { id: 'orders', icon: Clipboard, title: 'Pending Orders', value: '12', trend: '5 ready to ship', color: 'green' },
      { id: 'customers', icon: Users, title: 'Loyalty Members', value: '342', trend: '+8 this week', color: 'purple' },
    ],
    alerts: [
      { type: 'warning', message: '7 products below reorder point' },
      { type: 'success', message: 'Monthly sales target achieved' },
    ],
  },
  services: {
    icon: Briefcase,
    title: 'Services Overview',
    widgets: [
      { id: 'clients', icon: Users, title: 'Active Clients', value: '24', trend: '+3 this month', color: 'blue' },
      { id: 'contracts', icon: FileText, title: 'Active Contracts', value: '18', trend: '2 expiring soon', color: 'green' },
      { id: 'hours', icon: Clock, title: 'Billable Hours', value: '128h', trend: 'This month', color: 'purple' },
      { id: 'invoices', icon: Clipboard, title: 'Pending Invoices', value: '8', trend: '15,400 RON total', color: 'orange' },
    ],
    alerts: [
      { type: 'warning', message: '2 contracts expiring in 30 days' },
      { type: 'info', message: 'Timesheet submission due Friday' },
    ],
  },
  other: {
    icon: FileText,
    title: 'Business Overview',
    widgets: [
      { id: 'invoices', icon: FileText, title: 'This Month', value: '34', trend: 'Invoices issued', color: 'blue' },
      { id: 'vat', icon: Activity, title: 'VAT Balance', value: '4,200 RON', trend: 'To pay', color: 'green' },
      { id: 'employees', icon: Users, title: 'Employees', value: '8', trend: 'Active contracts', color: 'purple' },
      { id: 'expenses', icon: TrendingUp, title: 'Monthly Expenses', value: '45,000 RON', trend: '+5% vs budget', color: 'orange' },
    ],
    alerts: [
      { type: 'info', message: 'VAT declaration due Jan 25' },
      { type: 'info', message: 'Payroll processing starts Jan 20' },
    ],
  },
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
};

export function BusinessWidgets() {
  const [businessType, setBusinessType] = useState<string>('other');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState<BusinessData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const getToken = () => localStorage.getItem('auth_token') || localStorage.getItem('accessToken');

  const fetchBusinessData = async (type: string) => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(`${API_URL}/dashboard/business-widgets?type=${type}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setApiData(data);
        setLastRefresh(new Date());
      } else {
        // API not available, will use fallback data
        setApiData(null);
      }
    } catch (error) {
      console.log('Using fallback business widget data');
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedType = localStorage.getItem('onboarding_business_type');
    const type = storedType && storedType in businessWidgets ? storedType : 'other';
    setBusinessType(type);
    setIsLoaded(true);
    fetchBusinessData(type);
  }, []);

  const handleRefresh = () => {
    fetchBusinessData(businessType);
  };

  if (!isLoaded) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl h-48" />
    );
  }

  const fallbackConfig = businessWidgets[businessType as keyof typeof businessWidgets] || businessWidgets.other;
  const IconComponent = fallbackConfig.icon;

  // Use API data if available, otherwise fallback to static config
  const displayWidgets = apiData?.widgets || fallbackConfig.widgets.map(w => ({
    id: w.id,
    title: w.title,
    value: w.value,
    trend: w.trend,
    color: w.color,
  }));

  const displayAlerts = apiData?.alerts || fallbackConfig.alerts;

  // Map icon names to components for API data
  const getWidgetIcon = (id: string) => {
    const iconMap: Record<string, any> = {
      fleet: Truck, routes: MapPin, drivers: Users, etransport: FileText,
      projects: Building2, materials: Package, workers: Users, phases: Clipboard,
      patients: Users, appointments: Calendar, waittime: Clock, billing: FileText,
      sales: TrendingUp, inventory: Package, orders: Clipboard, customers: Users,
      clients: Users, contracts: FileText, hours: Clock, invoices: Clipboard,
      vat: Activity, employees: Users, expenses: TrendingUp,
    };
    return iconMap[id] || FileText;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <IconComponent className="w-5 h-5 text-primary-600" />
          {fallbackConfig.title}
        </h2>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Actualizat: {lastRefresh.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Actualizeaza"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {displayWidgets.map((widget) => {
          const WidgetIcon = getWidgetIcon(widget.id);
          return (
            <div key={widget.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${colorClasses[widget.color as keyof typeof colorClasses]}`}>
                  <WidgetIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{widget.value}</div>
              <div className="text-sm text-gray-500">{widget.title}</div>
              <div className="text-xs text-gray-400 mt-1">{widget.trend}</div>
            </div>
          );
        })}
      </div>

      {/* Data Source Indicator */}
      {apiData && (
        <div className="mb-4 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          <span>Date live din sistem</span>
        </div>
      )}

      {/* Alerts Section */}
      <div className="space-y-2">
        {displayAlerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              alert.type === 'warning'
                ? 'bg-yellow-50 text-yellow-700'
                : alert.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {alert.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : alert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
}
