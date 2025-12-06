<?php
/**
 * Stock Synchronization Handler
 */

class DocumentiUlia_WC_Stock_Sync {

    /**
     * Sync stock TO DocumentiUlia (WooCommerce → DocumentiUlia)
     */
    public static function sync_to_documentiulia($product) {
        if (!$product || !is_object($product)) {
            return false;
        }

        $api_client = new DocumentiUlia_WC_API_Client();
        $sku = $product->get_sku();

        if (empty($sku)) {
            self::log_sync('Stock sync skipped - no SKU', $product->get_id(), 'to_documentiulia', 'skipped');
            return false;
        }

        $quantity = $product->get_stock_quantity();
        $warehouse_id = get_option('documentiulia_wc_warehouse_id');

        $response = $api_client->update_stock($sku, $quantity, $warehouse_id);

        if ($response['success']) {
            self::log_sync('Stock synced successfully', $product->get_id(), 'to_documentiulia', 'success');
            update_post_meta($product->get_id(), '_documentiulia_last_sync', current_time('mysql'));
            return true;
        } else {
            self::log_sync('Stock sync failed: ' . $response['message'], $product->get_id(), 'to_documentiulia', 'error');
            return false;
        }
    }

    /**
     * Sync stock FROM DocumentiUlia (DocumentiUlia → WooCommerce)
     */
    public static function sync_from_documentiulia() {
        $api_client = new DocumentiUlia_WC_API_Client();
        $warehouse_id = get_option('documentiulia_wc_warehouse_id');

        $response = $api_client->get_stock_levels($warehouse_id);

        if (!$response['success']) {
            self::log_sync('Bulk stock sync failed: ' . $response['message'], 0, 'from_documentiulia', 'error');
            return false;
        }

        $stock_data = isset($response['data']['data']) ? $response['data']['data'] : array();
        $synced_count = 0;
        $error_count = 0;

        foreach ($stock_data as $stock_item) {
            $sku = $stock_item['sku'];
            $quantity = $stock_item['available_quantity'];

            // Find WooCommerce product by SKU
            $product_id = wc_get_product_id_by_sku($sku);

            if (!$product_id) {
                $error_count++;
                continue;
            }

            $product = wc_get_product($product_id);

            if (!$product) {
                $error_count++;
                continue;
            }

            // Update stock quantity
            $product->set_stock_quantity($quantity);
            $product->set_stock_status($quantity > 0 ? 'instock' : 'outofstock');
            $product->save();

            update_post_meta($product_id, '_documentiulia_last_sync', current_time('mysql'));
            $synced_count++;
        }

        self::log_sync("Bulk sync completed: {$synced_count} synced, {$error_count} errors", 0, 'from_documentiulia', 'success');

        return array(
            'synced' => $synced_count,
            'errors' => $error_count
        );
    }

    /**
     * Log sync activity
     */
    private static function log_sync($message, $product_id, $direction, $status) {
        global $wpdb;

        $wpdb->insert(
            $wpdb->prefix . 'documentiulia_sync_log',
            array(
                'product_id' => $product_id,
                'sync_type' => 'stock',
                'direction' => $direction,
                'status' => $status,
                'message' => $message,
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s')
        );

        // Also log to WooCommerce logger
        if (function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->info($message, array(
                'source' => 'documentiulia-stock-sync',
                'product_id' => $product_id,
                'direction' => $direction
            ));
        }
    }
}
