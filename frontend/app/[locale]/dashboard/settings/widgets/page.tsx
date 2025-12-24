'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  GripVertical,
  Eye,
  EyeOff,
  Settings2,
  LayoutGrid,
  BarChart3,
  Bell,
  Calendar,
  FileText,
  TrendingUp,
  Receipt,
  Users,
  Wallet,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface Widget {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'finance' | 'operations' | 'hr' | 'general';
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
  settings?: {
    refreshInterval?: number;
    showTrend?: boolean;
    displayMode?: 'chart' | 'table' | 'compact';
  };
}

const WIDGET_CATEGORIES = {
  finance: { label: 'Financiar', color: 'bg-green-100 text-green-800' },
  operations: { label: 'Operațiuni', color: 'bg-blue-100 text-blue-800' },
  hr: { label: 'Resurse Umane', color: 'bg-purple-100 text-purple-800' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-800' },
};

const SIZE_OPTIONS = [
  { value: 'small', label: 'Mic', span: 1 },
  { value: 'medium', label: 'Mediu', span: 2 },
  { value: 'large', label: 'Mare', span: 3 },
];

const REFRESH_OPTIONS = [
  { value: 0, label: 'Manual' },
  { value: 60, label: '1 minut' },
  { value: 300, label: '5 minute' },
  { value: 900, label: '15 minute' },
  { value: 3600, label: '1 oră' },
];

export default function WidgetSettingsPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'revenue',
      name: 'Venituri',
      description: 'Afișează veniturile totale și tendința',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'finance',
      enabled: true,
      order: 1,
      size: 'medium',
      settings: { refreshInterval: 300, showTrend: true, displayMode: 'chart' },
    },
    {
      id: 'expenses',
      name: 'Cheltuieli',
      description: 'Monitorizare cheltuieli pe categorii',
      icon: <Wallet className="w-5 h-5" />,
      category: 'finance',
      enabled: true,
      order: 2,
      size: 'medium',
      settings: { refreshInterval: 300, showTrend: true, displayMode: 'chart' },
    },
    {
      id: 'invoices',
      name: 'Facturi recente',
      description: 'Lista ultimelor facturi emise/primite',
      icon: <Receipt className="w-5 h-5" />,
      category: 'finance',
      enabled: true,
      order: 3,
      size: 'large',
      settings: { refreshInterval: 60, displayMode: 'table' },
    },
    {
      id: 'cash-flow',
      name: 'Flux de numerar',
      description: 'Grafic intrări/ieșiri numerar',
      icon: <BarChart3 className="w-5 h-5" />,
      category: 'finance',
      enabled: true,
      order: 4,
      size: 'large',
      settings: { refreshInterval: 900, showTrend: true, displayMode: 'chart' },
    },
    {
      id: 'notifications',
      name: 'Notificări',
      description: 'Alerte și mesaje importante',
      icon: <Bell className="w-5 h-5" />,
      category: 'general',
      enabled: true,
      order: 5,
      size: 'medium',
      settings: { refreshInterval: 60 },
    },
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Evenimente și termene limită',
      icon: <Calendar className="w-5 h-5" />,
      category: 'general',
      enabled: true,
      order: 6,
      size: 'medium',
      settings: { refreshInterval: 300 },
    },
    {
      id: 'pending-tasks',
      name: 'Sarcini în așteptare',
      description: 'Task-uri ce necesită atenție',
      icon: <Clock className="w-5 h-5" />,
      category: 'general',
      enabled: true,
      order: 7,
      size: 'small',
      settings: { refreshInterval: 60 },
    },
    {
      id: 'quick-actions',
      name: 'Acțiuni rapide',
      description: 'Scurtături către funcții frecvente',
      icon: <LayoutGrid className="w-5 h-5" />,
      category: 'general',
      enabled: true,
      order: 8,
      size: 'small',
    },
    {
      id: 'documents',
      name: 'Documente recente',
      description: 'Ultimele documente încărcate',
      icon: <FileText className="w-5 h-5" />,
      category: 'operations',
      enabled: false,
      order: 9,
      size: 'medium',
      settings: { refreshInterval: 300 },
    },
    {
      id: 'inventory',
      name: 'Stocuri critice',
      description: 'Produse cu stoc sub limită',
      icon: <Package className="w-5 h-5" />,
      category: 'operations',
      enabled: false,
      order: 10,
      size: 'medium',
      settings: { refreshInterval: 900 },
    },
    {
      id: 'employees',
      name: 'Echipa',
      description: 'Prezență și status angajați',
      icon: <Users className="w-5 h-5" />,
      category: 'hr',
      enabled: false,
      order: 11,
      size: 'medium',
      settings: { refreshInterval: 300 },
    },
    {
      id: 'approvals',
      name: 'Aprobări necesare',
      description: 'Cereri ce așteaptă aprobare',
      icon: <CheckCircle className="w-5 h-5" />,
      category: 'hr',
      enabled: false,
      order: 12,
      size: 'small',
      settings: { refreshInterval: 60 },
    },
    {
      id: 'alerts',
      name: 'Alerte sistem',
      description: 'Erori și avertismente',
      icon: <AlertTriangle className="w-5 h-5" />,
      category: 'general',
      enabled: false,
      order: 13,
      size: 'small',
      settings: { refreshInterval: 60 },
    },
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
    setHasChanges(true);
  };

  const updateWidgetSize = (id: string, size: Widget['size']) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, size } : w))
    );
    setHasChanges(true);
  };

  const updateWidgetSettings = (id: string, settings: Partial<Widget['settings']>) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === id
          ? { ...w, settings: { ...w.settings, ...settings } }
          : w
      )
    );
    setHasChanges(true);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidget(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    setWidgets(prev => {
      const newWidgets = [...prev];
      const draggedIndex = newWidgets.findIndex(w => w.id === draggedWidget);
      const targetIndex = newWidgets.findIndex(w => w.id === targetId);

      const [draggedItem] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedItem);

      return newWidgets.map((w, i) => ({ ...w, order: i + 1 }));
    });

    setDraggedWidget(null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Would save to API/localStorage
      localStorage.setItem('dashboard-widgets', JSON.stringify(widgets));

      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save widget settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to defaults
    setWidgets(prev =>
      prev.map(w => ({
        ...w,
        enabled: ['revenue', 'expenses', 'invoices', 'cash-flow', 'notifications', 'calendar', 'pending-tasks', 'quick-actions'].includes(w.id),
        size: 'medium' as const,
      }))
    );
    setHasChanges(true);
  };

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);
  const disabledWidgets = widgets.filter(w => !w.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurare Widgets</h1>
            <p className="text-gray-500">Personalizați dashboard-ul cu widget-urile preferate</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Resetare
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </div>

      {/* Active Widgets */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-green-600" />
          Widgets active ({enabledWidgets.length})
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Trageți pentru a reordona. Click pe widget pentru a configura.
        </p>

        {enabledWidgets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nu aveți niciun widget activ. Activați widget-uri din lista de mai jos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {enabledWidgets.map(widget => (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, widget.id)}
                className={`border rounded-lg p-4 transition ${
                  draggedWidget === widget.id
                    ? 'opacity-50 border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="cursor-grab text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className={`p-2 rounded-lg ${WIDGET_CATEGORIES[widget.category].color}`}>
                    {widget.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{widget.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${WIDGET_CATEGORIES[widget.category].color}`}>
                        {WIDGET_CATEGORIES[widget.category].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{widget.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={widget.size}
                      onChange={(e) => updateWidgetSize(widget.id, e.target.value as Widget['size'])}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                    >
                      {SIZE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setExpandedWidget(expandedWidget === widget.id ? null : widget.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Settings2 className="w-4 h-4 text-gray-500" />
                    </button>

                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition text-gray-500 hover:text-red-600"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Settings */}
                {expandedWidget === widget.id && widget.settings && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {widget.settings.refreshInterval !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interval reîmprospătare
                          </label>
                          <select
                            value={widget.settings.refreshInterval}
                            onChange={(e) => updateWidgetSettings(widget.id, { refreshInterval: Number(e.target.value) })}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          >
                            {REFRESH_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {widget.settings.showTrend !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Afișare tendință
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={widget.settings.showTrend}
                              onChange={(e) => updateWidgetSettings(widget.id, { showTrend: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">Arată comparație cu perioada anterioară</span>
                          </label>
                        </div>
                      )}

                      {widget.settings.displayMode !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mod afișare
                          </label>
                          <select
                            value={widget.settings.displayMode}
                            onChange={(e) => updateWidgetSettings(widget.id, { displayMode: e.target.value as 'chart' | 'table' | 'compact' })}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="chart">Grafic</option>
                            <option value="table">Tabel</option>
                            <option value="compact">Compact</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Widgets */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-gray-400" />
          Widgets disponibile ({disabledWidgets.length})
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Activați widget-uri pentru a le adăuga pe dashboard.
        </p>

        {disabledWidgets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
            <p>Toate widget-urile sunt active!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {disabledWidgets.map(widget => (
              <div
                key={widget.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-white transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg opacity-60 ${WIDGET_CATEGORIES[widget.category].color}`}>
                    {widget.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-700">{widget.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded opacity-70 ${WIDGET_CATEGORIES[widget.category].color}`}>
                        {WIDGET_CATEGORIES[widget.category].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{widget.description}</p>
                  </div>

                  <button
                    onClick={() => toggleWidget(widget.id)}
                    className="p-2 hover:bg-green-50 rounded-lg transition text-gray-400 hover:text-green-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <LayoutGrid className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Previzualizare Layout</p>
            <p className="text-blue-600">
              Widget-urile se vor aranja automat pe dashboard într-o grilă responsivă.
              Dimensiunea fiecărui widget determină câte coloane ocupă:
              <span className="font-medium"> Mic (1 col)</span>,
              <span className="font-medium"> Mediu (2 col)</span>,
              <span className="font-medium"> Mare (3 col)</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-amber-100 border border-amber-300 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="text-sm text-amber-800">Aveți modificări nesalvate</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition disabled:opacity-50"
          >
            {isSaving ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      )}
    </div>
  );
}
