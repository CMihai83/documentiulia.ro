'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Plus,
  GripVertical,
  X,
  Eye,
  EyeOff,
  Settings2,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Palette,
  Grid3X3,
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Bell,
  Calculator,
  Globe,
  Clock,
  Zap,
  MessageSquare,
  Upload,
  Users,
  Wallet,
  Building2,
} from 'lucide-react';

// Widget types available for dashboard
interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: 'charts' | 'kpi' | 'tools' | 'activity' | 'compliance';
  icon: React.ReactNode;
  defaultSize: { cols: number; rows: number };
  minSize?: { cols: number; rows: number };
  maxSize?: { cols: number; rows: number };
}

interface UserWidget {
  id: string;
  widgetId: string;
  enabled: boolean;
  position: number;
  size: { cols: number; rows: number };
  config?: Record<string, any>;
}

interface DashboardLayout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: UserWidget[];
  theme: {
    accentColor: string;
    compactMode: boolean;
    showWidgetBorders: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Available widgets catalog
const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'cash-flow-chart',
    name: 'Grafic Flux Numerar',
    description: 'Vizualizare venituri si cheltuieli pe perioade',
    category: 'charts',
    icon: <TrendingUp className="h-5 w-5" />,
    defaultSize: { cols: 2, rows: 1 },
  },
  {
    id: 'vat-summary',
    name: 'Sumar TVA',
    description: 'Situatia TVA colectat, deductibil si de plata',
    category: 'charts',
    icon: <PieChart className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'revenue-kpi',
    name: 'KPI Venituri',
    description: 'Indicator venituri totale cu trend',
    category: 'kpi',
    icon: <BarChart3 className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'expenses-kpi',
    name: 'KPI Cheltuieli',
    description: 'Indicator cheltuieli totale cu trend',
    category: 'kpi',
    icon: <Wallet className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'invoices-kpi',
    name: 'KPI Facturi',
    description: 'Numar facturi emise/primite luna aceasta',
    category: 'kpi',
    icon: <FileText className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'vat-calculator',
    name: 'Calculator TVA',
    description: 'Calculator rapid pentru TVA',
    category: 'tools',
    icon: <Calculator className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'eu-vat-widget',
    name: 'TVA Intra-UE',
    description: 'Verificare si calculare TVA pentru tranzactii UE',
    category: 'tools',
    icon: <Globe className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'quick-actions',
    name: 'Actiuni Rapide',
    description: 'Butoane pentru actiuni frecvente',
    category: 'tools',
    icon: <Zap className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'document-upload',
    name: 'Incarcare Documente',
    description: 'Zona drag-drop pentru incarcarea documentelor',
    category: 'tools',
    icon: <Upload className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'compliance-deadlines',
    name: 'Termene Conformitate',
    description: 'Calendar cu termenele ANAF si obligatii fiscale',
    category: 'compliance',
    icon: <Clock className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'notifications-widget',
    name: 'Notificari',
    description: 'Alerte si notificari recente',
    category: 'activity',
    icon: <Bell className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'recent-activity',
    name: 'Activitate Recenta',
    description: 'Ultimele actiuni in platforma',
    category: 'activity',
    icon: <Clock className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'ai-insights',
    name: 'Sugestii AI',
    description: 'Recomandari inteligente bazate pe datele tale',
    category: 'activity',
    icon: <Zap className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'ai-assistant',
    name: 'Asistent AI',
    description: 'Chat cu asistentul virtual pentru intrebari',
    category: 'tools',
    icon: <MessageSquare className="h-5 w-5" />,
    defaultSize: { cols: 3, rows: 1 },
  },
  {
    id: 'business-widgets',
    name: 'Widgeturi Business',
    description: 'Statistici specifice pentru afacerea ta',
    category: 'kpi',
    icon: <Building2 className="h-5 w-5" />,
    defaultSize: { cols: 3, rows: 1 },
  },
  {
    id: 'customers-overview',
    name: 'Sumar Clienti',
    description: 'Top clienti si situatie plati',
    category: 'kpi',
    icon: <Users className="h-5 w-5" />,
    defaultSize: { cols: 1, rows: 1 },
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  charts: 'Grafice',
  kpi: 'Indicatori KPI',
  tools: 'Instrumente',
  activity: 'Activitate',
  compliance: 'Conformitate',
};

