<?php
/**
 * Admin Functionality Handler
 */

class DocumentiUlia_WC_Admin {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_action('wp_ajax_documentiulia_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_documentiulia_initial_sync', array($this, 'ajax_initial_sync'));
        add_action('wp_ajax_documentiulia_clear_logs', array($this, 'ajax_clear_logs'));
        add_action('wp_ajax_documentiulia_get_status', array($this, 'ajax_get_status'));
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('DocumentiUlia', 'documentiulia-woocommerce'),
            __('DocumentiUlia', 'documentiulia-woocommerce'),
            'manage_options',
            'documentiulia-settings',
            array($this, 'render_settings_page'),
            'dashicons-cloud',
            56
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        $settings_page = new DocumentiUlia_WC_Settings_Page();
        $settings_page->render_settings_page();
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook) {
        // Only load on our settings page
        if ($hook !== 'toplevel_page_documentiulia-settings') {
            return;
        }

        // Enqueue CSS
        wp_enqueue_style(
            'documentiulia-admin',
            plugin_dir_url(dirname(__FILE__)) . 'assets/css/admin.css',
            array(),
            DOCUMENTIULIA_WC_VERSION
        );

        // Enqueue JavaScript
        wp_enqueue_script(
            'documentiulia-admin',
            plugin_dir_url(dirname(__FILE__)) . 'assets/js/admin.js',
            array('jquery'),
            DOCUMENTIULIA_WC_VERSION,
            true
        );

        // Localize script
        wp_localize_script('documentiulia-admin', 'documentiuliaAdmin', array(
            'nonce' => wp_create_nonce('documentiulia_admin_nonce'),
            'ajaxurl' => admin_url('admin-ajax.php'),
            'strings' => array(
                'testingConnection' => __('Se testează...', 'documentiulia-woocommerce'),
                'connectionSuccess' => __('Conexiune reușită!', 'documentiulia-woocommerce'),
                'connectionFailed' => __('Conexiune eșuată', 'documentiulia-woocommerce'),
                'syncInProgress' => __('Sincronizare în curs...', 'documentiulia-woocommerce'),
                'syncComplete' => __('Sincronizare completă!', 'documentiulia-woocommerce'),
                'confirmSync' => __('Sigur doriți să sincronizați?', 'documentiulia-woocommerce'),
                'confirmClearLogs' => __('Sigur doriți să ștergeți toate log-urile?', 'documentiulia-woocommerce'),
            )
        ));
    }

    /**
     * AJAX: Test connection
     */
    public function ajax_test_connection() {
        check_ajax_referer('documentiulia_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permisiuni insuficiente', 'documentiulia-woocommerce')));
        }

        $api_client = new DocumentiUlia_WC_API_Client();
        $connection_ok = $api_client->test_connection();

        if ($connection_ok) {
            wp_send_json_success(array(
                'message' => __('Conexiune reușită la DocumentiUlia API', 'documentiulia-woocommerce')
            ));
        } else {
            wp_send_json_error(array(
                'message' => __('Nu s-a putut conecta la DocumentiUlia API. Verificați credențialele.', 'documentiulia-woocommerce')
            ));
        }
    }

    /**
     * AJAX: Initial sync
     */
    public function ajax_initial_sync() {
        check_ajax_referer('documentiulia_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permisiuni insuficiente', 'documentiulia-woocommerce')));
        }

        $direction = isset($_POST['direction']) ? sanitize_text_field($_POST['direction']) : 'to_documentiulia';

        // Increase time limit for large syncs
        set_time_limit(300); // 5 minutes

        try {
            if ($direction === 'to_documentiulia') {
                $result = DocumentiUlia_WC_Product_Sync::sync_all_products('to_documentiulia');
            } else {
                $result = DocumentiUlia_WC_Product_Sync::sync_all_products('from_documentiulia');
            }

            wp_send_json_success(array(
                'synced' => $result['synced'],
                'errors' => $result['errors'],
                'total' => $result['total'],
                'message' => sprintf(
                    __('Sincronizate: %d, Erori: %d, Total: %d', 'documentiulia-woocommerce'),
                    $result['synced'],
                    $result['errors'],
                    $result['total']
                )
            ));
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }

    /**
     * AJAX: Clear logs
     */
    public function ajax_clear_logs() {
        check_ajax_referer('documentiulia_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permisiuni insuficiente', 'documentiulia-woocommerce')));
        }

        global $wpdb;

        $deleted = $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}documentiulia_sync_log");

        if ($deleted !== false) {
            wp_send_json_success(array(
                'message' => __('Log-urile au fost șterse cu succes', 'documentiulia-woocommerce')
            ));
        } else {
            wp_send_json_error(array(
                'message' => __('Eroare la ștergerea log-urilor', 'documentiulia-woocommerce')
            ));
        }
    }

    /**
     * AJAX: Get current status
     */
    public function ajax_get_status() {
        check_ajax_referer('documentiulia_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permisiuni insuficiente', 'documentiulia-woocommerce')));
        }

        global $wpdb;

        $api_client = new DocumentiUlia_WC_API_Client();
        $connection_ok = $api_client->test_connection();

        // Get last sync time
        $last_sync = $wpdb->get_var(
            "SELECT created_at FROM {$wpdb->prefix}documentiulia_sync_log
             WHERE status = 'success'
             ORDER BY created_at DESC LIMIT 1"
        );

        // Get sync counts (last 24 hours)
        $sync_counts = $wpdb->get_results(
            "SELECT status, COUNT(*) as count
             FROM {$wpdb->prefix}documentiulia_sync_log
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             GROUP BY status",
            OBJECT_K
        );

        $success_count = isset($sync_counts['success']) ? $sync_counts['success']->count : 0;
        $error_count = isset($sync_counts['error']) ? $sync_counts['error']->count : 0;

        wp_send_json_success(array(
            'connection' => $connection_ok,
            'last_sync' => $last_sync ? human_time_diff(strtotime($last_sync), current_time('timestamp')) . ' ' . __('în urmă', 'documentiulia-woocommerce') : __('Niciodată', 'documentiulia-woocommerce'),
            'success_count_24h' => $success_count,
            'error_count_24h' => $error_count,
        ));
    }
}

// Initialize admin class
new DocumentiUlia_WC_Admin();
