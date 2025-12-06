<?php
/**
 * Product Synchronization Handler
 */

class DocumentiUlia_WC_Product_Sync {

    /**
     * Sync product TO DocumentiUlia
     */
    public static function sync_to_documentiulia($product_id) {
        $product = wc_get_product($product_id);

        if (!$product) {
            return false;
        }

        $api_client = new DocumentiUlia_WC_API_Client();

        $product_data = self::prepare_product_data($product);

        // Check if product already exists in DocumentiUlia
        $existing = $api_client->get_product($product->get_sku());

        if ($existing['success'] && !empty($existing['data']['data'])) {
            // Update existing product
            $documentiulia_id = $existing['data']['data'][0]['id'];
            $response = $api_client->update_product($documentiulia_id, $product_data);
        } else {
            // Create new product
            $response = $api_client->create_product($product_data);
        }

        if ($response['success']) {
            update_post_meta($product_id, '_documentiulia_product_id', $response['data']['id']);
            update_post_meta($product_id, '_documentiulia_last_sync', current_time('mysql'));
            self::log_sync('Product synced successfully', $product_id, 'to_documentiulia', 'success');
            return true;
        } else {
            self::log_sync('Product sync failed: ' . $response['message'], $product_id, 'to_documentiulia', 'error');
            return false;
        }
    }

    /**
     * Sync all products
     */
    public static function sync_all_products($direction = 'to_documentiulia') {
        if ($direction === 'to_documentiulia') {
            return self::sync_all_to_documentiulia();
        } else {
            return self::sync_all_from_documentiulia();
        }
    }

    /**
     * Sync all products TO DocumentiUlia
     */
    private static function sync_all_to_documentiulia() {
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        );

        $products = get_posts($args);
        $synced_count = 0;
        $error_count = 0;

        foreach ($products as $post) {
            if (self::sync_to_documentiulia($post->ID)) {
                $synced_count++;
            } else {
                $error_count++;
            }

            // Prevent timeout - add small delay
            usleep(100000); // 0.1 second
        }

        return array(
            'synced' => $synced_count,
            'errors' => $error_count,
            'total' => count($products)
        );
    }

    /**
     * Sync all products FROM DocumentiUlia
     */
    private static function sync_all_from_documentiulia() {
        $api_client = new DocumentiUlia_WC_API_Client();
        $response = $api_client->get_products();

        if (!$response['success']) {
            return array(
                'synced' => 0,
                'errors' => 1,
                'message' => $response['message']
            );
        }

        $products = isset($response['data']['data']) ? $response['data']['data'] : array();
        $synced_count = 0;
        $error_count = 0;

        foreach ($products as $product_data) {
            if (self::import_product_from_documentiulia($product_data)) {
                $synced_count++;
            } else {
                $error_count++;
            }
        }

        return array(
            'synced' => $synced_count,
            'errors' => $error_count,
            'total' => count($products)
        );
    }

    /**
     * Import product from DocumentiUlia
     */
    private static function import_product_from_documentiulia($product_data) {
        $sku = $product_data['sku'];

        // Check if product already exists
        $product_id = wc_get_product_id_by_sku($sku);

        if ($product_id) {
            // Update existing product
            $product = wc_get_product($product_id);
        } else {
            // Create new product
            $product = new WC_Product_Simple();
        }

        // Set product data
        $product->set_name($product_data['name']);
        $product->set_sku($sku);
        $product->set_regular_price($product_data['price']);

        if (isset($product_data['description'])) {
            $product->set_description($product_data['description']);
        }

        if (isset($product_data['barcode'])) {
            update_post_meta($product->get_id(), '_barcode', $product_data['barcode']);
        }

        // Set stock
        $product->set_manage_stock(true);
        $product->set_stock_quantity($product_data['stock_quantity'] ?? 0);
        $product->set_stock_status($product_data['stock_quantity'] > 0 ? 'instock' : 'outofstock');

        // Save product
        $product_id = $product->save();

        if ($product_id) {
            update_post_meta($product_id, '_documentiulia_product_id', $product_data['id']);
            update_post_meta($product_id, '_documentiulia_last_sync', current_time('mysql'));
            return true;
        }

        return false;
    }

    /**
     * Prepare product data for DocumentiUlia
     */
    private static function prepare_product_data($product) {
        $data = array(
            'name' => $product->get_name(),
            'sku' => $product->get_sku(),
            'barcode' => get_post_meta($product->get_id(), '_barcode', true),
            'price' => $product->get_regular_price(),
            'description' => $product->get_description(),
            'stock_quantity' => $product->get_stock_quantity(),
            'manage_stock' => $product->get_manage_stock(),
            'category' => self::get_product_category($product),
            'weight' => $product->get_weight(),
            'dimensions' => array(
                'length' => $product->get_length(),
                'width' => $product->get_width(),
                'height' => $product->get_height()
            )
        );

        return array_filter($data, function($value) {
            return $value !== null && $value !== '';
        });
    }

    /**
     * Get product category
     */
    private static function get_product_category($product) {
        $categories = $product->get_category_ids();

        if (empty($categories)) {
            return '';
        }

        $term = get_term($categories[0], 'product_cat');
        return $term ? $term->name : '';
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
                'sync_type' => 'product',
                'direction' => $direction,
                'status' => $status,
                'message' => $message,
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s')
        );
    }
}
