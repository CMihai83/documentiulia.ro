'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from '@hello-pangea/dnd';
import { GripVertical, X, Plus, Settings, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/lib/state/uiStore';

/**
 * Customizable Dashboard Widget Grid - DocumentIulia.ro
 * Allows users to drag-drop, add, remove, and customize dashboard widgets
 */

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  titleRo: string;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  position: number;
  config?: Record<string, any>;
}

export type WidgetType =
  | 'cash-flow'
  | 'vat-summary'
  | 'efactura-status'
  | 'recent-activity'
  | 'quick-actions'
  | 'notifications'
  | 'exchange-rate'
  | 'vat-calculator'
  | 'eu-vat'
  | 'ai-insights'
  | 'overdue-invoices'
  | 'cash-forecast'
  | 'compliance-deadlines'
  | 'ai-assistant';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w1', type: 'cash-flow', title: 'Cash Flow', titleRo: 'Flux Numerar', size: 'large', visible: true, position: 0 },
  { id: 'w2', type: 'vat-summary', title: 'VAT Summary', titleRo: 'Sumar TVA', size: 'medium', visible: true, position: 1 },
  { id: 'w3', type: 'quick-actions', title: 'Quick Actions', titleRo: 'Acțiuni Rapide', size: 'medium', visible: true, position: 2 },
  { id: 'w4', type: 'notifications', title: 'Notifications', titleRo: 'Notificări', size: 'medium', visible: true, position: 3 },
  { id: 'w5', type: 'efactura-status', title: 'e-Factura Status', titleRo: 'Status e-Factura', size: 'large', visible: true, position: 4 },
  { id: 'w6', type: 'recent-activity', title: 'Recent Activity', titleRo: 'Activitate Recentă', size: 'full', visible: true, position: 5 },
  { id: 'w7', type: 'exchange-rate', title: 'Exchange Rates', titleRo: 'Curs Valutar', size: 'small', visible: true, position: 6 },
  { id: 'w8', type: 'vat-calculator', title: 'VAT Calculator', titleRo: 'Calculator TVA', size: 'small', visible: true, position: 7 },
  { id: 'w9', type: 'overdue-invoices', title: 'Overdue Invoices', titleRo: 'Facturi Restante', size: 'medium', visible: true, position: 8 },
  { id: 'w10', type: 'ai-assistant', title: 'AI Assistant', titleRo: 'Asistent AI', size: 'full', visible: true, position: 9 },
];

const AVAILABLE_WIDGETS: Omit<DashboardWidget, 'id' | 'position' | 'visible'>[] = [
  { type: 'cash-flow', title: 'Cash Flow', titleRo: 'Flux Numerar', size: 'large' },
  { type: 'vat-summary', title: 'VAT Summary', titleRo: 'Sumar TVA', size: 'medium' },
  { type: 'efactura-status', title: 'e-Factura Status', titleRo: 'Status e-Factura', size: 'large' },
  { type: 'recent-activity', title: 'Recent Activity', titleRo: 'Activitate Recentă', size: 'full' },
  { type: 'quick-actions', title: 'Quick Actions', titleRo: 'Acțiuni Rapide', size: 'medium' },
  { type: 'notifications', title: 'Notifications', titleRo: 'Notificări', size: 'medium' },
  { type: 'exchange-rate', title: 'Exchange Rates', titleRo: 'Curs Valutar', size: 'small' },
  { type: 'vat-calculator', title: 'VAT Calculator', titleRo: 'Calculator TVA', size: 'small' },
  { type: 'eu-vat', title: 'EU VAT', titleRo: 'TVA UE', size: 'small' },
  { type: 'ai-insights', title: 'AI Insights', titleRo: 'Insights AI', size: 'small' },
  { type: 'overdue-invoices', title: 'Overdue Invoices', titleRo: 'Facturi Restante', size: 'medium' },
  { type: 'cash-forecast', title: 'Cash Forecast', titleRo: 'Prognoză Cash Flow', size: 'medium' },
  { type: 'compliance-deadlines', title: 'Compliance Deadlines', titleRo: 'Termene Conformitate', size: 'medium' },
  { type: 'ai-assistant', title: 'AI Assistant', titleRo: 'Asistent AI', size: 'full' },
];

const SIZE_CLASSES: Record<DashboardWidget['size'], string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
  full: 'col-span-1 md:col-span-2 lg:col-span-4',
};

