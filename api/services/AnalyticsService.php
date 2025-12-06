<?php
/**
 * Analytics & BI Service
 *
 * Dashboards, KPIs, custom reports, data visualization
 */

require_once __DIR__ . '/../config/database.php';

class AnalyticsService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ==================== DASHBOARDS ====================

    public function listDashboards($companyId, $filters = []) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];
        
        if (!empty($filters['dashboard_type'])) {
            $conditions[] = "dashboard_type = $2";
            $params[] = $filters['dashboard_type'];
        }
        
        $where = implode(' AND ', $conditions);
        return $this->db->fetchAll(
            "SELECT * FROM dashboards WHERE $where ORDER BY name",
            $params
        );
    }

    public function getDashboard($dashboardId, $companyId) {
        $dashboard = $this->db->fetchOne(
            "SELECT * FROM dashboards WHERE id = $1 AND company_id = $2",
            [$dashboardId, $companyId]
        );
        
        if (!$dashboard) {
            throw new Exception('Dashboard not found');
        }
        
        $dashboard['widgets'] = $this->db->fetchAll(
            "SELECT * FROM dashboard_widgets WHERE dashboard_id = $1 ORDER BY position_y, position_x",
            [$dashboardId]
        );
        
        return $dashboard;
    }

    public function createDashboard($companyId, $userId, $data) {
        $result = $this->db->execute(
            "INSERT INTO dashboards (company_id, name, description, dashboard_type, layout, is_public, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [
                $companyId,
                $data['name'],
                $data['description'] ?? null,
                $data['dashboard_type'] ?? 'custom',
                json_encode($data['layout'] ?? []),
                $data['is_public'] ?? false,
                $userId
            ]
        );
        
        return $result['id'];
    }

    // ==================== WIDGETS ====================

    public function addWidget($dashboardId, $companyId, $data) {
        // Verify dashboard exists
        $dashboard = $this->db->fetchOne(
            "SELECT id FROM dashboards WHERE id = $1 AND company_id = $2",
            [$dashboardId, $companyId]
        );
        
        if (!$dashboard) {
            throw new Exception('Dashboard not found');
        }
        
        $result = $this->db->execute(
            "INSERT INTO dashboard_widgets (dashboard_id, widget_type, chart_type, title, data_source, query_config, visualization_config)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [
                $dashboardId,
                $data['widget_type'],
                $data['chart_type'] ?? null,
                $data['title'],
                $data['data_source'],
                json_encode($data['query_config']),
                json_encode($data['visualization_config'] ?? [])
            ]
        );
        
        return $result['id'];
    }

    public function getWidgetData($widgetId, $companyId) {
        $widget = $this->db->fetchOne(
            "SELECT w.*, d.company_id FROM dashboard_widgets w
             JOIN dashboards d ON w.dashboard_id = d.id
             WHERE w.id = $1 AND d.company_id = $2",
            [$widgetId, $companyId]
        );
        
        if (!$widget) {
            throw new Exception('Widget not found');
        }
        
        $config = json_decode($widget['query_config'], true);
        return $this->executeWidgetQuery($widget['data_source'], $config, $companyId);
    }

    private function executeWidgetQuery($source, $config, $companyId) {
        switch ($source) {
            case 'revenue':
                return $this->getRevenueData($config, $companyId);
            case 'expenses':
                return $this->getExpenseData($config, $companyId);
            default:
                throw new Exception('Unknown data source: ' . $source);
        }
    }

    private function getRevenueData($config, $companyId) {
        $startDate = $config['start_date'] ?? date('Y-m-d', strtotime('-12 months'));
        $endDate = $config['end_date'] ?? date('Y-m-d');
        
        return $this->db->fetchAll(
            "SELECT DATE_TRUNC('month', invoice_date)::date as period,
                    SUM(total_amount) as total_revenue,
                    COUNT(*) as count
             FROM invoices
             WHERE company_id = $1 AND invoice_date BETWEEN $2 AND $3
             GROUP BY period ORDER BY period",
            [$companyId, $startDate, $endDate]
        );
    }

    private function getExpenseData($config, $companyId) {
        $startDate = $config['start_date'] ?? date('Y-m-d', strtotime('-12 months'));
        $endDate = $config['end_date'] ?? date('Y-m-d');
        
        return $this->db->fetchAll(
            "SELECT category, SUM(amount) as total_amount, COUNT(*) as count
             FROM expenses
             WHERE company_id = $1 AND expense_date BETWEEN $2 AND $3
             GROUP BY category ORDER BY total_amount DESC",
            [$companyId, $startDate, $endDate]
        );
    }

    // ==================== KPIs ====================

    public function listKPIs($companyId, $filters = []) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];
        
        if (!empty($filters['category'])) {
            $conditions[] = "category = $2";
            $params[] = $filters['category'];
        }
        
        $where = implode(' AND ', $conditions);
        return $this->db->fetchAll(
            "SELECT * FROM kpis WHERE $where ORDER BY category, name",
            $params
        );
    }

    public function createKPI($companyId, $userId, $data) {
        $result = $this->db->execute(
            "INSERT INTO kpis (company_id, name, description, category, metric_type, calculation_method, calculation_config, target_value, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
            [
                $companyId,
                $data['name'],
                $data['description'] ?? null,
                $data['category'] ?? null,
                $data['metric_type'],
                $data['calculation_method'],
                json_encode($data['calculation_config']),
                $data['target_value'] ?? null,
                $userId
            ]
        );
        
        return $result['id'];
    }

    public function recordKPIValue($kpiId, $companyId, $userId, $data) {
        $kpi = $this->db->fetchOne(
            "SELECT * FROM kpis WHERE id = $1 AND company_id = $2",
            [$kpiId, $companyId]
        );
        
        if (!$kpi) {
            throw new Exception('KPI not found');
        }
        
        $result = $this->db->execute(
            "INSERT INTO kpi_values (kpi_id, period_date, actual_value, target_value, recorded_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [
                $kpiId,
                $data['period_date'],
                $data['actual_value'],
                $data['target_value'] ?? $kpi['target_value'],
                $userId
            ]
        );
        
        return $result['id'];
    }

    // ==================== CUSTOM REPORTS ====================

    public function listCustomReports($companyId, $filters = []) {
        return $this->db->fetchAll(
            "SELECT * FROM custom_reports WHERE company_id = $1 ORDER BY name",
            [$companyId]
        );
    }

    public function createCustomReport($companyId, $userId, $data) {
        $result = $this->db->execute(
            "INSERT INTO custom_reports (company_id, name, description, data_source, query_template, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [
                $companyId,
                $data['name'],
                $data['description'] ?? null,
                $data['data_source'],
                $data['query_template'],
                $userId
            ]
        );
        
        return $result['id'];
    }

    // ==================== METRICS ====================

    public function getDashboardMetrics($companyId, $startDate, $endDate) {
        $result = $this->db->fetchOne(
            "SELECT get_dashboard_metrics($1, $2, $3) as metrics",
            [$companyId, $startDate, $endDate]
        );

        return json_decode($result['metrics'], true);
    }

    // ==================== ANALYTICS ====================

    /**
     * Get revenue trend over time
     */
    public function getRevenueTrend($companyId, $startDate, $endDate, $groupBy = 'month') {
        $dateFormat = match($groupBy) {
            'day' => 'YYYY-MM-DD',
            'week' => 'IYYY-IW',
            'year' => 'YYYY',
            default => 'YYYY-MM'
        };

        $dateTrunc = match($groupBy) {
            'day' => 'day',
            'week' => 'week',
            'year' => 'year',
            default => 'month'
        };

        return $this->db->fetchAll(
            "SELECT
                TO_CHAR(DATE_TRUNC('$dateTrunc', invoice_date), '$dateFormat') as period,
                COUNT(*) as invoice_count,
                SUM(total_amount) as total_revenue,
                SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
                SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount
             FROM invoices
             WHERE company_id = :company_id
               AND invoice_date BETWEEN :start_date AND :end_date
             GROUP BY DATE_TRUNC('$dateTrunc', invoice_date)
             ORDER BY DATE_TRUNC('$dateTrunc', invoice_date)",
            [
                'company_id' => $companyId,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        );
    }

    /**
     * Get top customers by revenue
     */
    public function getTopCustomers($companyId, $startDate, $endDate, $limit = 10) {
        return $this->db->fetchAll(
            "SELECT
                c.id as customer_id,
                c.display_name as customer_name,
                c.email,
                COUNT(i.id) as invoice_count,
                COALESCE(SUM(i.total_amount), 0) as total_revenue,
                COALESCE(AVG(i.total_amount), 0) as average_order_value,
                MAX(i.invoice_date) as last_invoice_date
             FROM contacts c
             LEFT JOIN invoices i ON c.id = i.customer_id
                AND i.invoice_date BETWEEN :start_date AND :end_date
             WHERE c.company_id = :company_id
               AND c.contact_type IN ('customer', 'both')
             GROUP BY c.id, c.display_name, c.email
             HAVING COALESCE(SUM(i.total_amount), 0) > 0
             ORDER BY total_revenue DESC
             LIMIT :limit",
            [
                'company_id' => $companyId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'limit' => $limit
            ]
        );
    }

    /**
     * Get aging report for accounts receivable
     */
    public function getAgingReport($companyId, $asOfDate = null) {
        $asOfDate = $asOfDate ?? date('Y-m-d');

        return $this->db->fetchAll(
            "SELECT
                c.id as customer_id,
                c.display_name as customer_name,
                COALESCE(SUM(CASE WHEN i.due_date >= :as_of_date THEN i.amount_due ELSE 0 END), 0) as current_amount,
                COALESCE(SUM(CASE WHEN i.due_date < :as_of_date AND i.due_date >= :as_of_date::date - INTERVAL '30 days' THEN i.amount_due ELSE 0 END), 0) as days_1_30,
                COALESCE(SUM(CASE WHEN i.due_date < :as_of_date::date - INTERVAL '30 days' AND i.due_date >= :as_of_date::date - INTERVAL '60 days' THEN i.amount_due ELSE 0 END), 0) as days_31_60,
                COALESCE(SUM(CASE WHEN i.due_date < :as_of_date::date - INTERVAL '60 days' AND i.due_date >= :as_of_date::date - INTERVAL '90 days' THEN i.amount_due ELSE 0 END), 0) as days_61_90,
                COALESCE(SUM(CASE WHEN i.due_date < :as_of_date::date - INTERVAL '90 days' THEN i.amount_due ELSE 0 END), 0) as days_over_90,
                COALESCE(SUM(i.amount_due), 0) as total_outstanding
             FROM contacts c
             JOIN invoices i ON c.id = i.customer_id
             WHERE c.company_id = :company_id
               AND i.status IN ('sent', 'overdue', 'partial')
               AND i.amount_due > 0
             GROUP BY c.id, c.display_name
             HAVING COALESCE(SUM(i.amount_due), 0) > 0
             ORDER BY total_outstanding DESC",
            [
                'company_id' => $companyId,
                'as_of_date' => $asOfDate
            ]
        );
    }
}
