<?php
/**
 * Plugin Name: DocumentiUlia pentru WooCommerce
 * Plugin URI: https://documentiulia.ro/integrations/woocommerce
 * Description: Sincronizare automată stoc între DocumentiUlia și WooCommerce
 * Version: 1.0.0
 * Author: DocumentiUlia
 * Author URI: https://documentiulia.ro
 * Text Domain: documentiulia-woocommerce
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DOCUMENTIULIA_WC_VERSION', '1.0.0');
define('DOCUMENTIULIA_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DOCUMENTIULIA_WC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('DOCUMENTIULIA_WC_PLUGIN_FILE', __FILE__);

/**
 * Main DocumentiUlia WooCommerce Class
 */
class DocumentiUlia_WooCommerce {

    /**
     * Instance of this class
     */
    protected static $instance = null;

    /**
     * Initialize the plugin
     */
    private function __construct() {
        // Check if WooCommerce is active
        if (!$this->is_woocommerce_active()) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }

        // Load plugin files
        $this->includes();

        // Initialize hooks
        $this->init_hooks();

        // Initialize admin
        if (is_admin()) {
            $this->admin_init();
        }
    }

    /**
     * Get instance of this class
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Check if WooCommerce is active
     */
    private function is_woocommerce_active() {
        return class_exists('WooCommerce');
    }

    /**
     * WooCommerce missing notice
     */
    public function woocommerce_missing_notice() {
        ?>
        <div class="error">
            <p><?php _e('DocumentiUlia pentru WooCommerce necesită WooCommerce instalat și activat.', 'documentiulia-woocommerce'); ?></p>
        </div>
        <?php
    }

    /**
     * Include required files
     */
    private function includes() {
        // Core classes
        require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'includes/class-api-client.php';
        require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'includes/class-settings.php';
        require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'includes/class-product-sync.php';
        require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'includes/class-stock-sync.php';
        require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'includes/class-order-sync.php';
        require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'includes/class-webhook-handler.php';

        // Admin classes
        if (is_admin()) {
            require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'admin/class-admin.php';
            require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'admin/class-settings-page.php';
            require_once DOCUMENTIULIA_WC_PLUGIN_DIR . 'admin/class-sync-dashboard.php';
        }
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Activation/Deactivation
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));

        // Plugin loaded
        add_action('plugins_loaded', array($this, 'load_textdomain'));

        // WooCommerce hooks
        add_action('woocommerce_product_set_stock', array($this, 'on_stock_changed'), 10, 1);
        add_action('woocommerce_variation_set_stock', array($this, 'on_stock_changed'), 10, 1);
        add_action('woocommerce_new_order', array($this, 'on_new_order'), 10, 1);
        add_action('woocommerce_update_product', array($this, 'on_product_updated'), 10, 1);

        // Custom webhook endpoint
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Cron jobs
        add_action('documentiulia_sync_stock', array($this, 'cron_sync_stock'));
        add_action('documentiulia_sync_products', array($this, 'cron_sync_products'));
    }

    /**
     * Initialize admin
     */
    private function admin_init() {
        // Admin class will auto-initialize when included
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Create options table
        $this->create_tables();

        // Schedule cron jobs
        if (!wp_next_scheduled('documentiulia_sync_stock')) {
            wp_schedule_event(time(), 'every_5_minutes', 'documentiulia_sync_stock');
        }

        if (!wp_next_scheduled('documentiulia_sync_products')) {
            wp_schedule_event(time(), 'hourly', 'documentiulia_sync_products');
        }

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear scheduled cron jobs
        wp_clear_scheduled_hook('documentiulia_sync_stock');
        wp_clear_scheduled_hook('documentiulia_sync_products');

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Create plugin tables
     */
    private function create_tables() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}documentiulia_sync_log (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            product_id bigint(20) NOT NULL,
            sync_type varchar(50) NOT NULL,
            direction varchar(20) NOT NULL,
            status varchar(20) NOT NULL,
            message text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY product_id (product_id),
            KEY sync_type (sync_type),
            KEY created_at (created_at)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * Load plugin textdomain
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'documentiulia-woocommerce',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages'
        );
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('documentiulia/v1', '/webhook/stock-update', array(
            'methods' => 'POST',
            'callback' => array('DocumentiUlia_WC_Webhook_Handler', 'handle_stock_update'),
            'permission_callback' => array('DocumentiUlia_WC_Webhook_Handler', 'verify_webhook'),
        ));

        register_rest_route('documentiulia/v1', '/webhook/product-update', array(
            'methods' => 'POST',
            'callback' => array('DocumentiUlia_WC_Webhook_Handler', 'handle_product_update'),
            'permission_callback' => array('DocumentiUlia_WC_Webhook_Handler', 'verify_webhook'),
        ));
    }

    /**
     * Handle stock changed event
     */
    public function on_stock_changed($product) {
        if (!$this->is_sync_enabled()) {
            return;
        }

        DocumentiUlia_WC_Stock_Sync::sync_to_documentiulia($product);
    }

    /**
     * Handle new order event
     */
    public function on_new_order($order_id) {
        if (!$this->is_sync_enabled()) {
            return;
        }

        DocumentiUlia_WC_Order_Sync::sync_order($order_id);
    }

    /**
     * Handle product updated event
     */
    public function on_product_updated($product_id) {
        if (!$this->is_sync_enabled()) {
            return;
        }

        DocumentiUlia_WC_Product_Sync::sync_to_documentiulia($product_id);
    }

    /**
     * Cron: Sync stock
     */
    public function cron_sync_stock() {
        if (!$this->is_sync_enabled()) {
            return;
        }

        DocumentiUlia_WC_Stock_Sync::sync_from_documentiulia();
    }

    /**
     * Cron: Sync products
     */
    public function cron_sync_products() {
        if (!$this->is_sync_enabled()) {
            return;
        }

        DocumentiUlia_WC_Product_Sync::sync_all_products();
    }

    /**
     * Check if sync is enabled
     */
    private function is_sync_enabled() {
        return get_option('documentiulia_wc_enabled', false);
    }
}

// Initialize the plugin
function documentiulia_woocommerce() {
    return DocumentiUlia_WooCommerce::get_instance();
}

// Start the plugin
documentiulia_woocommerce();
