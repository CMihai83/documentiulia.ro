'use client';

import { useState } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Bell,
  Settings,
  Zap,
  Globe,
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const performanceData = [
  { time: '00:00', cpu: 25, memory: 45, requests: 120 },
  { time: '04:00', cpu: 15, memory: 42, requests: 45 },
  { time: '08:00', cpu: 55, memory: 58, requests: 450 },
  { time: '12:00', cpu: 75, memory: 72, requests: 890 },
  { time: '16:00', cpu: 65, memory: 68, requests: 720 },
  { time: '20:00', cpu: 45, memory: 55, requests: 380 },
  { time: '23:59', cpu: 30, memory: 48, requests: 150 },
];

const responseTimeData = [
  { time: '00:00', api: 45, db: 12, external: 120 },
  { time: '04:00', api: 42, db: 10, external: 115 },
  { time: '08:00', api: 68, db: 18, external: 145 },
  { time: '12:00', api: 95, db: 25, external: 180 },
  { time: '16:00', api: 78, db: 20, external: 160 },
  { time: '20:00', api: 55, db: 15, external: 135 },
  { time: '23:59', api: 48, db: 12, external: 125 },
];

interface Service {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: string;
  responseTime: number;
  lastCheck: string;
}

const services: Service[] = [
  { id: 'api', name: 'API Principal', status: 'healthy', uptime: '99.99%', responseTime: 45, lastCheck: '2 sec' },
  { id: 'db', name: 'Baza de Date', status: 'healthy', uptime: '99.95%', responseTime: 12, lastCheck: '5 sec' },
  { id: 'auth', name: 'Autentificare', status: 'healthy', uptime: '99.98%', responseTime: 35, lastCheck: '3 sec' },
  { id: 'ocr', name: 'Serviciu OCR', status: 'degraded', uptime: '98.50%', responseTime: 250, lastCheck: '10 sec' },
  { id: 'email', name: 'Email Service', status: 'healthy', uptime: '99.90%', responseTime: 85, lastCheck: '15 sec' },
  { id: 'anaf', name: 'Integrare ANAF', status: 'healthy', uptime: '97.50%', responseTime: 450, lastCheck: '30 sec' },
  { id: 'storage', name: 'Storage', status: 'healthy', uptime: '99.99%', responseTime: 28, lastCheck: '5 sec' },
  { id: 'cache', name: 'Cache Redis', status: 'healthy', uptime: '99.99%', responseTime: 2, lastCheck: '1 sec' },
];

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  service: string;
  timestamp: string;
  acknowledged: boolean;
}

const alerts: Alert[] = [
  { id: 'a1', type: 'warning', message: 'Timp de raspuns crescut pentru serviciul OCR', service: 'OCR', timestamp: '10 min', acknowledged: false },
  { id: 'a2', type: 'info', message: 'Backup automat finalizat cu succes', service: 'Storage', timestamp: '1 ora', acknowledged: true },
  { id: 'a3', type: 'warning', message: 'Utilizare memorie peste 70%', service: 'API', timestamp: '2 ore', acknowledged: true },
  { id: 'a4', type: 'critical', message: 'Esec conexiune temporara ANAF SPV', service: 'ANAF', timestamp: '6 ore', acknowledged: true },
  { id: 'a5', type: 'info', message: 'Certificat SSL reinnoit automat', service: 'Security', timestamp: '1 zi', acknowledged: true },
];

const systemMetrics = {
  cpu: { current: 45, max: 100, trend: 'down' },
  memory: { current: 68, max: 100, trend: 'up' },
  disk: { current: 42, max: 100, trend: 'stable' },
  network: { current: 125, unit: 'Mbps', trend: 'up' },
  activeUsers: { current: 234, trend: 'up' },
  requestsPerMin: { current: 1250, trend: 'stable' },
};

