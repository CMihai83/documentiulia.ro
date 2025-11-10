<?php
/**
 * AI-Powered Cash Flow Forecasting Service
 * Predicts future cash flow using historical data and AI algorithms
 */

require_once __DIR__ . '/../config/database.php';

class ForecastingService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Generate cash flow forecast
     */
    public function generateForecast($companyId, $periods = 12, $periodType = 'monthly') {
        // Get historical data
        $historicalData = $this->getHistoricalCashFlow($companyId, 12);

        // Generate forecast using AI/ML
        $forecast = $this->predictCashFlow($companyId, $historicalData, $periods, $periodType);

        // Store forecast in database
        $this->storeForecast($companyId, $forecast, $periodType);

        return $forecast;
    }

    /**
     * Get historical cash flow data
     */
    private function getHistoricalCashFlow($companyId, $months = 12) {
        $data = [];
        $currentDate = new DateTime();

        for ($i = $months - 1; $i >= 0; $i--) {
            $periodStart = (clone $currentDate)->modify("-$i months")->modify('first day of this month');
            $periodEnd = (clone $periodStart)->modify('last day of this month');

            $inflow = $this->getInflowForPeriod($companyId, $periodStart->format('Y-m-d'), $periodEnd->format('Y-m-d'));
            $outflow = $this->getOutflowForPeriod($companyId, $periodStart->format('Y-m-d'), $periodEnd->format('Y-m-d'));

            $data[] = [
                'period' => $periodStart->format('Y-m'),
                'period_start' => $periodStart->format('Y-m-d'),
                'period_end' => $periodEnd->format('Y-m-d'),
                'inflow' => $inflow,
                'outflow' => $outflow,
                'net' => $inflow - $outflow
            ];
        }

        return $data;
    }

    /**
     * Get cash inflow for a period
     */
    private function getInflowForPeriod($companyId, $fromDate, $toDate) {
        // Payments received from customers
        $payments = $this->db->fetchOne("
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE company_id = :company_id
                AND payment_type = 'received'
                AND payment_date BETWEEN :from_date AND :to_date
                AND status = 'completed'
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ])['total'];

        return floatval($payments);
    }

    /**
     * Get cash outflow for a period
     */
    private function getOutflowForPeriod($companyId, $fromDate, $toDate) {
        // Payments to vendors
        $vendorPayments = $this->db->fetchOne("
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE company_id = :company_id
                AND payment_type = 'sent'
                AND payment_date BETWEEN :from_date AND :to_date
                AND status = 'completed'
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ])['total'];

        // Expenses
        $expenses = $this->db->fetchOne("
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE company_id = :company_id
                AND expense_date BETWEEN :from_date AND :to_date
                AND status = 'approved'
        ", [
            'company_id' => $companyId,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ])['total'];

        return floatval($vendorPayments + $expenses);
    }

    /**
     * Predict future cash flow using AI/ML algorithms
     */
    private function predictCashFlow($companyId, $historicalData, $periods, $periodType) {
        $forecast = [];

        // Calculate trends and patterns
        $inflowTrend = $this->calculateTrend(array_column($historicalData, 'inflow'));
        $outflowTrend = $this->calculateTrend(array_column($historicalData, 'outflow'));

        // Detect seasonality
        $inflowSeasonality = $this->detectSeasonality(array_column($historicalData, 'inflow'));
        $outflowSeasonality = $this->detectSeasonality(array_column($historicalData, 'outflow'));

        // Get current balance
        $currentBalance = $this->getCurrentCashBalance($companyId);
        $runningBalance = $currentBalance;

        // Generate forecast for each period
        $currentDate = new DateTime();

        for ($i = 1; $i <= $periods; $i++) {
            $forecastDate = (clone $currentDate)->modify("+$i months");
            $periodStart = (clone $forecastDate)->modify('first day of this month');
            $periodEnd = (clone $periodStart)->modify('last day of this month');

            // Predict inflow using trend + seasonality
            $baseInflow = $this->getAverageValue(array_column($historicalData, 'inflow'));
            $trendAdjustment = $inflowTrend * $i;
            $seasonalFactor = $inflowSeasonality[($i - 1) % count($inflowSeasonality)] ?? 1.0;
            $predictedInflow = ($baseInflow + $trendAdjustment) * $seasonalFactor;

            // Predict outflow
            $baseOutflow = $this->getAverageValue(array_column($historicalData, 'outflow'));
            $outflowTrendAdj = $outflowTrend * $i;
            $outflowSeasonalFactor = $outflowSeasonality[($i - 1) % count($outflowSeasonality)] ?? 1.0;
            $predictedOutflow = ($baseOutflow + $outflowTrendAdj) * $outflowSeasonalFactor;

            // Calculate net and balance
            $netCashFlow = $predictedInflow - $predictedOutflow;
            $runningBalance += $netCashFlow;

            // Calculate confidence level (decreases with distance into future)
            $confidence = max(50, 95 - ($i * 3)); // 95% for month 1, decreases by 3% each month

            $forecast[] = [
                'period' => $forecastDate->format('Y-m'),
                'forecast_date' => $forecastDate->format('Y-m-d'),
                'period_start' => $periodStart->format('Y-m-d'),
                'period_end' => $periodEnd->format('Y-m-d'),
                'forecasted_inflow' => round($predictedInflow, 2),
                'forecasted_outflow' => round($predictedOutflow, 2),
                'forecasted_net' => round($netCashFlow, 2),
                'forecasted_balance' => round($runningBalance, 2),
                'confidence_level' => $confidence,
                'methodology' => 'ai_predicted'
            ];
        }

        return $forecast;
    }

    /**
     * Calculate linear trend
     */
    private function calculateTrend($values) {
        if (empty($values)) return 0;

        $n = count($values);
        $sumX = 0;
        $sumY = array_sum($values);
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $x = $i + 1;
            $y = $values[$i];
            $sumX += $x;
            $sumXY += $x * $y;
            $sumX2 += $x * $x;
        }

        // Calculate slope (trend)
        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);

        return $slope;
    }

    /**
     * Detect seasonality patterns
     */
    private function detectSeasonality($values) {
        if (empty($values)) return [1.0];

        $average = $this->getAverageValue($values);
        if ($average == 0) return array_fill(0, count($values), 1.0);

        $seasonality = [];
        foreach ($values as $value) {
            $seasonality[] = $value / $average;
        }

        return $seasonality;
    }

    /**
     * Calculate average value
     */
    private function getAverageValue($values) {
        if (empty($values)) return 0;
        return array_sum($values) / count($values);
    }

    /**
     * Get current cash balance
     */
    private function getCurrentCashBalance($companyId) {
        $result = $this->db->fetchOne("
            SELECT COALESCE(SUM(balance), 0) as total
            FROM accounts
            WHERE company_id = :company_id
                AND account_type = 'asset'
                AND account_subtype = 'cash'
                AND is_active = true
        ", ['company_id' => $companyId]);

        return floatval($result['total']);
    }

    /**
     * Store forecast in database
     */
    private function storeForecast($companyId, $forecast, $periodType) {
        foreach ($forecast as $period) {
            // Check if forecast already exists
            $existing = $this->db->fetchOne("
                SELECT id FROM cash_flow_forecasts
                WHERE company_id = :company_id
                    AND forecast_date = :forecast_date
            ", [
                'company_id' => $companyId,
                'forecast_date' => $period['forecast_date']
            ]);

            if ($existing) {
                // Update existing forecast
                $this->db->query("
                    UPDATE cash_flow_forecasts
                    SET forecasted_inflow = :inflow,
                        forecasted_outflow = :outflow,
                        forecasted_net = :net,
                        forecasted_balance = :balance,
                        confidence_level = :confidence
                    WHERE id = :id
                ", [
                    'inflow' => $period['forecasted_inflow'],
                    'outflow' => $period['forecasted_outflow'],
                    'net' => $period['forecasted_net'],
                    'balance' => $period['forecasted_balance'],
                    'confidence' => $period['confidence_level'],
                    'id' => $existing['id']
                ]);
            } else {
                // Insert new forecast
                $this->db->insert('cash_flow_forecasts', [
                    'company_id' => $companyId,
                    'forecast_date' => $period['forecast_date'],
                    'forecasted_inflow' => $period['forecasted_inflow'],
                    'forecasted_outflow' => $period['forecasted_outflow'],
                    'forecasted_net' => $period['forecasted_net'],
                    'forecasted_balance' => $period['forecasted_balance'],
                    'confidence_level' => $period['confidence_level']
                ]);
            }
        }
    }

    /**
     * Get stored forecast
     */
    public function getForecast($companyId, $fromDate = null, $toDate = null) {
        $where = ['company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if ($fromDate) {
            $where[] = 'forecast_date >= :from_date';
            $params['from_date'] = $fromDate;
        }

        if ($toDate) {
            $where[] = 'forecast_date <= :to_date';
            $params['to_date'] = $toDate;
        }

        $whereClause = implode(' AND ', $where);

        $forecasts = $this->db->fetchAll("
            SELECT *
            FROM cash_flow_forecasts
            WHERE $whereClause
            ORDER BY forecast_date
        ", $params);

        return $forecasts;
    }

    /**
     * Calculate cash runway (months until cash runs out)
     */
    public function calculateRunway($companyId) {
        $currentBalance = $this->getCurrentCashBalance($companyId);

        // Get average monthly burn rate
        $endDate = date('Y-m-d');
        $startDate = date('Y-m-d', strtotime('-3 months'));

        $avgInflow = $this->getInflowForPeriod($companyId, $startDate, $endDate) / 3;
        $avgOutflow = $this->getOutflowForPeriod($companyId, $startDate, $endDate) / 3;
        $avgBurn = $avgOutflow - $avgInflow;

        if ($avgBurn <= 0) {
            // Positive cash flow - infinite runway
            return [
                'runway_months' => 999,
                'current_balance' => $currentBalance,
                'monthly_burn' => $avgBurn,
                'status' => 'positive',
                'message' => 'You have positive cash flow'
            ];
        }

        $runwayMonths = $currentBalance / $avgBurn;

        return [
            'runway_months' => round($runwayMonths, 1),
            'current_balance' => $currentBalance,
            'monthly_burn' => round($avgBurn, 2),
            'avg_monthly_inflow' => round($avgInflow, 2),
            'avg_monthly_outflow' => round($avgOutflow, 2),
            'status' => $runwayMonths < 6 ? 'critical' : ($runwayMonths < 12 ? 'warning' : 'healthy'),
            'message' => $this->getRunwayMessage($runwayMonths)
        ];
    }

    /**
     * Get runway message
     */
    private function getRunwayMessage($months) {
        if ($months < 3) {
            return "Critical: Only {$months} months of runway remaining. Immediate action required.";
        } elseif ($months < 6) {
            return "Warning: {$months} months of runway. Consider cost reduction or revenue increase.";
        } elseif ($months < 12) {
            return "Caution: {$months} months of runway. Monitor cash flow closely.";
        } else {
            return "Healthy: {$months} months of runway. Cash position is strong.";
        }
    }

    /**
     * Scenario planning - what-if analysis
     */
    public function scenarioAnalysis($companyId, $scenarios) {
        $results = [];

        foreach ($scenarios as $name => $changes) {
            $forecast = $this->generateForecast($companyId, 12, 'monthly');

            // Apply scenario changes
            foreach ($forecast as &$period) {
                if (isset($changes['revenue_change_percent'])) {
                    $period['forecasted_inflow'] *= (1 + $changes['revenue_change_percent'] / 100);
                }

                if (isset($changes['expense_change_percent'])) {
                    $period['forecasted_outflow'] *= (1 + $changes['expense_change_percent'] / 100);
                }

                // Recalculate net and balance
                $period['forecasted_net'] = $period['forecasted_inflow'] - $period['forecasted_outflow'];
            }

            $results[$name] = $forecast;
        }

        return $results;
    }
}
