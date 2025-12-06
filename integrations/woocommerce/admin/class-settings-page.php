<?php
/**
 * WooCommerce Settings Page
 */

class DocumentiUlia_WC_Settings_Page {

    /**
     * Initialize settings page
     */
    public function __construct() {
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }

    /**
     * Add settings page to WooCommerce menu
     */
    public function add_settings_page() {
        add_submenu_page(
            'woocommerce',
            __('DocumentiUlia', 'documentiulia-woocommerce'),
            __('DocumentiUlia', 'documentiulia-woocommerce'),
            'manage_woocommerce',
            'documentiulia-settings',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        // Connection Settings
        register_setting('documentiulia_connection', 'documentiulia_wc_api_url');
        register_setting('documentiulia_connection', 'documentiulia_wc_api_key');
        register_setting('documentiulia_connection', 'documentiulia_wc_api_secret');

        // Sync Settings
        register_setting('documentiulia_sync', 'documentiulia_wc_enabled');
        register_setting('documentiulia_sync', 'documentiulia_wc_warehouse_id');
        register_setting('documentiulia_sync', 'documentiulia_wc_sync_stock');
        register_setting('documentiulia_sync', 'documentiulia_wc_sync_prices');
        register_setting('documentiulia_sync', 'documentiulia_wc_sync_images');
        register_setting('documentiulia_sync', 'documentiulia_wc_sync_orders');
        register_setting('documentiulia_sync', 'documentiulia_wc_sync_frequency');
        register_setting('documentiulia_sync', 'documentiulia_wc_realtime_webhooks');
    }

    /**
     * Enqueue admin scripts
     */
    public function enqueue_scripts($hook) {
        if ('woocommerce_page_documentiulia-settings' !== $hook) {
            return;
        }

        wp_enqueue_style(
            'documentiulia-admin',
            DOCUMENTIULIA_WC_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            DOCUMENTIULIA_WC_VERSION
        );

        wp_enqueue_script(
            'documentiulia-admin',
            DOCUMENTIULIA_WC_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            DOCUMENTIULIA_WC_VERSION,
            true
        );

        wp_localize_script('documentiulia-admin', 'documentiulia', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('documentiulia-admin'),
        ));
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap documentiulia-settings">
            <h1><?php _e('Setări DocumentiUlia pentru WooCommerce', 'documentiulia-woocommerce'); ?></h1>

            <?php settings_errors(); ?>

            <?php
            $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'connection';
            ?>

            <h2 class="nav-tab-wrapper">
                <a href="?page=documentiulia-settings&tab=connection" class="nav-tab <?php echo $active_tab == 'connection' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Conexiune', 'documentiulia-woocommerce'); ?>
                </a>
                <a href="?page=documentiulia-settings&tab=sync" class="nav-tab <?php echo $active_tab == 'sync' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Sincronizare', 'documentiulia-woocommerce'); ?>
                </a>
                <a href="?page=documentiulia-settings&tab=status" class="nav-tab <?php echo $active_tab == 'status' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Status', 'documentiulia-woocommerce'); ?>
                </a>
                <a href="?page=documentiulia-settings&tab=logs" class="nav-tab <?php echo $active_tab == 'logs' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Log-uri', 'documentiulia-woocommerce'); ?>
                </a>
            </h2>

            <?php
            switch ($active_tab) {
                case 'connection':
                    $this->render_connection_tab();
                    break;
                case 'sync':
                    $this->render_sync_tab();
                    break;
                case 'status':
                    $this->render_status_tab();
                    break;
                case 'logs':
                    $this->render_logs_tab();
                    break;
            }
            ?>
        </div>
        <?php
    }