interface WidgetGridProps {
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
  locale?: 'ro' | 'en';
}

// Persist widgets to localStorage
const STORAGE_KEY = 'documentiulia-dashboard-widgets';

function loadWidgets(): DashboardWidget[] {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that parsed data is an array
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      // If invalid data, clear it and return defaults
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to load widgets:', e);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_WIDGETS;
}

function saveWidgets(widgets: DashboardWidget[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch (e) {
    console.error('Failed to save widgets:', e);
  }
}

export const WidgetGrid = memo(function WidgetGrid({
  renderWidget,
  locale = 'ro',
}: WidgetGridProps) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);

  // Load saved widgets on mount
  useEffect(() => {
    setWidgets(loadWidgets());
  }, []);

  // Save widgets when they change
  useEffect(() => {
    if (widgets !== DEFAULT_WIDGETS) {
      saveWidgets(widgets);
    }
  }, [widgets]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    setWidgets((prev) => {
      const newWidgets = Array.from(prev);
      const [removed] = newWidgets.splice(source.index, 1);
      newWidgets.splice(destination.index, 0, removed);

      // Update positions
      return newWidgets.map((w, i) => ({ ...w, position: i }));
    });
  }, []);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, visible: false } : w))
    );
  }, []);

  const handleAddWidget = useCallback((type: WidgetType) => {
    const widgetTemplate = AVAILABLE_WIDGETS.find((w) => w.type === type);
    if (!widgetTemplate) return;

    const newWidget: DashboardWidget = {
      ...widgetTemplate,
      id: `w-${Date.now()}`,
      visible: true,
      position: widgets.length,
    };

    setWidgets((prev) => [...prev, newWidget]);
    setShowAddWidget(false);
  }, [widgets.length]);

  const handleResetLayout = useCallback(() => {
    router.push('/dashboard/settings/widgets/reset');
  }, [router]);

  const handleResetLayoutConfirmed = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Ensure widgets is always an array before filtering
  const safeWidgets = Array.isArray(widgets) ? widgets : DEFAULT_WIDGETS;
  const visibleWidgets = safeWidgets.filter((w) => w.visible).sort((a, b) => a.position - b.position);
  const hiddenWidgetTypes = AVAILABLE_WIDGETS.filter(
    (available) => !safeWidgets.some((w) => w.type === available.type && w.visible)
  );

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          onClick={() => setShowAddWidget(!showAddWidget)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          aria-label="Adaugă widget"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adaugă</span>
        </button>

        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            isEditMode
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
          }`}
          aria-label={isEditMode ? 'Salvează layout' : 'Editează layout'}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{isEditMode ? 'Salvează' : 'Editează'}</span>
        </button>

        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          aria-label="Resetează layout"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Add Widget Dropdown */}
      {showAddWidget && hiddenWidgetTypes.length > 0 && (
        <div className="absolute right-0 top-12 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Adaugă widget</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {hiddenWidgetTypes.map((widget) => (
              <button
                key={widget.type}
                onClick={() => handleAddWidget(widget.type)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                {locale === 'ro' ? widget.titleRo : widget.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets" direction="vertical">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {visibleWidgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!isEditMode}
                >
                  {(provided: DraggableProvided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${SIZE_CLASSES[widget.size]} ${
                        snapshot.isDragging ? 'opacity-75 shadow-2xl' : ''
                      } ${isEditMode ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
                    >
                      <div className="relative h-full">
                        {/* Edit mode controls */}
                        {isEditMode && (
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                            <div
                              {...provided.dragHandleProps}
                              className="p-1 bg-gray-200 dark:bg-gray-700 rounded cursor-grab active:cursor-grabbing"
                              aria-label="Trage pentru a reordona"
                            >
                              <GripVertical className="w-4 h-4 text-gray-500" />
                            </div>
                            <button
                              onClick={() => handleRemoveWidget(widget.id)}
                              className="p-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded"
                              aria-label="Elimină widget"
                            >
                              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        )}

                        {/* Widget content */}
                        {renderWidget(widget)}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Empty state */}
      {visibleWidgets.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="mb-2">Nu sunt widgeturi vizibile</p>
          <button
            onClick={() => setShowAddWidget(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            Adaugă primul widget
          </button>
        </div>
      )}
    </div>
  );
});

export default WidgetGrid;
