export { default as AdaptiveDashboard } from './AdaptiveDashboard';
export { default as WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from './WidgetWrapper';
export { default as DraggableGridItem } from './DraggableGridItem';
export type { GridPosition } from './DraggableGridItem';
export { getWidgetComponent, widgetRegistry } from './widgets';
export { useDashboard, useAvailableWidgets } from '../../hooks/useDashboard';