    /**
     * Render connection tab
     */
    private function render_connection_tab() {
        ?>
        <form method="post" action="options.php">
            <?php settings_fields('documentiulia_connection'); ?>

            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="documentiulia_wc_api_url"><?php _e('URL API DocumentiUlia', 'documentiulia-woocommerce'); ?></label>
                    </th>
                    <td>
                        <input type="url"
                               id="documentiulia_wc_api_url"
                               name="documentiulia_wc_api_url"
                               value="<?php echo esc_attr(get_option('documentiulia_wc_api_url', 'https://documentiulia.ro/api/v1')); ?>"
                               class="regular-text" />
                        <p class="description">
                            <?php _e('URL-ul de bază al API-ului DocumentiUlia. Implicit: https://documentiulia.ro/api/v1', 'documentiulia-woocommerce'); ?>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="documentiulia_wc_api_key"><?php _e('Cheie API', 'documentiulia-woocommerce'); ?></label>
                    </th>
                    <td>
                        <input type="text"
                               id="documentiulia_wc_api_key"
                               name="documentiulia_wc_api_key"
                               value="<?php echo esc_attr(get_option('documentiulia_wc_api_key')); ?>"
                               class="regular-text"
                               required />
                        <p class="description">
                            <?php _e('Găsește cheia API în contul tău DocumentiUlia → Setări → Integrări', 'documentiulia-woocommerce'); ?>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="documentiulia_wc_api_secret"><?php _e('Secret API', 'documentiulia-woocommerce'); ?></label>
                    </th>
                    <td>
                        <input type="password"
                               id="documentiulia_wc_api_secret"
                               name="documentiulia_wc_api_secret"
                               value="<?php echo esc_attr(get_option('documentiulia_wc_api_secret')); ?>"
                               class="regular-text"
                               required />
                        <p class="description">
                            <?php _e('Secret-ul API asociat cheii de mai sus', 'documentiulia-woocommerce'); ?>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th scope="row"><?php _e('Test Conexiune', 'documentiulia-woocommerce'); ?></th>
                    <td>
                        <button type="button" id="test-connection" class="button button-secondary">
                            <?php _e('Testează Conexiunea', 'documentiulia-woocommerce'); ?>
                        </button>
                        <span id="connection-status"></span>
                        <p class="description">
                            <?php _e('Verifică dacă setările de conexiune sunt corecte', 'documentiulia-woocommerce'); ?>
                        </p>
                    </td>
                </tr>
            </table>

            <?php submit_button(__('Salvează Setările', 'documentiulia-woocommerce')); ?>
        </form>

        <hr>

        <h2><?php _e('Ghid Rapid de Configurare', 'documentiulia-woocommerce'); ?></h2>
        <ol>
            <li><?php _e('Creează un cont pe', 'documentiulia-woocommerce'); ?> <a href="https://documentiulia.ro" target="_blank">DocumentiUlia.ro</a></li>
            <li><?php _e('Mergi la Setări → Integrări', 'documentiulia-woocommerce'); ?></li>
            <li><?php _e('Generează o cheie API nouă', 'documentiulia-woocommerce'); ?></li>
            <li><?php _e('Copiază Cheia API și Secret-ul aici', 'documentiulia-woocommerce'); ?></li>
            <li><?php _e('Testează conexiunea', 'documentiulia-woocommerce'); ?></li>
            <li><?php _e('Mergi la tab-ul "Sincronizare" pentru a configura setările', 'documentiulia-woocommerce'); ?></li>
        </ol>
        <?php
    }

