import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { I18nProvider } from './i18n/I18nContext';
import { PWAProviderUI } from './pwa';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import BillsPage from './pages/BillsPage';
import InsightsPage from './pages/InsightsPage';
import ExpensesPage from './pages/ExpensesPage';
import AccountingPage from './pages/AccountingPage';
import SettingsPage from './pages/SettingsPage';
import ContactsPage from './pages/ContactsPage';
import FiscalLawPage from './pages/FiscalLawPage';
import BusinessConsultantPage from './pages/BusinessConsultantPage';
import FiscalLawAIPage from './pages/FiscalLawAIPage';
import PersonalContextPage from './pages/PersonalContextPage';
import DecisionTreesPage from './pages/DecisionTreesPage';
import DecisionTreeUpdatesPage from './pages/admin/DecisionTreeUpdates';
import TutorialsPage from './pages/TutorialsPage';
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import ProductsPage from './pages/inventory/ProductsPage';
import StockLevelsPage from './pages/inventory/StockLevelsPage';
import WarehousesPage from './pages/inventory/WarehousesPage';
import LowStockAlertsPage from './pages/inventory/LowStockAlertsPage';
import StockMovementsPage from './pages/inventory/StockMovementsPage';
import StockAdjustmentsPage from './pages/inventory/StockAdjustmentsPage';
import StockTransfersPage from './pages/inventory/StockTransfersPage';
import CRMDashboard from './pages/crm/CRMDashboard';
import OpportunitiesPage from './pages/crm/OpportunitiesPage';
import OpportunityDetailPage from './pages/crm/OpportunityDetailPage';
import QuotationsPage from './pages/crm/QuotationsPage';
import PurchaseOrdersPage from './pages/purchase-orders/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/purchase-orders/PurchaseOrderDetailPage';
import TimeTrackingDashboard from './pages/time-tracking/TimeTrackingDashboard';
import TimeEntriesPage from './pages/time-tracking/TimeEntriesPage';
import ProjectsDashboard from './pages/projects/ProjectsDashboard';
import SprintsList from './pages/sprints/SprintsList';
import SprintBoard from './pages/sprints/SprintBoard';
import SprintPlanning from './pages/sprints/SprintPlanning';
import SprintRetrospective from './pages/sprints/SprintRetrospective';
import GanttView from './pages/projects/GanttView';
import ChartOfAccountsPage from './pages/advanced-accounting/ChartOfAccountsPage';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import CategoryManagementPage from './pages/settings/CategoryManagementPage';
import GeneralLedgerPage from './pages/accounting/GeneralLedgerPage';
import TaxCodesPage from './pages/settings/TaxCodesPage';
import FixedAssetsPage from './pages/accounting/FixedAssetsPage';
import CourseCatalog from './pages/courses/CourseCatalog';
import CourseDetail from './pages/courses/CourseDetail';
import StudentDashboard from './pages/courses/StudentDashboard';
import LessonPlayer from './components/courses/LessonPlayer';
import SubscriptionDashboard from './pages/subscription/SubscriptionDashboard';
import PricingPlans from './pages/subscription/PricingPlans';
import BillingHistory from './pages/subscription/BillingHistory';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import ProfitLossReport from './pages/reports/ProfitLossReport';
import BudgetVsActualReport from './pages/reports/BudgetVsActualReport';
import CashFlowReport from './pages/reports/CashFlowReport';
import BankConnectionsPage from './pages/bank/BankConnectionsPage';
import TransactionsPage from './pages/bank/TransactionsPage';
import BankCallbackPage from './pages/bank/BankCallbackPage';
import ReceiptUploadPage from './pages/receipts/ReceiptUploadPage';
import ReceiptsListPage from './pages/receipts/ReceiptsListPage';
import ReceiptTemplateEditor from './pages/receipts/ReceiptTemplateEditor';
import TemplatesListPage from './pages/receipts/TemplatesListPage';
import ForumHomePage from './pages/forum/ForumHomePage';
import ForumCategoryPage from './pages/forum/ForumCategoryPage';
import ForumThreadPage from './pages/forum/ForumThreadPage';
import ForumNewThreadPage from './pages/forum/ForumNewThreadPage';
import EFacturaSettingsPage from './pages/efactura/EFacturaSettingsPage';
import EFacturaAnalyticsPage from './pages/efactura/EFacturaAnalyticsPage';
import ReceivedInvoicesPageWrapper from './pages/efactura/ReceivedInvoicesPage';
import BatchUploadPage from './pages/efactura/BatchUploadPage';
import PayrollPage from './pages/payroll/PayrollPage';
import PayrollDetailPage from './pages/payroll/PayrollDetailPage';
import FiscalCalendarPage from './pages/fiscal-calendar/FiscalCalendarPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import PaymentsPage from './pages/PaymentsPage';
import RecurringInvoicesPage from './pages/RecurringInvoicesPage';
import JournalEntriesPage from './pages/accounting/JournalEntriesPage';
import OnboardingPage from './pages/OnboardingPage';
import FeaturesPage from './pages/FeaturesPage';

