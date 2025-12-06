<?php
/**
 * Sync Dashboard Widget
 */

class DocumentiUlia_WC_Sync_Dashboard {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
    }

    /**
     * Add dashboard widget
     */
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'documentiulia_sync_status',
            __('DocumentiUlia - Status Sincronizare', 'documentiulia-woocommerce'),
            array($this, 'render_dashboard_widget')
        );
    }

    /**
     * Render dashboard widget
     */
    public function render_dashboard_widget() {
        global $wpdb;

        // Get connection status
        $api_client = new DocumentiUlia_WC_API_Client();
        $connection_ok = $api_client->test_connection();

        // Get sync statistics (last 24 hours)
        $stats = $wpdb->get_row(
            "SELECT
                COUNT(*) as total_syncs,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_syncs,
                MAX(created_at) as last_sync_time
            FROM {$wpdb->prefix}documentiulia_sync_log
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
        );

        // Get recent sync activity
        $recent_syncs = $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}documentiulia_sync_log
             ORDER BY created_at DESC LIMIT 5"
        );

        ?>
        <div class="documentiulia-dashboard-widget">
            <!-- Connection Status -->
            <div class="connection-status-row">
                <strong><?php _e('Status Conexiune:', 'documentiulia-woocommerce'); ?></strong>
                <?php if ($connection_ok): ?>
                    <span class="status-badge status-success">✓ Conectat</span>
                <?php else: ?>
                    <span class="status-badge status-error">✗ Deconectat</span>
                    <p class="description"><?php _e('Verificați setările de conexiune', 'documentiulia-woocommerce'); ?></p>
                <?php endif; ?>
            </div>

            <!-- Sync Statistics -->
            <div class="sync-stats">
                <h4><?php _e('Statistici Ultimele 24h', 'documentiulia-woocommerce'); ?></h4>

                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value"><?php echo number_format($stats->total_syncs ?? 0); ?></div>
                        <div class="stat-label"><?php _e('Total Sincronizări', 'documentiulia-woocommerce'); ?></div>
                    </div>

                    <div class="stat-item stat-success">
                        <div class="stat-value"><?php echo number_format($stats->successful_syncs ?? 0); ?></div>
                        <div class="stat-label"><?php _e('Reușite', 'documentiulia-woocommerce'); ?></div>
                    </div>

                    <div class="stat-item stat-error">
                        <div class="stat-value"><?php echo number_format($stats->failed_syncs ?? 0); ?></div>
                        <div class="stat-label"><?php _e('Eșuate', 'documentiulia-woocommerce'); ?></div>
                    </div>
                </div>

                <?php if ($stats && $stats->last_sync_time): ?>
                    <p class="last-sync">
                        <strong><?php _e('Ultima sincronizare:', 'documentiulia-woocommerce'); ?></strong>
                        <?php echo human_time_diff(strtotime($stats->last_sync_time), current_time('timestamp')); ?>
                        <?php _e('în urmă', 'documentiulia-woocommerce'); ?>
                    </p>
                <?php endif; ?>
            </div>

            <!-- Recent Activity -->
            <?php if (!empty($recent_syncs)): ?>
                <div class="recent-activity">
                    <h4><?php _e('Activitate Recentă', 'documentiulia-woocommerce'); ?></h4>

                    <table class="widefat">
                        <thead>
                            <tr>
                                <th><?php _e('Tip', 'documentiulia-woocommerce'); ?></th>
                                <th><?php _e('Status', 'documentiulia-woocommerce'); ?></th>
                                <th><?php _e('Dată', 'documentiulia-woocommerce'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recent_syncs as $sync): ?>
                                <tr>
                                    <td>
                                        <?php
                                        $type_labels = array(
                                            'stock' => __('Stoc', 'documentiulia-woocommerce'),
                                            'product' => __('Produs', 'documentiulia-woocommerce'),
                                            'order' => __('Comandă', 'documentiulia-woocommerce'),
                                            'webhook' => __('Webhook', 'documentiulia-woocommerce'),
                                        );
                                        echo $type_labels[$sync->sync_type] ?? $sync->sync_type;
                                        ?>
                                    </td>
                                    <td>
                                        <?php
                                        $status_class = 'status-' . $sync->status;
                                        $status_labels = array(
                                            'success' => __('Succes', 'documentiulia-woocommerce'),
                                            'error' => __('Eroare', 'documentiulia-woocommerce'),
                                            'skipped' => __('Omis', 'documentiulia-woocommerce'),
                                        );
                                        ?>
                                        <span class="sync-status <?php echo esc_attr($status_class); ?>">
                                            <?php echo $status_labels[$sync->status] ?? $sync->status; ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php echo human_time_diff(strtotime($sync->created_at), current_time('timestamp')); ?>
                                        <?php _e('în urmă', 'documentiulia-woocommerce'); ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>

            <!-- Quick Actions -->
            <div class="dashboard-actions">
                <a href="<?php echo admin_url('admin.php?page=documentiulia-settings'); ?>" class="button button-primary">
                    <?php _e('Setări DocumentiUlia', 'documentiulia-woocommerce'); ?>
                </a>

                <a href="<?php echo admin_url('admin.php?page=documentiulia-settings&tab=logs'); ?>" class="button">
                    <?php _e('Vezi Toate Log-urile', 'documentiulia-woocommerce'); ?>
                </a>
            </div>
        </div>

        <style>
            .documentiulia-dashboard-widget {
                font-size: 13px;
            }

            .connection-status-row {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }

            .status-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: 600;
                margin-left: 10px;
            }

            .status-badge.status-success {
                background: #d4edda;
                color: #155724;
            }

            .status-badge.status-error {
                background: #f8d7da;
                color: #721c24;
            }

            .sync-stats h4,
            .recent-activity h4 {
                margin: 15px 0 10px 0;
                font-size: 14px;
                font-weight: 600;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin: 15px 0;
            }

            .stat-item {
                text-align: center;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }

            .stat-item.stat-success {
                background: #d4edda;
                border-color: #c3e6cb;
            }

            .stat-item.stat-error {
                background: #f8d7da;
                border-color: #f5c6cb;
            }

            .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: #2271b1;
                margin-bottom: 5px;
            }

            .stat-item.stat-success .stat-value {
                color: #155724;
            }

            .stat-item.stat-error .stat-value {
                color: #721c24;
            }

            .stat-label {
                font-size: 11px;
                color: #666;
                text-transform: uppercase;
            }

            .last-sync {
                margin: 10px 0;
                font-size: 12px;
                color: #666;
            }

            .recent-activity {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #eee;
            }

            .recent-activity table {
                margin-top: 10px;
            }

            .recent-activity th {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                color: #666;
            }

            .recent-activity td {
                font-size: 12px;
            }

            .sync-status {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 600;
            }

            .sync-status.status-success {
                background: #d4edda;
                color: #155724;
            }

            .sync-status.status-error {
                background: #f8d7da;
                color: #721c24;
            }

            .sync-status.status-skipped {
                background: #fff3cd;
                color: #856404;
            }

            .dashboard-actions {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #eee;
                text-align: center;
            }

            .dashboard-actions .button {
                margin: 0 5px;
            }
        </style>
        <?php
    }
}

// Initialize dashboard widget
new DocumentiUlia_WC_Sync_Dashboard();