const ACCENT_COLORS = [
  { name: 'Albastru', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Portocaliu', value: '#f97316' },
  { name: 'Roz', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
];

export default function DashboardLayoutPage() {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('charts');
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const getUserId = () => localStorage.getItem('user_id') || 'demo-user';
  const getTenantId = () => localStorage.getItem('tenant_id') || 'demo-tenant';

  // Default layout
  const defaultLayout: DashboardLayout = {
    id: 'default',
    name: 'Layout Principal',
    isDefault: true,
    widgets: [
      { id: '1', widgetId: 'cash-flow-chart', enabled: true, position: 0, size: { cols: 2, rows: 1 } },
      { id: '2', widgetId: 'vat-summary', enabled: true, position: 1, size: { cols: 1, rows: 1 } },
      { id: '3', widgetId: 'quick-actions', enabled: true, position: 2, size: { cols: 1, rows: 1 } },
      { id: '4', widgetId: 'notifications-widget', enabled: true, position: 3, size: { cols: 1, rows: 1 } },
      { id: '5', widgetId: 'document-upload', enabled: true, position: 4, size: { cols: 1, rows: 1 } },
      { id: '6', widgetId: 'compliance-deadlines', enabled: true, position: 5, size: { cols: 1, rows: 1 } },
      { id: '7', widgetId: 'business-widgets', enabled: true, position: 6, size: { cols: 3, rows: 1 } },
      { id: '8', widgetId: 'vat-calculator', enabled: true, position: 7, size: { cols: 1, rows: 1 } },
      { id: '9', widgetId: 'eu-vat-widget', enabled: true, position: 8, size: { cols: 1, rows: 1 } },
      { id: '10', widgetId: 'recent-activity', enabled: true, position: 9, size: { cols: 1, rows: 1 } },
      { id: '11', widgetId: 'ai-insights', enabled: true, position: 10, size: { cols: 1, rows: 1 } },
      { id: '12', widgetId: 'ai-assistant', enabled: true, position: 11, size: { cols: 3, rows: 1 } },
    ],
    theme: {
      accentColor: '#3b82f6',
      compactMode: false,
      showWidgetBorders: true,
    },
  };

  const fetchLayout = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const tenantId = getTenantId();
      const userId = getUserId();

      const response = await fetch(
        `${API_URL}/dashboard-builder/dashboards/tenant/${tenantId}?ownerId=${userId}&isDefault=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.dashboards && data.dashboards.length > 0) {
          // Transform to our format
          const serverLayout = data.dashboards[0];
          setLayout({
            id: serverLayout.id,
            name: serverLayout.name,
            isDefault: serverLayout.isDefault,
            widgets: serverLayout.layout?.widgets || defaultLayout.widgets,
            theme: serverLayout.theme || defaultLayout.theme,
          });
        } else {
          setLayout(defaultLayout);
        }
      } else {
        setLayout(defaultLayout);
      }
    } catch (err) {
      console.error('Error loading layout:', err);
      setLayout(defaultLayout);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = async () => {
    if (!layout) return;
    setSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      const tenantId = getTenantId();
      const userId = getUserId();

      // Save to backend
      await fetch(`${API_URL}/dashboard-builder/dashboards`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          name: layout.name,
          ownerId: userId,
          isDefault: true,
          layout: {
            columns: 3,
            rows: Math.ceil(layout.widgets.filter(w => w.enabled).length / 3),
            widgets: layout.widgets,
          },
          theme: layout.theme,
        }),
      });

      // Also save to localStorage for immediate effect
      localStorage.setItem('dashboard_layout', JSON.stringify(layout));
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving layout:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    if (!layout) return;

    const existingWidget = layout.widgets.find(w => w.widgetId === widgetId);

    if (existingWidget) {
      // Toggle existing
      setLayout({
        ...layout,
        widgets: layout.widgets.map(w =>
          w.widgetId === widgetId ? { ...w, enabled: !w.enabled } : w
        ),
      });
    } else {
      // Add new widget
      const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
      if (widgetDef) {
        const newWidget: UserWidget = {
          id: `widget-${Date.now()}`,
          widgetId,
          enabled: true,
          position: layout.widgets.length,
          size: widgetDef.defaultSize,
        };
        setLayout({
          ...layout,
          widgets: [...layout.widgets, newWidget],
        });
      }
    }
    setHasChanges(true);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if (!layout) return;

    const enabledWidgets = layout.widgets.filter(w => w.enabled);
    const widget = enabledWidgets[index];
    if (!widget) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= enabledWidgets.length) return;

    const reordered = [...enabledWidgets];
    reordered.splice(index, 1);
    reordered.splice(newIndex, 0, widget);

    // Update positions
    const updatedWidgets = layout.widgets.map(w => {
      const newPos = reordered.findIndex(r => r.id === w.id);
      return newPos >= 0 ? { ...w, position: newPos } : w;
    });

    setLayout({ ...layout, widgets: updatedWidgets });
    setHasChanges(true);
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
    setHasChanges(true);
  };

  const updateTheme = (key: keyof DashboardLayout['theme'], value: any) => {
    if (!layout) return;
    setLayout({
      ...layout,
      theme: { ...layout.theme, [key]: value },
    });
    setHasChanges(true);
  };

  const isWidgetEnabled = (widgetId: string) => {
    return layout?.widgets.some(w => w.widgetId === widgetId && w.enabled) || false;
  };

  const getWidgetDef = (widgetId: string) => {
    return AVAILABLE_WIDGETS.find(w => w.id === widgetId);
  };

  const enabledWidgets = layout?.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.position - b.position) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Se incarca configuratia...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            Personalizare Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Configureaza widgeturile si aspectul dashboard-ului principal
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetLayout}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Resetare
          </button>
          <button
            onClick={saveLayout}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salveaza
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-800">
          <Bell className="h-4 w-4" />
          <span className="text-sm">Aveti modificari nesalvate</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget Catalog */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-blue-600" />
                Widgeturi Disponibile
              </h3>
            </div>
            <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
              {Object.keys(CATEGORY_LABELS).map((category) => {
                const widgets = AVAILABLE_WIDGETS.filter(w => w.category === category);
                const isExpanded = expandedCategory === category;

                return (
                  <div key={category} className="border rounded-lg">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="font-medium text-sm">{CATEGORY_LABELS[category]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {widgets.filter(w => isWidgetEnabled(w.id)).length}/{widgets.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t px-3 py-2 space-y-2">
                        {widgets.map((widget) => {
                          const enabled = isWidgetEnabled(widget.id);
                          return (
                            <div
                              key={widget.id}
                              className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                                enabled
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => toggleWidget(widget.id)}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {widget.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{widget.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{widget.description}</p>
                                </div>
                                {enabled ? (
                                  <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-600" />
                Tema
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Culoare Accent
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateTheme('accentColor', color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        layout?.theme.accentColor === color.value
                          ? 'border-gray-900 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Mod Compact
                </label>
                <button
                  onClick={() => updateTheme('compactMode', !layout?.theme.compactMode)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    layout?.theme.compactMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    layout?.theme.compactMode ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Borduri Widgeturi
                </label>
                <button
                  onClick={() => updateTheme('showWidgetBorders', !layout?.theme.showWidgetBorders)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    layout?.theme.showWidgetBorders ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    layout?.theme.showWidgetBorders ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Preview */}
        <div className="lg:col-span-2 bg-white rounded-lg border">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-gray-600" />
              Ordinea Widgeturilor
            </h3>
            <span className="text-sm text-gray-500">
              {enabledWidgets.length} widgeturi active
            </span>
          </div>
          <div className="p-4 space-y-2 min-h-[400px]">
            {enabledWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <LayoutDashboard className="h-12 w-12 mb-3" />
                <p>Niciun widget selectat</p>
                <p className="text-sm">Selecteaza widgeturi din lista din stanga</p>
              </div>
            ) : (
              enabledWidgets.map((userWidget, index) => {
                const widgetDef = getWidgetDef(userWidget.widgetId);
                if (!widgetDef) return null;

                return (
                  <div
                    key={userWidget.id}
                    className={`p-3 rounded-lg border flex items-center gap-3 ${
                      layout?.theme.showWidgetBorders ? 'border-gray-200' : 'border-transparent bg-gray-50'
                    }`}
                    style={{ borderLeftColor: layout?.theme.accentColor, borderLeftWidth: '3px' }}
                  >
                    <div className="cursor-grab text-gray-400 hover:text-gray-600">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="p-2 rounded bg-gray-100">
                      {widgetDef.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{widgetDef.name}</p>
                      <p className="text-xs text-gray-500">{widgetDef.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveWidget(index, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveWidget(index, 'down')}
                        disabled={index === enabledWidgets.length - 1}
                        className={`p-1 rounded ${
                          index === enabledWidgets.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleWidget(userWidget.widgetId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Previzualizare Layout</h3>
        </div>
        <div
          className={`p-4 bg-gray-50 ${layout?.theme.compactMode ? 'space-y-2' : 'space-y-4'}`}
          style={{ '--accent-color': layout?.theme.accentColor } as React.CSSProperties}
        >
          <div className={`grid grid-cols-3 gap-3 ${layout?.theme.compactMode ? 'text-sm' : ''}`}>
            {enabledWidgets.slice(0, 6).map((userWidget) => {
              const widgetDef = getWidgetDef(userWidget.widgetId);
              if (!widgetDef) return null;

              const colSpan = Math.min(userWidget.size.cols, 3);
              return (
                <div
                  key={userWidget.id}
                  className={`bg-white rounded-lg p-3 ${
                    layout?.theme.showWidgetBorders ? 'border' : 'shadow-sm'
                  }`}
                  style={{
                    gridColumn: `span ${colSpan}`,
                    borderColor: layout?.theme.showWidgetBorders ? '#e5e7eb' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 text-gray-600">
                    {widgetDef.icon}
                    <span className="font-medium">{widgetDef.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {enabledWidgets.length > 6 && (
            <p className="text-center text-sm text-gray-500">
              +{enabledWidgets.length - 6} widgeturi adaugate
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