// Admin Route Component (requires admin role)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/fiscal-law" element={<FiscalLawPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Onboarding Route */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <ProtectedRoute>
            <InvoiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id/edit"
        element={
          <ProtectedRoute>
            <InvoiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills"
        element={
          <ProtectedRoute>
            <BillsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounting"
        element={
          <ProtectedRoute>
            <AccountingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/profit-loss"
        element={
          <ProtectedRoute>
            <ProfitLossReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/budget-vs-actual"
        element={
          <ProtectedRoute>
            <BudgetVsActualReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/cash-flow"
        element={
          <ProtectedRoute>
            <CashFlowReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank/connections"
        element={
          <ProtectedRoute>
            <BankConnectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank/callback"
        element={
          <ProtectedRoute>
            <BankCallbackPage />
          </ProtectedRoute>
        }
      />

      {/* Receipt OCR Routes */}
      <Route
        path="/receipts/upload"
        element={
          <ProtectedRoute>
            <ReceiptUploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipts/list"
        element={
          <ProtectedRoute>
            <ReceiptsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipts/templates"
        element={
          <ProtectedRoute>
            <TemplatesListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipts/template/:receiptId"
        element={
          <ProtectedRoute>
            <ReceiptTemplateEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/categories"
        element={
          <ProtectedRoute>
            <CategoryManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/tax-codes"
        element={
          <ProtectedRoute>
            <TaxCodesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <ContactsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-consultant"
        element={
          <ProtectedRoute>
            <BusinessConsultantPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fiscal-law"
        element={
          <ProtectedRoute>
            <FiscalLawAIPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personal-context"
        element={
          <ProtectedRoute>
            <PersonalContextPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/decision-trees"
        element={
          <ProtectedRoute>
            <DecisionTreesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutorials"
        element={
          <ProtectedRoute>
            <TutorialsPage />
          </ProtectedRoute>
        }
      />

      {/* Inventory Routes */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/products"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stock-levels"
        element={
          <ProtectedRoute>
            <StockLevelsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/warehouses"
        element={
          <ProtectedRoute>
            <WarehousesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/low-stock"
        element={
          <ProtectedRoute>
            <LowStockAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/movements"
        element={
          <ProtectedRoute>
            <StockMovementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/adjustments"
        element={
          <ProtectedRoute>
            <StockAdjustmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/transfers"
        element={
          <ProtectedRoute>
            <StockTransfersPage />
          </ProtectedRoute>
        }
      />

      {/* CRM Routes */}
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <CRMDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm/opportunities"
        element={
          <ProtectedRoute>
            <OpportunitiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm/opportunities/:id"
        element={
          <ProtectedRoute>
            <OpportunityDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm/quotations"
        element={
          <ProtectedRoute>
            <QuotationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm/contacts"
        element={
          <ProtectedRoute>
            <ContactsPage />
          </ProtectedRoute>
        }
      />

      {/* Purchase Orders Routes */}
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute>
            <PurchaseOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/:id"
        element={
          <ProtectedRoute>
            <PurchaseOrderDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Time Tracking Routes */}
      <Route
        path="/time-tracking"
        element={
          <ProtectedRoute>
            <TimeTrackingDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/time/entries"
        element={
          <ProtectedRoute>
            <TimeEntriesPage />
          </ProtectedRoute>
        }
      />

      {/* Project Management Routes */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsDashboard />
          </ProtectedRoute>
        }
      />

      {/* Scrum / Sprint Management Routes */}
      <Route
        path="/sprints"
        element={
          <ProtectedRoute>
            <SprintsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sprints/planning"
        element={
          <ProtectedRoute>
            <SprintPlanning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sprints/:sprintId/board"
        element={
          <ProtectedRoute>
            <SprintBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sprints/:sprintId/retrospective"
        element={
          <ProtectedRoute>
            <SprintRetrospective />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gantt"
        element={
          <ProtectedRoute>
            <GanttView />
          </ProtectedRoute>
        }
      />

      {/* Advanced Accounting Routes */}
      <Route
        path="/accounting/chart-of-accounts"
        element={
          <ProtectedRoute>
            <ChartOfAccountsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounting/general-ledger"
        element={
          <ProtectedRoute>
            <GeneralLedgerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounting/fixed-assets"
        element={
          <ProtectedRoute>
            <FixedAssetsPage />
          </ProtectedRoute>
        }
      />

      {/* Analytics & BI Routes */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />

      {/* Payroll Routes */}
      <Route
        path="/dashboard/payroll"
        element={
          <ProtectedRoute>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/payroll/:id"
        element={
          <ProtectedRoute>
            <PayrollDetailPage />
          </ProtectedRoute>
        }
      />

      {/* HR Routes */}
      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />

      {/* Payments Routes */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />

      {/* Recurring Invoices Routes */}
      <Route
        path="/recurring-invoices"
        element={
          <ProtectedRoute>
            <RecurringInvoicesPage />
          </ProtectedRoute>
        }
      />

      {/* Accounting Routes */}
      <Route
        path="/accounting/journal-entries"
        element={
          <ProtectedRoute>
            <JournalEntriesPage />
          </ProtectedRoute>
        }
      />

      {/* Fiscal Calendar Routes */}
      <Route
        path="/dashboard/fiscal-calendar"
        element={
          <ProtectedRoute>
            <FiscalCalendarPage />
          </ProtectedRoute>
        }
      />

      {/* Features Route */}
      <Route
        path="/features"
        element={
          <ProtectedRoute>
            <FeaturesPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/decision-tree-updates"
        element={
          <AdminRoute>
            <DecisionTreeUpdatesPage />
          </AdminRoute>
        }
      />

      {/* Course Platform Routes */}
      <Route path="/courses" element={<CourseCatalog />} />
      <Route path="/courses/:slug" element={<CourseDetail />} />
      <Route
        path="/courses/:courseId/learn"
        element={
          <ProtectedRoute>
            <LessonPlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/learn/:lessonId"
        element={
          <ProtectedRoute>
            <LessonPlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-courses"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Subscription Routes */}
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/subscription/plans" element={<PricingPlans />} />
      <Route
        path="/subscription/billing"
        element={
          <ProtectedRoute>
            <BillingHistory />
          </ProtectedRoute>
        }
      />

      {/* Forum Routes */}
      <Route path="/forum" element={<ForumHomePage />} />
      <Route path="/forum/category/:slug" element={<ForumCategoryPage />} />
      <Route path="/forum/thread/:id" element={<ForumThreadPage />} />
      <Route
        path="/forum/new-thread"
        element={
          <ProtectedRoute>
            <ForumNewThreadPage />
          </ProtectedRoute>
        }
      />

      {/* e-Factura Routes */}
      <Route
        path="/efactura/settings"
        element={
          <ProtectedRoute>
            <EFacturaSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/efactura/analytics"
        element={
          <ProtectedRoute>
            <EFacturaAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/efactura/received"
        element={
          <ProtectedRoute>
            <ReceivedInvoicesPageWrapper />
          </ProtectedRoute>
        }
      />
      <Route
        path="/efactura/batch-upload"
        element={
          <ProtectedRoute>
            <BatchUploadPage />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <ProjectProvider>
            <AppRoutes />
            <PWAProviderUI />
          </ProjectProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}

export default App;
