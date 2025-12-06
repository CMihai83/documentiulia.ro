import React, { useState, useCallback, useRef } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useDashboard, useAvailableWidgets, type DashboardWidget, type WidgetPosition } from '../../hooks/useDashboard';
import WidgetWrapper from './WidgetWrapper';
import DraggableGridItem, { type GridPosition } from './DraggableGridItem';
import { getWidgetComponent } from './widgets';

/**
 * Adaptive Dashboard Component
 * Displays a persona-specific dashboard layout with customizable widgets
 * Supports drag-and-drop and resize functionality for widget customization
 */
const AdaptiveDashboard: React.FC = () => {
  const { language } = useI18n();
  const isRo = language === 'ro';
  const { widgets, loading, error, hasCustomLayout, saveLayout, resetToDefault, refreshLayout } = useDashboard();
  const { widgets: availableWidgets, byCategory } = useAvailableWidgets();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([]);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync local widgets when entering edit mode
  const enterEditMode = useCallback(() => {
    setLocalWidgets([...widgets]);
    setIsEditMode(true);
  }, [widgets]);

  // Save changes
  const saveChanges = useCallback(async () => {
    const positions: WidgetPosition[] = localWidgets.map(w => ({
      widget_id: w.widget_id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h
    }));

    const success = await saveLayout(positions);
    if (success) {
      setIsEditMode(false);
    }
  }, [localWidgets, saveLayout]);

  // Cancel edit mode
  const cancelEdit = useCallback(() => {
    setLocalWidgets([]);
    setIsEditMode(false);
    setShowAddWidget(false);
  }, []);

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setLocalWidgets(prev => prev.filter(w => w.widget_id !== widgetId));
  }, []);

  // Handle widget position/size change (drag or resize)
  const handlePositionChange = useCallback((widgetId: string, newPosition: GridPosition) => {
    setLocalWidgets(prev => prev.map(w =>
      w.widget_id === widgetId
        ? { ...w, x: newPosition.x, y: newPosition.y, w: newPosition.w, h: newPosition.h }
        : w
    ));
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((widgetId: string) => {
    setDraggedWidgetId(widgetId);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedWidgetId(null);
  }, []);

  // Add widget
  const addWidget = useCallback((widgetId: string) => {
    const available = availableWidgets.find(w => w.id === widgetId);
    if (!available) return;

    // Find empty position
    const maxY = Math.max(0, ...localWidgets.map(w => w.y + w.h));

    const newWidget: DashboardWidget = {
      widget_id: widgetId,
      x: 0,
      y: maxY,
      w: available.default_width,
      h: available.default_height,
      name: available.name,
      description: available.description,
      category: available.category,
      component_name: available.component_name,
      data_source: available.data_source,
      refresh_interval: 300,
      min_width: 3,
      min_height: 2,
      max_width: 12,
      max_height: 8,
      is_resizable: true,
      is_removable: true
    };

    setLocalWidgets(prev => [...prev, newWidget]);
    setShowAddWidget(false);
  }, [availableWidgets, localWidgets]);

  // Reset to default
  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(
      isRo
        ? 'Sigur dorești să resetezi dashboard-ul la configurația implicită?'
        : 'Are you sure you want to reset the dashboard to the default layout?'
    );

    if (confirmed) {
      await resetToDefault();
      setIsEditMode(false);
    }
  }, [resetToDefault, isRo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={refreshLayout}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
        >
          {isRo ? 'Reîncarcă' : 'Retry'}
        </button>
      </div>
    );
  }

  const displayWidgets = isEditMode ? localWidgets : widgets;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isRo ? 'Dashboard' : 'Dashboard'}
        </h1>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => setShowAddWidget(true)}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                + {isRo ? 'Adaugă widget' : 'Add widget'}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {isRo ? 'Resetează' : 'Reset'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {isRo ? 'Anulează' : 'Cancel'}
              </button>
              <button
                onClick={saveChanges}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isRo ? 'Salvează' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              {isRo ? 'Personalizează' : 'Customize'}
            </button>
          )}
        </div>
      </div>

      {hasCustomLayout && !isEditMode && (
        <div className="text-xs text-gray-500">
          {isRo ? 'Utilizezi un layout personalizat' : 'Using custom layout'}
        </div>
      )}

      {/* Widget Grid */}
      <div
        ref={gridRef}
        className="grid gap-4 relative"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridAutoRows: '80px'
        }}
      >
        {displayWidgets.map(widget => {
          const WidgetComponent = getWidgetComponent(widget.component_name);
          // isDragged could be used for visual effects: draggedWidgetId === widget.widget_id

          return isEditMode ? (
            <DraggableGridItem
              key={widget.widget_id}
              id={widget.widget_id}
              position={{ x: widget.x, y: widget.y, w: widget.w, h: widget.h }}
              isEditMode={isEditMode}
              isResizable={widget.is_resizable}
              minW={widget.min_width}
              minH={widget.min_height}
              maxW={widget.max_width}
              maxH={widget.max_height}
              onPositionChange={handlePositionChange}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <WidgetWrapper
                widget={widget}
                isEditMode={isEditMode}
                onRemove={() => removeWidget(widget.widget_id)}
              >
                {WidgetComponent ? <WidgetComponent /> : <div>Widget not found</div>}
              </WidgetWrapper>
            </DraggableGridItem>
          ) : (
            <div
              key={widget.widget_id}
              style={{
                gridColumn: `span ${widget.w}`,
                gridRow: `span ${widget.h}`
              }}
            >
              <WidgetWrapper
                widget={widget}
                isEditMode={false}
              >
                {WidgetComponent ? <WidgetComponent /> : <div>Widget not found</div>}
              </WidgetWrapper>
            </div>
          );
        })}

        {/* Drop zone indicators for edit mode */}
        {isEditMode && draggedWidgetId && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridAutoRows: '80px'
              }}
            >
              {Array.from({ length: 48 }, (_, i) => (
                <div
                  key={i}
                  className="border border-dashed border-gray-200 rounded-lg bg-gray-50/30"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isRo ? 'Adaugă widget' : 'Add widget'}
              </h2>
              <button
                onClick={() => setShowAddWidget(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {Object.entries(byCategory).map(([category, categoryWidgets]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryWidgets.map(widget => {
                      const isAdded = localWidgets.some(w => w.widget_id === widget.id);
                      return (
                        <button
                          key={widget.id}
                          onClick={() => !isAdded && addWidget(widget.id)}
                          disabled={isAdded}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            isAdded
                              ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{widget.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{widget.description}</div>
                          {isAdded && (
                            <div className="text-xs text-green-600 mt-1">
                              {isRo ? 'Deja adăugat' : 'Already added'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveDashboard;
