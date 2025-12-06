<?php
/**
 * Order Synchronization Handler
 */

class DocumentiUlia_WC_Order_Sync {

    /**
     * Sync order TO DocumentiUlia
     */
    public static function sync_order($order_id) {
        $order = wc_get_order($order_id);

        if (!$order) {
            return false;
        }

        $api_client = new DocumentiUlia_WC_API_Client();

        $order_data = self::prepare_order_data($order);

        $response = $api_client->request('sales/invoices', 'POST', $order_data);

        if ($response['success']) {
            update_post_meta($order_id, '_documentiulia_invoice_id', $response['data']['id']);
            update_post_meta($order_id, '_documentiulia_last_sync', current_time('mysql'));
            self::log_sync('Order synced successfully', $order_id, 'to_documentiulia', 'success');
            return true;
        } else {
            self::log_sync('Order sync failed: ' . $response['message'], $order_id, 'to_documentiulia', 'error');
            return false;
        }
    }

    /**
     * Prepare order data for DocumentiUlia
     */
    private static function prepare_order_data($order) {
        $items = array();

        foreach ($order->get_items() as $item) {
            $product = $item->get_product();

            if (!$product) {
                continue;
            }

            $items[] = array(
                'product_sku' => $product->get_sku(),
                'product_name' => $product->get_name(),
                'quantity' => $item->get_quantity(),
                'unit_price' => $product->get_price(),
                'total' => $item->get_total(),
                'tax' => $item->get_total_tax(),
            );
        }

        $billing_address = array(
            'name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            'company' => $order->get_billing_company(),
            'address' => $order->get_billing_address_1(),
            'address2' => $order->get_billing_address_2(),
            'city' => $order->get_billing_city(),
            'state' => $order->get_billing_state(),
            'postcode' => $order->get_billing_postcode(),
            'country' => $order->get_billing_country(),
            'email' => $order->get_billing_email(),
            'phone' => $order->get_billing_phone(),
        );

        $shipping_address = array(
            'name' => $order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name(),
            'company' => $order->get_shipping_company(),
            'address' => $order->get_shipping_address_1(),
            'address2' => $order->get_shipping_address_2(),
            'city' => $order->get_shipping_city(),
            'state' => $order->get_shipping_state(),
            'postcode' => $order->get_shipping_postcode(),
            'country' => $order->get_shipping_country(),
        );

        $data = array(
            'invoice_number' => $order->get_order_number(),
            'invoice_date' => $order->get_date_created()->format('Y-m-d'),
            'due_date' => $order->get_date_created()->modify('+30 days')->format('Y-m-d'),
            'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            'customer_email' => $order->get_billing_email(),
            'customer_phone' => $order->get_billing_phone(),
            'billing_address' => $billing_address,
            'shipping_address' => $shipping_address,
            'items' => $items,
            'subtotal' => $order->get_subtotal(),
            'tax_total' => $order->get_total_tax(),
            'shipping_total' => $order->get_shipping_total(),
            'total' => $order->get_total(),
            'currency' => $order->get_currency(),
            'payment_method' => $order->get_payment_method_title(),
            'status' => $order->get_status(),
            'notes' => $order->get_customer_note(),
            'external_id' => $order_id,
            'external_source' => 'woocommerce',
        );

        return array_filter($data, function($value) {
            return $value !== null && $value !== '';
        });
    }

    /**
     * Update order status from DocumentiUlia
     */
    public static function update_order_status($order_id, $new_status) {
        $order = wc_get_order($order_id);

        if (!$order) {
            return false;
        }

        $status_map = array(
            'draft' => 'pending',
            'pending' => 'pending',
            'paid' => 'processing',
            'partially_paid' => 'on-hold',
            'overdue' => 'on-hold',
            'cancelled' => 'cancelled',
            'refunded' => 'refunded',
        );

        $wc_status = isset($status_map[$new_status]) ? $status_map[$new_status] : 'pending';

        $order->update_status($wc_status, __('Status actualizat din DocumentiUlia', 'documentiulia-woocommerce'));

        self::log_sync('Order status updated from DocumentiUlia', $order_id, 'from_documentiulia', 'success');

        return true;
    }

    /**
     * Handle payment received webhook
     */
    public static function handle_payment_received($invoice_id, $payment_data) {
        // Find order by DocumentiUlia invoice ID
        $args = array(
            'meta_key' => '_documentiulia_invoice_id',
            'meta_value' => $invoice_id,
            'limit' => 1,
        );

        $orders = wc_get_orders($args);

        if (empty($orders)) {
            return false;
        }

        $order = $orders[0];

        // Add payment note
        $note = sprintf(
            __('Plată primită în DocumentiUlia: %s %s', 'documentiulia-woocommerce'),
            number_format($payment_data['amount'], 2),
            $payment_data['currency']
        );

        $order->add_order_note($note);

        // Update order status if fully paid
        if (isset($payment_data['is_fully_paid']) && $payment_data['is_fully_paid']) {
            $order->update_status('completed', __('Plată completă primită în DocumentiUlia', 'documentiulia-woocommerce'));
        }

        self::log_sync('Payment received notification processed', $order->get_id(), 'from_documentiulia', 'success');

        return true;
    }

    /**
     * Log sync activity
     */
    private static function log_sync($message, $order_id, $direction, $status) {
        global $wpdb;

        $wpdb->insert(
            $wpdb->prefix . 'documentiulia_sync_log',
            array(
                'product_id' => $order_id, // Reusing product_id field for order_id
                'sync_type' => 'order',
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
                'source' => 'documentiulia-order-sync',
                'order_id' => $order_id,
                'direction' => $direction
            ));
        }
    }
}