    /**
     * Render sync tab
     */
    private function render_sync_tab() {
        $warehouses = $this->get_warehouses();
        ?>
        <form method="post" action="options.php">
            <?php settings_fields('documentiulia_sync'); ?>

            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="documentiulia_wc_enabled"><?php _e('Activează Sincronizarea', 'documentiulia-woocommerce'); ?></label>
                    </th>
                    <td>
                        <label>
                            <input type="checkbox"
                                   id="documentiulia_wc_enabled"
                                   name="documentiulia_wc_enabled"
                                   value="1"
                                   <?php checked(get_option('documentiulia_wc_enabled'), 1); ?> />
                            <?php _e('Activează sincronizarea automată între WooCommerce și DocumentiUlia', 'documentiulia-woocommerce'); ?>
                        </label>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="documentiulia_wc_warehouse_id"><?php _e('Depozit/Magazin', 'documentiulia-woocommerce'); ?></label>
                    </th>
                    <td>
                        <select id="documentiulia_wc_warehouse_id" name="documentiulia_wc_warehouse_id" class="regular-text">
                            <option value=""><?php _e('Selectează depozit/magazin', 'documentiulia-woocommerce'); ?></option>
                            <?php if (!empty($warehouses)): ?>
                                <?php foreach ($warehouses as $warehouse): ?>
                                    <option value="<?php echo esc_attr($warehouse['id']); ?>"
                                            <?php selected(get_option('documentiulia_wc_warehouse_id'), $warehouse['id']); ?>>
                                        <?php echo esc_html($warehouse['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </select>
                        <p class="description">
                            <?php _e('Selectează depozitul/magazinul DocumentiUlia care va fi sincronizat cu WooCommerce', 'documentiulia-woocommerce'); ?>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th scope="row"><?php _e('Ce Sincronizăm?', 'documentiulia-woocommerce'); ?></th>
                    <td>
                        <fieldset>
                            <label>
                                <input type="checkbox"
                                       name="documentiulia_wc_sync_stock"
                                       value="1"
                                       <?php checked(get_option('documentiulia_wc_sync_stock', 1), 1); ?> />
                                <?php _e('Niveluri de stoc', 'documentiulia-woocommerce'); ?>
                            </label>
                            <br>
                            <label>
                                <input type="checkbox"
                                       name="documentiulia_wc_sync_prices"
                                       value="1"
                                       <?php checked(get_option('documentiulia_wc_sync_prices'), 1); ?> />
                                <?php _e('Prețuri produse', 'documentiulia-woocommerce'); ?>
                            </label>
                            <br>
                            <label>
                                <input type="checkbox"
                                       name="documentiulia_wc_sync_images"
                                       value="1"
                                       <?php checked(get_option('documentiulia_wc_sync_images'), 1); ?> />
                                <?php _e('Imagini produse', 'documentiulia-woocommerce'); ?>
                            </label>
                            <br>
                            <label>
                                <input type="checkbox"
                                       name="documentiulia_wc_sync_orders"
                                       value="1"
                                       <?php checked(get_option('documentiulia_wc_sync_orders', 1), 1); ?> />
                                <?php _e('Comenzi (actualizează stocul automat)', 'documentiulia-woocommerce'); ?>
                            </label>
                        </fieldset>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="documentiulia_wc_sync_frequency"><?php _e('Frecvență Sincronizare', 'documentiulia-woocommerce'); ?></label>
                    </th>
                    <td>
                        <select id="documentiulia_wc_sync_frequency" name="documentiulia_wc_sync_frequency">
                            <option value="realtime" <?php selected(get_option('documentiulia_wc_sync_frequency', 'realtime'), 'realtime'); ?>>
                                <?php _e('Timp real (webhooks) - Recomandat', 'documentiulia-woocommerce'); ?>
                            </option>
                            <option value="5min" <?php selected(get_option('documentiulia_wc_sync_frequency'), '5min'); ?>>
                                <?php _e('La fiecare 5 minute', 'documentiulia-woocommerce'); ?>
                            </option>
                            <option value="15min" <?php selected(get_option('documentiulia_wc_sync_frequency'), '15min'); ?>>
                                <?php _e('La fiecare 15 minute', 'documentiulia-woocommerce'); ?>
                            </option>
                            <option value="hourly" <?php selected(get_option('documentiulia_wc_sync_frequency'), 'hourly'); ?>>
                                <?php _e('O dată pe oră', 'documentiulia-woocommerce'); ?>
                            </option>
                            <option value="manual" <?php selected(get_option('documentiulia_wc_sync_frequency'), 'manual'); ?>>
                                <?php _e('Manual (dezactivează sincronizarea automată)', 'documentiulia-woocommerce'); ?>
                            </option>
                        </select>
                    </td>
                </tr>

                <tr>
                    <th scope="row"><?php _e('Sincronizare Inițială', 'documentiulia-woocommerce'); ?></th>
                    <td>
                        <button type="button" id="initial-sync-wc-to-doc" class="button button-secondary">
                            <?php _e('WooCommerce → DocumentiUlia', 'documentiulia-woocommerce'); ?>
                        </button>
                        <button type="button" id="initial-sync-doc-to-wc" class="button button-secondary">
                            <?php _e('DocumentiUlia → WooCommerce', 'documentiulia-woocommerce'); ?>
                        </button>
                        <button type="button" id="initial-sync-twoway" class="button button-secondary">
                            <?php _e('Sincronizare Bidirecțională', 'documentiulia-woocommerce'); ?>
                        </button>
                        <p class="description">
                            <?php _e('Sincronizează toate produsele existente. Folosește doar o dată la configurare inițială.', 'documentiulia-woocommerce'); ?>
                        </p>
                        <div id="sync-progress" style="display:none;">
                            <div class="sync-progress-bar">
                                <div class="sync-progress-fill"></div>
                            </div>
                            <p id="sync-status-text"></p>
                        </div>
                    </td>
                </tr>
            </table>

            <?php submit_button(__('Salvează Setările', 'documentiulia-woocommerce')); ?>
        </form>
        <?php
    }

    /**
     * Render status tab
     */
    private function render_status_tab() {
        $api_client = new DocumentiUlia_WC_API_Client();
        $connection_ok = $api_client->test_connection();

        global $wpdb;
        $recent_syncs = $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}documentiulia_sync_log
             ORDER BY created_at DESC
             LIMIT 10"
        );
        ?>
        <div class="documentiulia-status-dashboard">
            <h2><?php _e('Status Conexiune', 'documentiulia-woocommerce'); ?></h2>

            <table class="widefat">
                <tbody>
                    <tr>
                        <td><strong><?php _e('Status Conexiune', 'documentiulia-woocommerce'); ?></strong></td>
                        <td>
                            <?php if ($connection_ok): ?>
                                <span class="status-badge status-success">✓ <?php _e('Conectat', 'documentiulia-woocommerce'); ?></span>
                            <?php else: ?>
                                <span class="status-badge status-error">✗ <?php _e('Deconectat', 'documentiulia-woocommerce'); ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Sincronizare Activă', 'documentiulia-woocommerce'); ?></strong></td>
                        <td>
                            <?php if (get_option('documentiulia_wc_enabled')): ?>
                                <span class="status-badge status-success">✓ <?php _e('Da', 'documentiulia-woocommerce'); ?></span>
                            <?php else: ?>
                                <span class="status-badge status-warning">— <?php _e('Nu', 'documentiulia-woocommerce'); ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Depozit Selectat', 'documentiulia-woocommerce'); ?></strong></td>
                        <td><?php echo esc_html($this->get_warehouse_name(get_option('documentiulia_wc_warehouse_id'))); ?></td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Frecvență Sincronizare', 'documentiulia-woocommerce'); ?></strong></td>
                        <td><?php echo esc_html($this->get_sync_frequency_label(get_option('documentiulia_wc_sync_frequency', 'realtime'))); ?></td>
                    </tr>
                </tbody>
            </table>

            <h3><?php _e('Sincronizări Recente', 'documentiulia-woocommerce'); ?></h3>

            <?php if (!empty($recent_syncs)): ?>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php _e('Data', 'documentiulia-woocommerce'); ?></th>
                            <th><?php _e('Produs ID', 'documentiulia-woocommerce'); ?></th>
                            <th><?php _e('Tip', 'documentiulia-woocommerce'); ?></th>
                            <th><?php _e('Direcție', 'documentiulia-woocommerce'); ?></th>
                            <th><?php _e('Status', 'documentiulia-woocommerce'); ?></th>
                            <th><?php _e('Mesaj', 'documentiulia-woocommerce'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_syncs as $sync): ?>
                            <tr>
                                <td><?php echo esc_html($sync->created_at); ?></td>
                                <td>
                                    <?php if ($sync->product_id > 0): ?>
                                        <a href="<?php echo esc_url(get_edit_post_link($sync->product_id)); ?>">
                                            #<?php echo esc_html($sync->product_id); ?>
                                        </a>
                                    <?php else: ?>
                                        —
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($sync->sync_type); ?></td>
                                <td><?php echo esc_html($this->get_direction_label($sync->direction)); ?></td>
                                <td>
                                    <span class="status-badge status-<?php echo esc_attr($sync->status); ?>">
                                        <?php echo esc_html(ucfirst($sync->status)); ?>
                                    </span>
                                </td>
                                <td><?php echo esc_html($sync->message); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p><?php _e('Nu există sincronizări recente.', 'documentiulia-woocommerce'); ?></p>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Render logs tab
     */
    private function render_logs_tab() {
        global $wpdb;

        $per_page = 50;
        $page = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
        $offset = ($page - 1) * $per_page;

        $total = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}documentiulia_sync_log");
        $logs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}documentiulia_sync_log
             ORDER BY created_at DESC
             LIMIT %d OFFSET %d",
            $per_page,
            $offset
        ));
        ?>
        <div class="documentiulia-logs">
            <h2><?php _e('Log-uri Sincronizare', 'documentiulia-woocommerce'); ?></h2>

            <div class="tablenav top">
                <div class="alignleft actions">
                    <button type="button" id="clear-logs" class="button button-secondary">
                        <?php _e('Șterge Toate Log-urile', 'documentiulia-woocommerce'); ?>
                    </button>
                </div>
            </div>

            <table class="widefat striped">
                <thead>
                    <tr>
                        <th style="width: 180px;"><?php _e('Data', 'documentiulia-woocommerce'); ?></th>
                        <th style="width: 80px;"><?php _e('Produs', 'documentiulia-woocommerce'); ?></th>
                        <th style="width: 100px;"><?php _e('Tip Sincronizare', 'documentiulia-woocommerce'); ?></th>
                        <th style="width: 120px;"><?php _e('Direcție', 'documentiulia-woocommerce'); ?></th>
                        <th style="width: 100px;"><?php _e('Status', 'documentiulia-woocommerce'); ?></th>
                        <th><?php _e('Mesaj', 'documentiulia-woocommerce'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($logs)): ?>
                        <?php foreach ($logs as $log): ?>
                            <tr>
                                <td><?php echo esc_html($log->created_at); ?></td>
                                <td>
                                    <?php if ($log->product_id > 0): ?>
                                        <a href="<?php echo esc_url(get_edit_post_link($log->product_id)); ?>">
                                            #<?php echo esc_html($log->product_id); ?>
                                        </a>
                                    <?php else: ?>
                                        —
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($log->sync_type); ?></td>
                                <td><?php echo esc_html($this->get_direction_label($log->direction)); ?></td>
                                <td>
                                    <span class="status-badge status-<?php echo esc_attr($log->status); ?>">
                                        <?php echo esc_html(ucfirst($log->status)); ?>
                                    </span>
                                </td>
                                <td><?php echo esc_html($log->message); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6"><?php _e('Nu există log-uri.', 'documentiulia-woocommerce'); ?></td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <?php
            $total_pages = ceil($total / $per_page);
            if ($total_pages > 1):
            ?>
                <div class="tablenav bottom">
                    <div class="tablenav-pages">
                        <?php
                        echo paginate_links(array(
                            'base' => add_query_arg('paged', '%#%'),
                            'format' => '',
                            'current' => $page,
                            'total' => $total_pages,
                        ));
                        ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Get warehouses from DocumentiUlia
     */
    private function get_warehouses() {
        $api_client = new DocumentiUlia_WC_API_Client();
        $response = $api_client->get_warehouses();

        if ($response['success'] && isset($response['data']['data'])) {
            return $response['data']['data'];
        }

        return array();
    }

    /**
     * Get warehouse name
     */
    private function get_warehouse_name($warehouse_id) {
        if (empty($warehouse_id)) {
            return __('Niciun depozit selectat', 'documentiulia-woocommerce');
        }

        $warehouses = $this->get_warehouses();
        foreach ($warehouses as $warehouse) {
            if ($warehouse['id'] === $warehouse_id) {
                return $warehouse['name'];
            }
        }

        return __('Depozit necunoscut', 'documentiulia-woocommerce');
    }

    /**
     * Get sync frequency label
     */
    private function get_sync_frequency_label($frequency) {
        $labels = array(
            'realtime' => __('Timp real (webhooks)', 'documentiulia-woocommerce'),
            '5min' => __('La fiecare 5 minute', 'documentiulia-woocommerce'),
            '15min' => __('La fiecare 15 minute', 'documentiulia-woocommerce'),
            'hourly' => __('O dată pe oră', 'documentiulia-woocommerce'),
            'manual' => __('Manual', 'documentiulia-woocommerce'),
        );

        return isset($labels[$frequency]) ? $labels[$frequency] : $frequency;
    }

    /**
     * Get direction label
     */
    private function get_direction_label($direction) {
        $labels = array(
            'to_documentiulia' => 'WC → Doc',
            'from_documentiulia' => 'Doc → WC',
            'twoway' => 'WC ↔ Doc',
        );

        return isset($labels[$direction]) ? $labels[$direction] : $direction;
    }
}
