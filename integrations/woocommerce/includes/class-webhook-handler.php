<?php
/**
 * Webhook Handler for DocumentiUlia Events
 */

class DocumentiUlia_WC_Webhook_Handler {

    /**
     * Verify webhook signature
     */
    public static function verify_webhook($request) {
        $webhook_secret = get_option('documentiulia_wc_webhook_secret');

        if (empty($webhook_secret)) {
            return new WP_Error('no_secret', __('Webhook secret nu este configurat', 'documentiulia-woocommerce'), array('status' => 403));
        }

        $signature = $request->get_header('X-DocumentiUlia-Signature');

        if (empty($signature)) {
            return new WP_Error('no_signature', __('Semnătură webhook lipsă', 'documentiulia-woocommerce'), array('status' => 403));
        }

        $payload = $request->get_body();
        $expected_signature = hash_hmac('sha256', $payload, $webhook_secret);

        if (!hash_equals($expected_signature, $signature)) {
            return new WP_Error('invalid_signature', __('Semnătură webhook invalidă', 'documentiulia-woocommerce'), array('status' => 403));
        }

        return true;
    }

    /**
     * Handle stock update webhook
     */
    public static function handle_stock_update($request) {
        $data = $request->get_json_params();

        if (empty($data['sku']) || !isset($data['quantity'])) {
            return new WP_Error('invalid_data', __('Date webhook invalide', 'documentiulia-woocommerce'), array('status' => 400));
        }

        $sku = sanitize_text_field($data['sku']);
        $quantity = intval($data['quantity']);

        // Find product by SKU
        $product_id = wc_get_product_id_by_sku($sku);

        if (!$product_id) {
            return new WP_Error('product_not_found', __('Produs negăsit cu SKU: ' . $sku, 'documentiulia-woocommerce'), array('status' => 404));
        }

        $product = wc_get_product($product_id);

        if (!$product) {
            return new WP_Error('product_not_found', __('Produs negăsit', 'documentiulia-woocommerce'), array('status' => 404));
        }

        // Update stock quantity
        $product->set_stock_quantity($quantity);
        $product->set_stock_status($quantity > 0 ? 'instock' : 'outofstock');
        $product->save();

        // Log the update
        self::log_webhook('Stock updated via webhook', $product_id, 'stock_update', 'success');

        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Stoc actualizat cu succes', 'documentiulia-woocommerce'),
            'product_id' => $product_id,
            'sku' => $sku,
            'new_quantity' => $quantity
        ));
    }

    /**
     * Handle product update webhook
     */
    public static function handle_product_update($request) {
        $data = $request->get_json_params();

        if (empty($data['sku'])) {
            return new WP_Error('invalid_data', __('SKU lipsă', 'documentiulia-woocommerce'), array('status' => 400));
        }

        $sku = sanitize_text_field($data['sku']);

        // Find product by SKU
        $product_id = wc_get_product_id_by_sku($sku);

        if (!$product_id) {
            // Create new product if it doesn't exist
            return self::create_product_from_webhook($data);
        }

        // Update existing product
        return self::update_product_from_webhook($product_id, $data);
    }

    /**
     * Create product from webhook data
     */
    private static function create_product_from_webhook($data) {
        $product = new WC_Product_Simple();

        $product->set_name(sanitize_text_field($data['name']));
        $product->set_sku(sanitize_text_field($data['sku']));

        if (isset($data['description'])) {
            $product->set_description(wp_kses_post($data['description']));
        }

        if (isset($data['price'])) {
            $product->set_regular_price(floatval($data['price']));
        }

        if (isset($data['stock_quantity'])) {
            $product->set_manage_stock(true);
            $product->set_stock_quantity(intval($data['stock_quantity']));
            $product->set_stock_status($data['stock_quantity'] > 0 ? 'instock' : 'outofstock');
        }

        if (isset($data['barcode'])) {
            update_post_meta($product->get_id(), '_barcode', sanitize_text_field($data['barcode']));
        }

        $product_id = $product->save();

        if ($product_id) {
            update_post_meta($product_id, '_documentiulia_product_id', $data['id']);
            update_post_meta($product_id, '_documentiulia_last_sync', current_time('mysql'));

            self::log_webhook('Product created via webhook', $product_id, 'product_create', 'success');

            return rest_ensure_response(array(
                'success' => true,
                'message' => __('Produs creat cu succes', 'documentiulia-woocommerce'),
                'product_id' => $product_id
            ));
        }

        return new WP_Error('create_failed', __('Crearea produsului a eșuat', 'documentiulia-woocommerce'), array('status' => 500));
    }

    /**
     * Update product from webhook data
     */
    private static function update_product_from_webhook($product_id, $data) {
        $product = wc_get_product($product_id);

        if (!$product) {
            return new WP_Error('product_not_found', __('Produs negăsit', 'documentiulia-woocommerce'), array('status' => 404));
        }

        if (isset($data['name'])) {
            $product->set_name(sanitize_text_field($data['name']));
        }

        if (isset($data['description'])) {
            $product->set_description(wp_kses_post($data['description']));
        }

        if (isset($data['price'])) {
            $product->set_regular_price(floatval($data['price']));
        }

        if (isset($data['stock_quantity'])) {
            $product->set_stock_quantity(intval($data['stock_quantity']));
            $product->set_stock_status($data['stock_quantity'] > 0 ? 'instock' : 'outofstock');
        }

        if (isset($data['barcode'])) {
            update_post_meta($product_id, '_barcode', sanitize_text_field($data['barcode']));
        }

        $product->save();

        update_post_meta($product_id, '_documentiulia_last_sync', current_time('mysql'));

        self::log_webhook('Product updated via webhook', $product_id, 'product_update', 'success');

        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Produs actualizat cu succes', 'documentiulia-woocommerce'),
            'product_id' => $product_id
        ));
    }

    /**
     * Handle invoice status update webhook
     */
    public static function handle_invoice_status_update($request) {
        $data = $request->get_json_params();

        if (empty($data['invoice_id']) || empty($data['status'])) {
            return new WP_Error('invalid_data', __('Date webhook invalide', 'documentiulia-woocommerce'), array('status' => 400));
        }

        $invoice_id = sanitize_text_field($data['invoice_id']);
        $new_status = sanitize_text_field($data['status']);

        // Find order by DocumentiUlia invoice ID
        $args = array(
            'meta_key' => '_documentiulia_invoice_id',
            'meta_value' => $invoice_id,
            'limit' => 1,
        );

        $orders = wc_get_orders($args);

        if (empty($orders)) {
            return new WP_Error('order_not_found', __('Comandă negăsită', 'documentiulia-woocommerce'), array('status' => 404));
        }

        $order = $orders[0];

        DocumentiUlia_WC_Order_Sync::update_order_status($order->get_id(), $new_status);

        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Status comandă actualizat', 'documentiulia-woocommerce'),
            'order_id' => $order->get_id()
        ));
    }

    /**
     * Handle payment received webhook
     */
    public static function handle_payment_received($request) {
        $data = $request->get_json_params();

        if (empty($data['invoice_id']) || empty($data['payment_amount'])) {
            return new WP_Error('invalid_data', __('Date webhook invalide', 'documentiulia-woocommerce'), array('status' => 400));
        }

        $invoice_id = sanitize_text_field($data['invoice_id']);
        $payment_data = array(
            'amount' => floatval($data['payment_amount']),
            'currency' => isset($data['currency']) ? sanitize_text_field($data['currency']) : 'RON',
            'is_fully_paid' => isset($data['is_fully_paid']) ? (bool)$data['is_fully_paid'] : false,
        );

        $result = DocumentiUlia_WC_Order_Sync::handle_payment_received($invoice_id, $payment_data);

        if ($result) {
            return rest_ensure_response(array(
                'success' => true,
                'message' => __('Plată procesată cu succes', 'documentiulia-woocommerce')
            ));
        }

        return new WP_Error('payment_failed', __('Procesarea plății a eșuat', 'documentiulia-woocommerce'), array('status' => 500));
    }

    /**
     * Log webhook activity
     */
    private static function log_webhook($message, $product_id, $webhook_type, $status) {
        global $wpdb;

        $wpdb->insert(
            $wpdb->prefix . 'documentiulia_sync_log',
            array(
                'product_id' => $product_id,
                'sync_type' => 'webhook',
                'direction' => 'from_documentiulia',
                'status' => $status,
                'message' => $webhook_type . ': ' . $message,
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s')
        );

        // Also log to WooCommerce logger
        if (function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->info($message, array(
                'source' => 'documentiulia-webhook',
                'product_id' => $product_id,
                'webhook_type' => $webhook_type
            ));
        }
    }
}
