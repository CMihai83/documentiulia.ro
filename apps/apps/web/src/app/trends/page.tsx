'use client';

/**
 * Trends Intelligence Page - Market Wand Incantation
 *
 * Enchantment for emerging AI markets:
 * - Tachograph AI: RO e-Transport data analysis (EU APIs, SVT-like)
 * - GenAI Forecasting: RO AI Factory hooks (LLM training for 40% workloads)
 * - DIH4Society Hub: SME/public digitization (2026-2029 grants, €50k vouchers)
 * - ABSL BSS Fusion: HR/recruitment for services (347k jobs, AI outsourcing)
 */

import { useState } from 'react';
import { AppLayout, MobileNav } from '@/components/layout';

type TabType = 'overview' | 'tachograph' | 'genai' | 'dih' | 'absl';

// Mock data for trends incantation
const trendStats = {
  tachographFleets: 12500,
  genaiAdoption: 23.5,
  dihProjects: 847,
  abslJobs: 347000,
};

const tachographAlerts = [
  {
    id: '1',
    vehicleId: 'B-123-ABC',
    driverName: 'Ion Popescu',
    alertType: 'driving_time',
    message: 'Depășire timp conducere zilnic (9h15m din 9h permise)',
    severity: 'warning',
    timestamp: '2025-12-03T08:30:00',
  },
  {
    id: '2',
    vehicleId: 'CJ-456-DEF',
    driverName: 'Maria Ionescu',
    alertType: 'rest_period',
    message: 'Pauză insuficientă - necesită 45 min',
    severity: 'critical',
    timestamp: '2025-12-03T07:45:00',
  },
  {
    id: '3',
    vehicleId: 'TM-789-GHI',
    driverName: 'Gheorghe Marin',
    alertType: 'calibration',
    message: 'Calibrare tahograf expirată în 15 zile',
    severity: 'info',
    timestamp: '2025-12-03T06:00:00',
  },
];

const genaiForecasts = [
  {
    id: '1',
    metric: 'Adoptie AI în IMM-uri',
    current: 23.5,
    forecast2026: 35.0,
    forecast2030: 40.0,
    trend: 'up',
    confidence: 87,
  },
  {
    id: '2',
    metric: 'Automatizare Procese Contabile',
    current: 45.2,
    forecast2026: 68.0,
    forecast2030: 85.0,
    trend: 'up',
    confidence: 92,
  },
  {
    id: '3',
    metric: 'LLM Training Workloads (RO AI Factory)',
    current: 12.0,
    forecast2026: 28.0,
    forecast2030: 45.0,
    trend: 'up',
    confidence: 78,
  },
  {
    id: '4',
    metric: 'OCR Accuracy (LayoutLMv3 RO-tuned)',
    current: 97.5,
    forecast2026: 99.2,
    forecast2030: 99.8,
    trend: 'stable',
    confidence: 95,
  },
];

const dihProjects = [
  {
    id: '1',
    name: 'Digitalizare Primărie Sector 3',
    type: 'public',
    status: 'active',
    funding: 48000,
    completion: 65,
    deadline: '2026-06-30',
  },
  {
    id: '2',
    name: 'AI Customer Service - TechStart SRL',
    type: 'sme',
    status: 'active',
    funding: 50000,
    completion: 40,
    deadline: '2026-03-15',
  },
  {
    id: '3',
    name: 'ERP Migration - AgroFarm SA',
    type: 'sme',
    status: 'pending',
    funding: 35000,
    completion: 0,
    deadline: '2026-09-30',
  },
];

