<?php
/**
 * Settings Management Class
 */

class DocumentiUlia_WC_Settings {

    /**
     * Option group
     */
    const OPTION_GROUP = 'documentiulia_wc_settings';

    /**
     * Initialize settings
     */
    public static function init() {
        add_action('admin_init', array(__CLASS__, 'register_settings'));
    }

    /**
     * Register settings
     */
    public static function register_settings() {
        // Connection settings
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_api_url');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_api_key');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_api_secret');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_webhook_secret');

        // Sync settings
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_enabled');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_warehouse_id');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_sync_frequency');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_sync_direction');

        // Advanced settings
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_sync_images');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_sync_categories');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_auto_create_products');
        register_setting(self::OPTION_GROUP, 'documentiulia_wc_debug_mode');
    }

    /**
     * Get setting value
     */
    public static function get($key, $default = null) {
        return get_option('documentiulia_wc_' . $key, $default);
    }

    /**
     * Set setting value
     */
    public static function set($key, $value) {
        return update_option('documentiulia_wc_' . $key, $value);
    }

    /**
     * Get all settings
     */
    public static function get_all() {
        return array(
            'api_url' => self::get('api_url', 'https://documentiulia.ro/api/v1'),
            'api_key' => self::get('api_key'),
            'api_secret' => self::get('api_secret'),
            'webhook_secret' => self::get('webhook_secret'),
            'enabled' => self::get('enabled', false),
            'warehouse_id' => self::get('warehouse_id'),
            'sync_frequency' => self::get('sync_frequency', 'every_5_minutes'),
            'sync_direction' => self::get('sync_direction', 'bidirectional'),
            'sync_images' => self::get('sync_images', false),
            'sync_categories' => self::get('sync_categories', true),
            'auto_create_products' => self::get('auto_create_products', false),
            'debug_mode' => self::get('debug_mode', false),
        );
    }

    /**
     * Validate API credentials
     */
    public static function validate_credentials() {
        $api_key = self::get('api_key');
        $api_secret = self::get('api_secret');

        if (empty($api_key) || empty($api_secret)) {
            return false;
        }

        $api_client = new DocumentiUlia_WC_API_Client();
        return $api_client->test_connection();
    }

    /**
     * Get webhook URL
     */
    public static function get_webhook_url($endpoint = 'stock-update') {
        return rest_url('documentiulia/v1/webhook/' . $endpoint);
    }

    /**
     * Generate webhook secret
     */
    public static function generate_webhook_secret() {
        $secret = wp_generate_password(64, true, true);
        self::set('webhook_secret', $secret);
        return $secret;
    }

    /**
     * Get sync frequency options
     */
    public static function get_sync_frequency_options() {
        return array(
            'every_5_minutes' => __('La fiecare 5 minute', 'documentiulia-woocommerce'),
            'every_15_minutes' => __('La fiecare 15 minute', 'documentiulia-woocommerce'),
            'every_30_minutes' => __('La fiecare 30 minute', 'documentiulia-woocommerce'),
            'hourly' => __('Orar', 'documentiulia-woocommerce'),
            'twicedaily' => __('De două ori pe zi', 'documentiulia-woocommerce'),
            'daily' => __('Zilnic', 'documentiulia-woocommerce'),
        );
    }

    /**
     * Get sync direction options
     */
    public static function get_sync_direction_options() {
        return array(
            'bidirectional' => __('Bidirecțional (WooCommerce ↔ DocumentiUlia)', 'documentiulia-woocommerce'),
            'to_documentiulia' => __('Doar spre DocumentiUlia (WooCommerce → DocumentiUlia)', 'documentiulia-woocommerce'),
            'from_documentiulia' => __('Doar din DocumentiUlia (DocumentiUlia → WooCommerce)', 'documentiulia-woocommerce'),
        );
    }
}

// Initialize settings
DocumentiUlia_WC_Settings::init();
