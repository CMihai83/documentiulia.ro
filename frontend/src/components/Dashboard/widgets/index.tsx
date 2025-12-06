import React from 'react';

// Import all widget components
import KPISummaryWidget from './KPISummaryWidget';
import QuickActionsWidget from './QuickActionsWidget';
import RecentActivityWidget from './RecentActivityWidget';

// Placeholder component for widgets not yet implemented
const PlaceholderWidget: React.FC<{ name: string; icon?: string }> = ({ name, icon = '🚧' }) => (
  <div className="flex items-center justify-center h-full text-gray-400">
    <div className="text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{name}</div>
      <div className="text-xs">Coming soon</div>
    </div>
  </div>
);

// Widget registry - maps component names to actual React components
export const widgetRegistry: Record<string, React.FC<any>> = {
  // Core widgets (implemented)
  KPISummaryWidget,
  QuickActionsWidget,
  RecentActivityWidget,

  // Financial widgets
  RevenueChartWidget: () => <PlaceholderWidget name="Revenue Chart" icon="📈" />,
  ExpenseChartWidget: () => <PlaceholderWidget name="Expense Chart" icon="📉" />,
  OutstandingInvoicesWidget: () => <PlaceholderWidget name="Outstanding Invoices" icon="📄" />,
  CashFlowWidget: () => <PlaceholderWidget name="Cash Flow" icon="💰" />,
  TodaySalesWidget: () => <PlaceholderWidget name="Today's Sales" icon="🛒" />,

  // Operational widgets
  TodayTasksWidget: () => <PlaceholderWidget name="Today's Tasks" icon="✅" />,
  TimeTrackerWidget: () => <PlaceholderWidget name="Time Tracker" icon="⏱️" />,
  ClientOverviewWidget: () => <PlaceholderWidget name="Client Overview" icon="👥" />,

  // Construction/Projects widgets
  ActiveProjectsWidget: () => <PlaceholderWidget name="Active Projects" icon="🏗️" />,
  CrewScheduleWidget: () => <PlaceholderWidget name="Crew Schedule" icon="👷" />,
  MaterialAlertsWidget: () => <PlaceholderWidget name="Material Alerts" icon="🧱" />,

  // Delivery/Transport widgets
  TodaysDeliveriesWidget: () => <PlaceholderWidget name="Today's Deliveries" icon="📦" />,
  TodaysRoutesWidget: () => <PlaceholderWidget name="Today's Routes" icon="🛤️" />,
  FleetStatusWidget: () => <PlaceholderWidget name="Fleet Status" icon="🚚" />,
  DeliveryMetricsWidget: () => <PlaceholderWidget name="Delivery Metrics" icon="📊" />,
  ActiveRoutesWidget: () => <PlaceholderWidget name="Active Routes" icon="🗺️" />,
  FuelConsumptionWidget: () => <PlaceholderWidget name="Fuel Consumption" icon="⛽" />,

  // Inventory widgets
  InventoryAlertsWidget: () => <PlaceholderWidget name="Inventory Alerts" icon="📦" />,
  LowStockAlertsWidget: () => <PlaceholderWidget name="Low Stock Alerts" icon="⚠️" />,
  TopProductsWidget: () => <PlaceholderWidget name="Top Products" icon="🏆" />,
  OrdersStatusWidget: () => <PlaceholderWidget name="Orders Status" icon="📋" />,

  // Medical widgets
  TodaysAppointmentsWidget: () => <PlaceholderWidget name="Today's Appointments" icon="📅" />,
  PatientStatsWidget: () => <PlaceholderWidget name="Patient Stats" icon="🏥" />,

  // Beauty/Services widgets
  ClientStatsWidget: () => <PlaceholderWidget name="Client Stats" icon="💇" />,

  // HoReCa widgets
  TodaysReservationsWidget: () => <PlaceholderWidget name="Today's Reservations" icon="🍽️" />,

  // Electrical widgets
  ServiceCallsTodayWidget: () => <PlaceholderWidget name="Service Calls Today" icon="🔧" />,

  // Agriculture widgets
  WeatherForecastWidget: () => <PlaceholderWidget name="Weather Forecast" icon="🌤️" />,
  CropStatusWidget: () => <PlaceholderWidget name="Crop Status" icon="🌾" />
};

/**
 * Get widget component by name
 */
export function getWidgetComponent(componentName: string): React.FC<any> | null {
  return widgetRegistry[componentName] || null;
}

export default widgetRegistry;
