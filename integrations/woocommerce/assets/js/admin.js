/**
 * DocumentiUlia WooCommerce Admin JavaScript
 */

(function($) {
    'use strict';

    const DocumentiUliaAdmin = {
        /**
         * Initialize
         */
        init: function() {
            this.testConnection();
            this.handleInitialSync();
            this.handleClearLogs();
            this.refreshStatus();
        },

        /**
         * Test Connection Button
         */
        testConnection: function() {
            $('#test-connection').on('click', function(e) {
                e.preventDefault();

                const $button = $(this);
                const $result = $('#connection-test-result');

                $button.prop('disabled', true).text('Se testează...');
                $result.html('');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'documentiulia_test_connection',
                        nonce: documentiuliaAdmin.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $result.html('<div class="notice notice-success"><p>✓ Conexiune reușită! Sistem conectat la DocumentiUlia.</p></div>');
                        } else {
                            $result.html('<div class="notice notice-error"><p>✗ Conexiune eșuată: ' + response.data.message + '</p></div>');
                        }
                    },
                    error: function() {
                        $result.html('<div class="notice notice-error"><p>✗ Eroare de comunicare cu serverul.</p></div>');
                    },
                    complete: function() {
                        $button.prop('disabled', false).text('Testează Conexiunea');
                    }
                });
            });
        },

        /**
         * Handle Initial Sync Buttons
         */
        handleInitialSync: function() {
            const self = this;

            // Sync TO DocumentiUlia
            $('#sync-to-documentiulia').on('click', function(e) {
                e.preventDefault();
                self.runInitialSync('to_documentiulia', $(this));
            });

            // Sync FROM DocumentiUlia
            $('#sync-from-documentiulia').on('click', function(e) {
                e.preventDefault();
                self.runInitialSync('from_documentiulia', $(this));
            });
        },

        /**
         * Run Initial Sync
         */
        runInitialSync: function(direction, $button) {
            const $result = $('#sync-result');
            const originalText = $button.text();

            // Confirm action
            const confirmMessage = direction === 'to_documentiulia'
                ? 'Sigur doriți să sincronizați toate produsele din WooCommerce către DocumentiUlia?'
                : 'Sigur doriți să importați toate produsele din DocumentiUlia în WooCommerce?';

            if (!confirm(confirmMessage)) {
                return;
            }

            $button.prop('disabled', true).html('<span class="spinner is-active" style="float: none; margin: 0;"></span> Sincronizare în curs...');
            $result.html('<div class="notice notice-info"><p>⏳ Sincronizarea a început. Vă rugăm așteptați...</p></div>');

            $.ajax({
                url: ajaxurl,
                type: 'POST',
                timeout: 120000, // 2 minutes timeout
                data: {
                    action: 'documentiulia_initial_sync',
                    direction: direction,
                    nonce: documentiuliaAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        const data = response.data;
                        $result.html(
                            '<div class="notice notice-success"><p>' +
                            '✓ Sincronizare completă!<br>' +
                            'Sincronizate: <strong>' + data.synced + '</strong><br>' +
                            'Erori: <strong>' + data.errors + '</strong><br>' +
                            'Total procesate: <strong>' + data.total + '</strong>' +
                            '</p></div>'
                        );

                        // Refresh status tab if visible
                        if ($('.nav-tab-active').attr('href').includes('status')) {
                            location.reload();
                        }
                    } else {
                        $result.html('<div class="notice notice-error"><p>✗ Eroare: ' + response.data.message + '</p></div>');
                    }
                },
                error: function(xhr, status, error) {
                    let errorMessage = 'Eroare de comunicare cu serverul.';
                    if (status === 'timeout') {
                        errorMessage = 'Sincronizarea durează mai mult decât se aștepta. Verificați tab-ul "Status" pentru progres.';
                    }
                    $result.html('<div class="notice notice-error"><p>✗ ' + errorMessage + '</p></div>');
                },
                complete: function() {
                    $button.prop('disabled', false).html(originalText);
                }
            });
        },

        /**
         * Clear Logs Button
         */
        handleClearLogs: function() {
            $('#clear-logs').on('click', function(e) {
                e.preventDefault();

                if (!confirm('Sigur doriți să ștergeți toate log-urile? Această acțiune este ireversibilă.')) {
                    return;
                }

                const $button = $(this);

                $button.prop('disabled', true).text('Se șterge...');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'documentiulia_clear_logs',
                        nonce: documentiuliaAdmin.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            location.reload();
                        } else {
                            alert('Eroare la ștergerea log-urilor.');
                        }
                    },
                    error: function() {
                        alert('Eroare de comunicare cu serverul.');
                    },
                    complete: function() {
                        $button.prop('disabled', false).text('Șterge Toate Log-urile');
                    }
                });
            });
        },

        /**
         * Auto-refresh Status Tab
         */
        refreshStatus: function() {
            // Only on status tab
            if (!$('.nav-tab-active').attr('href') || !$('.nav-tab-active').attr('href').includes('status')) {
                return;
            }

            // Refresh every 30 seconds
            setInterval(function() {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'documentiulia_get_status',
                        nonce: documentiuliaAdmin.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            // Update connection status
                            const $connectionStatus = $('.connection-status');
                            if (response.data.connection) {
                                $connectionStatus.html('<span class="status-badge status-success">✓ Conectat</span>');
                            } else {
                                $connectionStatus.html('<span class="status-badge status-error">✗ Deconectat</span>');
                            }

                            // Update last sync time if available
                            if (response.data.last_sync) {
                                $('.last-sync-time').text(response.data.last_sync);
                            }
                        }
                    }
                });
            }, 30000);
        }
    };

    // Initialize on document ready
    $(document).ready(function() {
        DocumentiUliaAdmin.init();
    });

})(jQuery);