const abslMetrics = [
  {
    sector: 'IT & Software',
    jobs: 125000,
    growth: 12.5,
    aiReadiness: 78,
  },
  {
    sector: 'BPO & Customer Service',
    jobs: 85000,
    growth: 8.2,
    aiReadiness: 65,
  },
  {
    sector: 'Finance & Accounting',
    jobs: 72000,
    growth: 15.3,
    aiReadiness: 82,
  },
  {
    sector: 'HR & Recruitment',
    jobs: 35000,
    growth: 18.7,
    aiReadiness: 71,
  },
  {
    sector: 'R&D & Engineering',
    jobs: 30000,
    growth: 22.1,
    aiReadiness: 85,
  },
];

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const tabs = [
    { id: 'overview' as TabType, label: 'Prezentare', icon: '📊' },
    { id: 'tachograph' as TabType, label: 'Tahograf AI', icon: '🚛' },
    { id: 'genai' as TabType, label: 'GenAI Forecast', icon: '🤖' },
    { id: 'dih' as TabType, label: 'DIH4Society', icon: '🏛️' },
    { id: 'absl' as TabType, label: 'ABSL BSS', icon: '💼' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid - Market Wand Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Flote Tahograf</p>
              <p className="text-3xl font-bold">{trendStats.tachographFleets.toLocaleString()}</p>
              <p className="text-blue-200 text-xs mt-1">vehicule monitorizate</p>
            </div>
            <span className="text-4xl">🚛</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Adoptie GenAI</p>
              <p className="text-3xl font-bold">{trendStats.genaiAdoption}%</p>
              <p className="text-purple-200 text-xs mt-1">IMM-uri România</p>
            </div>
            <span className="text-4xl">🤖</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Proiecte DIH</p>
              <p className="text-3xl font-bold">{trendStats.dihProjects}</p>
              <p className="text-green-200 text-xs mt-1">digitalizare 2026-2029</p>
            </div>
            <span className="text-4xl">🏛️</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">ABSL Jobs</p>
              <p className="text-3xl font-bold">{(trendStats.abslJobs / 1000).toFixed(0)}k</p>
              <p className="text-orange-200 text-xs mt-1">servicii business</p>
            </div>
            <span className="text-4xl">💼</span>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>📈</span> Tendințe Cheie 2026
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm">RO AI Factory - Training LLM</span>
              <span className="text-blue-600 font-medium">+28% adopție</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm">e-Transport obligatoriu €10k+</span>
              <span className="text-green-600 font-medium">100% conformitate</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm">DIH4Society Vouchers</span>
              <span className="text-purple-600 font-medium">€50k/proiect</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm">BSS AI Outsourcing</span>
              <span className="text-orange-600 font-medium">+22% creștere</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>⚡</span> Alerte Active
          </h3>
          <div className="space-y-3">
            {tachographAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{alert.vehicleId}</span>
                  <span className="text-xs">{new Date(alert.timestamp).toLocaleTimeString('ro-RO')}</span>
                </div>
                <p className="text-xs mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTachograph = () => (
    <div className="space-y-6">
      {/* Tachograph AI Header - Incantation for e-Transport */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Tahograf AI - RO e-Transport</h3>
            <p className="text-blue-100 mt-1">
              Analiză automată date conducere • EU APIs • Conformitate SVT
            </p>
          </div>
          <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Încarcă Date DDD
          </button>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Vehicule Active</p>
          <p className="text-2xl font-bold text-blue-600">248</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Șoferi în Tură</p>
          <p className="text-2xl font-bold text-green-600">186</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Alerte Azi</p>
          <p className="text-2xl font-bold text-yellow-600">12</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Conformitate</p>
          <p className="text-2xl font-bold text-purple-600">94.7%</p>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Alerte Tahograf</h3>
        </div>
        <div className="divide-y">
          {tachographAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedVehicle(alert.vehicleId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity === 'critical' ? 'CRITIC' : alert.severity === 'warning' ? 'ATENȚIE' : 'INFO'}
                  </span>
                  <div>
                    <p className="font-medium">{alert.vehicleId} - {alert.driverName}</p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(alert.timestamp).toLocaleString('ro-RO')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver Hours Chart Placeholder */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Ore Conducere - Săptămâna Curentă</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <span className="text-4xl">📊</span>
            <p className="mt-2">Grafic ore conducere vs. limite legale</p>
            <p className="text-sm">EU Regulation 561/2006</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGenAI = () => (
    <div className="space-y-6">
      {/* GenAI Header - RO AI Factory Incantation */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">GenAI Forecasting - RO AI Factory</h3>
            <p className="text-purple-100 mt-1">
              Predicții LLM • 40% Workloads by 2030 • HPC Simulations
            </p>
          </div>
          <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors">
            Rulează Predicție
          </button>
        </div>
      </div>

      {/* Forecasts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {genaiForecasts.map((forecast) => (
          <div key={forecast.id} className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">{forecast.metric}</h4>
              <span className={`px-2 py-1 rounded text-xs ${
                forecast.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {forecast.trend === 'up' ? '↑ Creștere' : '→ Stabil'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Actual 2025</span>
                <span className="font-medium">{forecast.current}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${forecast.current}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Forecast 2026</span>
                <span className="font-medium text-purple-600">{forecast.forecast2026}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-400 h-2 rounded-full transition-all"
                  style={{ width: `${forecast.forecast2026}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Forecast 2030</span>
                <span className="font-medium text-pink-600">{forecast.forecast2030}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pink-400 h-2 rounded-full transition-all"
                  style={{ width: `${forecast.forecast2030}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Încredere Model</span>
                <span className="font-medium text-green-600">{forecast.confidence}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Workload Projections */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Proiecții AI Workloads - RO AI Factory</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">LLM Fine-tuning</p>
            <p className="text-2xl font-bold">€2.5M</p>
            <p className="text-xs text-gray-500">buget 2026</p>
          </div>
          <div className="p-4 bg-pink-50 rounded-lg">
            <p className="text-sm text-pink-600 font-medium">HPC Hours</p>
            <p className="text-2xl font-bold">125k</p>
            <p className="text-xs text-gray-500">ore compute estimate</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-600 font-medium">Modele RO-tuned</p>
            <p className="text-2xl font-bold">47</p>
            <p className="text-xs text-gray-500">disponibile</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDIH = () => (
    <div className="space-y-6">
      {/* DIH4Society Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">DIH4Society Hub</h3>
            <p className="text-green-100 mt-1">
              Digitalizare IMM & Public • 2026-2029 • €50k Vouchers
            </p>
          </div>
          <button className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors">
            Aplică pentru Voucher
          </button>
        </div>
      </div>

      {/* DIH Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Proiecte Active</p>
          <p className="text-2xl font-bold text-green-600">124</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Fonduri Alocate</p>
          <p className="text-2xl font-bold text-blue-600">€4.2M</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">IMM-uri Beneficiare</p>
          <p className="text-2xl font-bold text-purple-600">312</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-gray-500 text-sm">Instituții Publice</p>
          <p className="text-2xl font-bold text-teal-600">89</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Proiecte DIH4Society</h3>
          <button className="text-sm text-green-600 hover:text-green-700">
            + Proiect Nou
          </button>
        </div>
        <div className="divide-y">
          {dihProjects.map((project) => (
            <div key={project.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    project.type === 'sme' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {project.type === 'sme' ? 'IMM' : 'PUBLIC'}
                  </span>
                  <h4 className="font-medium">{project.name}</h4>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {project.status === 'active' ? 'Activ' : 'În Așteptare'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Finanțare</p>
                  <p className="font-medium">€{project.funding.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Progres</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${project.completion}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{project.completion}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Deadline</p>
                  <p className="font-medium">{new Date(project.deadline).toLocaleDateString('ro-RO')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderABSL = () => (
    <div className="space-y-6">
      {/* ABSL Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">ABSL BSS Fusion</h3>
            <p className="text-orange-100 mt-1">
              347k Jobs • AI Outsourcing • Business Services Romania
            </p>
          </div>
          <button className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors">
            Raport Complet
          </button>
        </div>
      </div>

      {/* Sector Analysis */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Analiză Sectoare BSS România</h3>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {abslMetrics.map((sector, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{sector.sector}</h4>
                  <span className="text-green-600 text-sm font-medium">
                    +{sector.growth}% YoY
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Angajați</p>
                    <p className="font-semibold">{sector.jobs.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Creștere</p>
                    <p className="font-semibold text-green-600">+{sector.growth}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">AI Readiness</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${sector.aiReadiness}%` }}
                        />
                      </div>
                      <span className="text-sm">{sector.aiReadiness}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Outsourcing Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Top Skills Cerute</h3>
          <div className="space-y-3">
            {[
              { skill: 'Python/ML Engineering', demand: 92 },
              { skill: 'Cloud Architecture', demand: 88 },
              { skill: 'Data Science', demand: 85 },
              { skill: 'DevOps/MLOps', demand: 82 },
              { skill: 'NLP/LLM Fine-tuning', demand: 78 },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm flex-1">{item.skill}</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${item.demand}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12">{item.demand}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Proiecții Angajări AI 2026</h3>
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">ML Engineers</p>
              <p className="text-xl font-bold">+8,500</p>
              <p className="text-xs text-gray-500">noi poziții estimate</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">AI Product Managers</p>
              <p className="text-xl font-bold">+2,200</p>
              <p className="text-xs text-gray-500">noi poziții estimate</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Data Analysts</p>
              <p className="text-xl font-bold">+5,800</p>
              <p className="text-xs text-gray-500">noi poziții estimate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trends Intelligence</h1>
                <p className="text-gray-500 text-sm">
                  Piețe emergente • AI • Digitalizare • BSS
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  Export Raport
                </button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Configurare Alerte
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'tachograph' && renderTachograph()}
          {activeTab === 'genai' && renderGenAI()}
          {activeTab === 'dih' && renderDIH()}
          {activeTab === 'absl' && renderABSL()}
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