export default function MonitoringPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'alerts' | 'resources'>('overview');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Operational</span>;
      case 'degraded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Degradat</span>;
      case 'down':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Indisponibil</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Necunoscut</span>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const totalServices = services.length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitorizare Sistem</h1>
          <p className="text-gray-500 mt-1">
            Starea serviciilor si performanta platformei in timp real
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {['1h', '24h', '7d', '30d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="flex items-center px-4 py-2 border rounded-md hover:bg-gray-50">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reimprospatare
          </button>
          <button className="p-2 border rounded-md hover:bg-gray-50">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className={`rounded-lg shadow p-4 ${healthyServices === totalServices ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Stare Generala</p>
              <p className="text-2xl font-bold">
                {healthyServices === totalServices ? 'Toate OK' : 'Atentie'}
              </p>
              <p className="text-sm text-gray-500">{healthyServices}/{totalServices} servicii active</p>
            </div>
            <div className={`p-3 rounded-full ${healthyServices === totalServices ? 'bg-green-200' : 'bg-yellow-200'}`}>
              {healthyServices === totalServices ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Utilizare CPU</p>
              <p className="text-2xl font-bold">{systemMetrics.cpu.current}%</p>
            </div>
            <Cpu className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${systemMetrics.cpu.current}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Memorie RAM</p>
              <p className="text-2xl font-bold">{systemMetrics.memory.current}%</p>
            </div>
            <Server className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${systemMetrics.memory.current}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alerte Active</p>
              <p className="text-2xl font-bold">{unacknowledgedAlerts}</p>
              <p className="text-sm text-gray-500">{alerts.length} total</p>
            </div>
            <Bell className={`h-8 w-8 ${unacknowledgedAlerts > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="mr-2 h-4 w-4" />
              Prezentare
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'services'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Server className="mr-2 h-4 w-4" />
              Servicii
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'alerts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="mr-2 h-4 w-4" />
              Alerte
              {unacknowledgedAlerts > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unacknowledgedAlerts}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'resources'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Cpu className="mr-2 h-4 w-4" />
              Resurse
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Performance Chart */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-1">Performanta Sistem</h3>
                  <p className="text-sm text-gray-500 mb-4">CPU, Memorie si Cereri pe ultimele 24h</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="cpu" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="CPU %" />
                        <Area type="monotone" dataKey="memory" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="RAM %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Response Time Chart */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-1">Timp de Raspuns</h3>
                  <p className="text-sm text-gray-500 mb-4">Latenta API, DB si servicii externe (ms)</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={responseTimeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="api" stroke="#22c55e" strokeWidth={2} name="API" />
                        <Line type="monotone" dataKey="db" stroke="#f59e0b" strokeWidth={2} name="Database" />
                        <Line type="monotone" dataKey="external" stroke="#ef4444" strokeWidth={2} name="External" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid gap-4 md:grid-cols-6">
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Utilizatori Activi</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">{systemMetrics.activeUsers.current}</span>
                    {getTrendIcon(systemMetrics.activeUsers.trend)}
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Cereri/min</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">{systemMetrics.requestsPerMin.current}</span>
                    {getTrendIcon(systemMetrics.requestsPerMin.trend)}
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Disk</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">{systemMetrics.disk.current}%</span>
                    {getTrendIcon(systemMetrics.disk.trend)}
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Bandwidth</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">{systemMetrics.network.current}</span>
                    <span className="text-sm text-gray-500">{systemMetrics.network.unit}</span>
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Uptime</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">99.9%</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Securitate</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">A+</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Starea Serviciilor</h3>
                <div className="flex gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{healthyServices} OK</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{services.filter(s => s.status === 'degraded').length} Degradat</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{services.filter(s => s.status === 'down').length} Down</span>
                </div>
              </div>
              <div className="space-y-3">
                {services.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(service.status)}
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-500">Ultima verificare: {service.lastCheck}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{service.responseTime} ms</p>
                        <p className="text-xs text-gray-500">Raspuns</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{service.uptime}</p>
                        <p className="text-xs text-gray-500">Uptime</p>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Alerte Recente</h3>
                <button className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">
                  Marcheaza toate ca citite
                </button>
              </div>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-start justify-between p-4 border rounded-lg ${
                      !alert.acknowledged ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{alert.service}</span>
                          <span>•</span>
                          <span>Acum {alert.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                        Confirma
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Utilizare CPU</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold">{systemMetrics.cpu.current}%</span>
                    {getTrendIcon(systemMetrics.cpu.trend)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${systemMetrics.cpu.current}%` }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-gray-100 rounded text-center">
                      <p className="font-medium">Core 1</p>
                      <p className="text-gray-500">42%</p>
                    </div>
                    <div className="p-2 bg-gray-100 rounded text-center">
                      <p className="font-medium">Core 2</p>
                      <p className="text-gray-500">58%</p>
                    </div>
                    <div className="p-2 bg-gray-100 rounded text-center">
                      <p className="font-medium">Core 3</p>
                      <p className="text-gray-500">35%</p>
                    </div>
                    <div className="p-2 bg-gray-100 rounded text-center">
                      <p className="font-medium">Core 4</p>
                      <p className="text-gray-500">45%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Memorie RAM</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold">{systemMetrics.memory.current}%</span>
                    <span className="text-gray-500">10.88 / 16 GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-purple-600 h-4 rounded-full" style={{ width: `${systemMetrics.memory.current}%` }} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>API Server</span><span>4.2 GB</span></div>
                    <div className="flex justify-between"><span>Database</span><span>3.5 GB</span></div>
                    <div className="flex justify-between"><span>Cache</span><span>2.1 GB</span></div>
                    <div className="flex justify-between"><span>Other</span><span>1.08 GB</span></div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Storage</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold">{systemMetrics.disk.current}%</span>
                    <span className="text-gray-500">420 / 1000 GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-green-600 h-4 rounded-full" style={{ width: `${systemMetrics.disk.current}%` }} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Documente</span><span>180 GB</span></div>
                    <div className="flex justify-between"><span>Baza de date</span><span>150 GB</span></div>
                    <div className="flex justify-between"><span>Backup-uri</span><span>75 GB</span></div>
                    <div className="flex justify-between"><span>Logs</span><span>15 GB</span></div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Retea</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Download</p>
                      <p className="text-2xl font-bold">125 Mbps</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Upload</p>
                      <p className="text-2xl font-bold">85 Mbps</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total astazi</span><span>45.2 GB</span></div>
                    <div className="flex justify-between"><span>Cereri HTTP</span><span>1.2M</span></div>
                    <div className="flex justify-between"><span>Conexiuni active</span><span>342</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
