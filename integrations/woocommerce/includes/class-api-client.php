<?php
/**
 * DocumentiUlia API Client
 */

class DocumentiUlia_WC_API_Client {

    /**
     * API base URL
     */
    private $api_url;

    /**
     * API key
     */
    private $api_key;

    /**
     * API secret
     */
    private $api_secret;

    /**
     * Constructor
     */
    public function __construct() {
        $this->api_url = get_option('documentiulia_wc_api_url', 'https://documentiulia.ro/api/v1');
        $this->api_key = get_option('documentiulia_wc_api_key');
        $this->api_secret = get_option('documentiulia_wc_api_secret');
    }

    /**
     * Make API request
     */
    public function request($endpoint, $method = 'GET', $data = array()) {
        $url = trailingslashit($this->api_url) . ltrim($endpoint, '/');

        $headers = array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $this->get_jwt_token(),
        );

        $args = array(
            'method' => $method,
            'headers' => $headers,
            'timeout' => 30,
        );

        if (!empty($data) && in_array($method, array('POST', 'PUT', 'PATCH'))) {
            $args['body'] = json_encode($data);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            $this->log_error('API Request Failed', array(
                'endpoint' => $endpoint,
                'error' => $response->get_error_message()
            ));
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);

        if ($status_code >= 200 && $status_code < 300) {
            return array(
                'success' => true,
                'data' => $decoded
            );
        } else {
            $this->log_error('API Error Response', array(
                'endpoint' => $endpoint,
                'status_code' => $status_code,
                'response' => $decoded
            ));
            return array(
                'success' => false,
                'message' => isset($decoded['message']) ? $decoded['message'] : 'API request failed',
                'status_code' => $status_code
            );
        }
    }

    /**
     * Get JWT token
     */
    private function get_jwt_token() {
        // Check if token is cached and valid
        $cached_token = get_transient('documentiulia_wc_jwt_token');
        if ($cached_token) {
            return $cached_token;
        }

        // Request new token
        $token_url = trailingslashit($this->api_url) . 'auth/token';

        $response = wp_remote_post($token_url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'api_key' => $this->api_key,
                'api_secret' => $this->api_secret
            )),
            'timeout' => 15
        ));

        if (is_wp_error($response)) {
            return '';
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (isset($body['token'])) {
            // Cache token for 1 hour
            set_transient('documentiulia_wc_jwt_token', $body['token'], HOUR_IN_SECONDS);
            return $body['token'];
        }

        return '';
    }

    /**
     * Test connection
     */
    public function test_connection() {
        $response = $this->request('test/connection', 'GET');
        return $response['success'];
    }

    /**
     * Get products from DocumentiUlia
     */
    public function get_products($params = array()) {
        $endpoint = 'inventory/products';

        if (!empty($params)) {
            $endpoint .= '?' . http_build_query($params);
        }

        return $this->request($endpoint, 'GET');
    }

    /**
     * Get single product from DocumentiUlia
     */
    public function get_product($sku) {
        return $this->request('inventory/products?sku=' . urlencode($sku), 'GET');
    }

    /**
     * Create product in DocumentiUlia
     */
    public function create_product($product_data) {
        return $this->request('inventory/products', 'POST', $product_data);
    }

    /**
     * Update product in DocumentiUlia
     */
    public function update_product($product_id, $product_data) {
        return $this->request('inventory/products/' . $product_id, 'PUT', $product_data);
    }

    /**
     * Update stock level
     */
    public function update_stock($sku, $quantity, $warehouse_id = null) {
        $data = array(
            'sku' => $sku,
            'quantity' => $quantity
        );

        if ($warehouse_id) {
            $data['warehouse_id'] = $warehouse_id;
        }

        return $this->request('inventory/stock-levels', 'PUT', $data);
    }

    /**
     * Get stock levels
     */
    public function get_stock_levels($warehouse_id = null) {
        $endpoint = 'inventory/stock-levels';

        if ($warehouse_id) {
            $endpoint .= '?warehouse_id=' . urlencode($warehouse_id);
        }

        return $this->request($endpoint, 'GET');
    }

    /**
     * Create stock movement
     */
    public function create_stock_movement($movement_data) {
        return $this->request('inventory/stock-movement', 'POST', $movement_data);
    }

    /**
     * Get warehouses
     */
    public function get_warehouses() {
        return $this->request('inventory/warehouses', 'GET');
    }

    /**
     * Log error
     */
    private function log_error($message, $context = array()) {
        if (function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->error($message, array_merge(array('source' => 'documentiulia-woocommerce'), $context));
        }
    }
}
