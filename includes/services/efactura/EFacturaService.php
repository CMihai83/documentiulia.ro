<?php

namespace DocumentIulia\Services\EFactura;

require_once __DIR__ . '/EFacturaConfig.php';
require_once __DIR__ . '/EFacturaOAuthClient.php';
require_once __DIR__ . '/EFacturaXMLGenerator.php';

/**
 * e-Factura Main Service
 * Complete implementation with state-of-the-art features
 *
 * FEATURES:
 * - Upload invoices to ANAF SPV
 * - Download received invoices
 * - Auto-status synchronization
 * - Batch upload (multiple invoices)
 * - Auto-reconciliation with purchase orders
 * - Intelligent retry logic
 * - Error recovery
 * - Performance optimization
 * - Audit logging
 * - Analytics and reporting
 */
class EFacturaService {

    private $pdo;
    private $oauthClient;
    private $xmlGenerator;

    // Retry configuration
    private $maxRetries = 3;
    private $retryDelay = 2; // seconds

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->oauthClient = new EFacturaOAuthClient($pdo);
        $this->xmlGenerator = new EFacturaXMLGenerator();
    }

    /**
     * Upload single invoice to ANAF
     *
     * @param string $invoiceId UUID of invoice
     * @param string $companyId UUID of company
     * @param array $options Upload options
     * @return array Result with upload_index
     */
    public function uploadInvoice($invoiceId, $companyId, $options = []) {
        $startTime = microtime(true);

        try {
            // 1. Get invoice data
            $invoice = $this->getInvoiceData($invoiceId, $companyId);
            if (!$invoice) {
                throw new \Exception("Invoice not found: $invoiceId");
            }

            // 2. Check if already uploaded
            $existing = $this->getEFacturaRecord($invoiceId);
            if ($existing && in_array($existing['status'], ['uploaded', 'accepted'])) {
                if (empty($options['force_reupload'])) {
                    return [
                        'success' => true,
                        'already_uploaded' => true,
                        'upload_index' => $existing['upload_index'],
                        'message' => 'Invoice already uploaded to ANAF'
                    ];
                }
            }

            // 3. Generate XML
            $xmlData = $this->prepareInvoiceForXML($invoice);
            $xml = $this->xmlGenerator->generateFromInvoice($xmlData);

            // 4. Validate XML
            $validation = $this->xmlGenerator->validateXML($xml);
            if (!$validation['valid']) {
                throw new \Exception('XML validation failed: ' .
                    implode(', ', $validation['errors']));
            }

            // 5. Save XML file
            $xmlPath = $this->saveXMLFile($invoiceId, $xml);
            $xmlHash = hash('sha256', $xml);

            // 6. Get OAuth token
            $accessToken = $this->oauthClient->getAccessToken($companyId);

            // 7. Upload to ANAF (with retry)
            $uploadResult = $this->uploadToANAFWithRetry(
                $accessToken,
                $xml,
                $invoice['company_cif'],
                $options
            );

            // 8. Save record
            $this->saveEFacturaRecord($invoiceId, $companyId, [
                'upload_index' => $uploadResult['index_incarcare'],
                'xml_file_path' => $xmlPath,
                'xml_hash' => $xmlHash,
                'status' => 'uploaded',
                'uploaded_at' => date('Y-m-d H:i:s')
            ]);

            // 9. Log operation
            $duration = round((microtime(true) - $startTime) * 1000);
            $this->logOperation($companyId, 'upload', $invoiceId, true,
                $uploadResult, null, $duration);

            return [
                'success' => true,
                'upload_index' => $uploadResult['index_incarcare'],
                'xml_path' => $xmlPath,
                'message' => 'Invoice uploaded successfully to ANAF',
                'duration_ms' => $duration
            ];

        } catch (\Exception $e) {
            $duration = round((microtime(true) - $startTime) * 1000);
            $this->logOperation($companyId, 'upload', $invoiceId, false,
                null, $e->getMessage(), $duration);

            // Update error status
            $this->updateEFacturaStatus($invoiceId, 'error', $e->getMessage());

            throw $e;
        }
    }

    /**
     * Upload to ANAF with intelligent retry logic
     */
    private function uploadToANAFWithRetry($accessToken, $xml, $cif, $options = []) {
        $attempt = 0;
        $lastError = null;

        while ($attempt < $this->maxRetries) {
            try {
                return $this->callUploadAPI($accessToken, $xml, $cif);

            } catch (\Exception $e) {
                $lastError = $e;
                $attempt++;

                if ($attempt < $this->maxRetries) {
                    // Exponential backoff
                    $delay = $this->retryDelay * pow(2, $attempt - 1);
                    sleep($delay);
                }
            }
        }

        throw new \Exception("Upload failed after {$this->maxRetries} attempts: " .
            $lastError->getMessage());
    }

    /**
     * Call ANAF upload API
     */
    private function callUploadAPI($accessToken, $xml, $cif) {
        $url = EFacturaConfig::getApiUrl(EFacturaConfig::API_UPLOAD);

        // Prepare multipart form data
        $boundary = uniqid('DocumentIulia_');
        $delimiter = '-------------' . $boundary;

        $data = "--" . $delimiter . "\r\n"
            . "Content-Disposition: form-data; name=\"file\"; filename=\"invoice.xml\"\r\n"
            . "Content-Type: application/xml\r\n\r\n"
            . $xml . "\r\n"
            . "--" . $delimiter . "\r\n"
            . "Content-Disposition: form-data; name=\"cif\"\r\n\r\n"
            . $cif . "\r\n"
            . "--" . $delimiter . "\r\n"
            . "Content-Disposition: form-data; name=\"standard\"\r\n\r\n"
            . "UBL\r\n"
            . "--" . $delimiter . "--\r\n";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: multipart/form-data; boundary=' . $delimiter,
            'Content-Length: ' . strlen($data)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \Exception("CURL Error: $curlError");
        }

        if ($httpCode !== 200) {
            throw new \Exception("ANAF API error: HTTP $httpCode - $response");
        }

        $result = json_decode($response, true);

        if ($result['header']['ExecutionStatus'] !== 0) {
            $errors = [];
            if (isset($result['header']['Errors'])) {
                foreach ($result['header']['Errors'] as $error) {
                    $errors[] = $error['errorMessage'] ?? 'Unknown error';
                }
            }
            throw new \Exception("ANAF validation failed: " . implode(', ', $errors));
        }

        if (empty($result['index_incarcare'])) {
            throw new \Exception("No upload_index returned from ANAF");
        }

        return $result;
    }

    /**
     * ADVANCED: Batch upload multiple invoices
     *
     * @param array $invoiceIds Array of invoice UUIDs
     * @param string $companyId UUID of company
     * @param array $options Batch options
     * @return array Results for each invoice
     */
    public function batchUploadInvoices($invoiceIds, $companyId, $options = []) {
        $results = [];
        $successCount = 0;
        $failCount = 0;

        $continueOnError = $options['continue_on_error'] ?? true;
        $maxConcurrent = $options['max_concurrent'] ?? 5;

        foreach ($invoiceIds as $invoiceId) {
            try {
                $result = $this->uploadInvoice($invoiceId, $companyId, $options);
                $results[$invoiceId] = $result;
                $successCount++;

                // Small delay to avoid rate limiting
                usleep(200000); // 200ms

            } catch (\Exception $e) {
                $failCount++;
                $results[$invoiceId] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];

                if (!$continueOnError) {
                    break;
                }
            }
        }

        return [
            'total' => count($invoiceIds),
            'success' => $successCount,
            'failed' => $failCount,
            'results' => $results
        ];
    }

    /**
     * Check invoice status at ANAF
     *
     * @param int $uploadIndex ANAF upload index
     * @param string $companyId UUID of company
     * @return array Status information
     */
    public function checkInvoiceStatus($uploadIndex, $companyId) {
        try {
            $accessToken = $this->oauthClient->getAccessToken($companyId);
            $company = $this->getCompanyData($companyId);

            $url = EFacturaConfig::getApiUrl(EFacturaConfig::API_STATUS . '/' . $uploadIndex);
            $url .= '?cif=' . $company['cif'];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                throw new \Exception("ANAF API error: HTTP $httpCode");
            }

            $result = json_decode($response, true);

            // Update database with new status
            $this->updateEFacturaStatusFromANAF($uploadIndex, $result);

            return $result;

        } catch (\Exception $e) {
            $this->logOperation($companyId, 'status_check', null, false,
                null, $e->getMessage());
            throw $e;
        }
    }

    /**
     * ADVANCED: Sync all pending invoice statuses
     *
     * @param string $companyId UUID of company
     * @return array Sync results
     */
    public function syncAllInvoiceStatuses($companyId) {
        // Get all invoices with pending/uploaded status
        $stmt = $this->pdo->prepare("
            SELECT upload_index, invoice_id
            FROM efactura_invoices
            WHERE company_id = ?
            AND status IN ('uploaded', 'pending', 'uploading')
            AND upload_index IS NOT NULL
            ORDER BY uploaded_at DESC
            LIMIT 100
        ");
        $stmt->execute([$companyId]);
        $invoices = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $syncedCount = 0;
        $updatedCount = 0;

        foreach ($invoices as $invoice) {
            try {
                $status = $this->checkInvoiceStatus($invoice['upload_index'], $companyId);
                $syncedCount++;

                // Check if status changed
                if ($status['stare'] === 'ok') {
                    $updatedCount++;
                }

                // Small delay
                usleep(500000); // 500ms

            } catch (\Exception $e) {
                // Continue with next invoice
                continue;
            }
        }

        return [
            'total' => count($invoices),
            'synced' => $syncedCount,
            'updated' => $updatedCount
        ];
    }

    /**
     * Download received invoices from ANAF
     *
     * @param string $companyId UUID of company
     * @param array $options Download options (days, filter)
     * @return array Downloaded invoices
     */
    public function downloadReceivedInvoices($companyId, $options = []) {
        try {
            $accessToken = $this->oauthClient->getAccessToken($companyId);
            $company = $this->getCompanyData($companyId);

            $days = $options['days'] ?? 60;
            $filter = $options['filter'] ?? 'R'; // R = Received

            // Get list of messages
            $url = EFacturaConfig::getApiUrl(EFacturaConfig::API_LIST_MESSAGES);
            $url .= '?cif=' . $company['cif'];
            $url .= '&zile=' . $days;
            $url .= '&filtru=' . $filter;

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                throw new \Exception("ANAF API error: HTTP $httpCode");
            }

            $result = json_decode($response, true);

            if (empty($result['mesaje'])) {
                return [
                    'success' => true,
                    'count' => 0,
                    'invoices' => []
                ];
            }

            $downloadedInvoices = [];

            // Download each invoice
            foreach ($result['mesaje'] as $message) {
                if ($message['tip'] === 'FACTURA PRIMITA') {
                    try {
                        $invoiceData = $this->downloadSingleInvoice(
                            $message['id'],
                            $companyId,
                            $accessToken
                        );

                        if ($invoiceData) {
                            $downloadedInvoices[] = $invoiceData;
                        }

                        // Delay to avoid rate limiting
                        usleep(300000); // 300ms

                    } catch (\Exception $e) {
                        // Continue with next invoice
                        continue;
                    }
                }
            }

            $this->logOperation($companyId, 'download', null, true, [
                'downloaded_count' => count($downloadedInvoices)
            ]);

            return [
                'success' => true,
                'count' => count($downloadedInvoices),
                'invoices' => $downloadedInvoices
            ];

        } catch (\Exception $e) {
            $this->logOperation($companyId, 'download', null, false,
                null, $e->getMessage());
            throw $e;
        }
    }

    /**
     * Download single received invoice
     */
    private function downloadSingleInvoice($messageId, $companyId, $accessToken) {
        $url = EFacturaConfig::getApiUrl(EFacturaConfig::API_DOWNLOAD);
        $url .= '?id=' . $messageId;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            return null;
        }

        // Response is ZIP file, extract XML
        $tempZip = tempnam(sys_get_temp_dir(), 'efactura_');
        file_put_contents($tempZip, $response);

        $zip = new \ZipArchive();
        if ($zip->open($tempZip) !== true) {
            unlink($tempZip);
            return null;
        }

        $xml = $zip->getFromIndex(0);
        $zip->close();
        unlink($tempZip);

        if (!$xml) {
            return null;
        }

        // Parse XML and extract data
        $invoiceData = $this->parseReceivedInvoiceXML($xml);

        if ($invoiceData) {
            // Save to database
            $this->saveReceivedInvoice($companyId, $messageId, $xml, $invoiceData);
        }

        return $invoiceData;
    }

    /**
     * ADVANCED: Parse received invoice XML
     */
    private function parseReceivedInvoiceXML($xml) {
        $dom = new \DOMDocument();
        if (!@$dom->loadXML($xml)) {
            return null;
        }

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('cbc', EFacturaConfig::CBC_NAMESPACE);
        $xpath->registerNamespace('cac', EFacturaConfig::CAC_NAMESPACE);

        $data = [];

        // Invoice number
        $invoiceNumber = $xpath->query('//cbc:ID');
        $data['invoice_number'] = $invoiceNumber->length > 0 ?
            $invoiceNumber->item(0)->nodeValue : 'UNKNOWN';

        // Invoice date
        $invoiceDate = $xpath->query('//cbc:IssueDate');
        $data['invoice_date'] = $invoiceDate->length > 0 ?
            $invoiceDate->item(0)->nodeValue : null;

        // Total amount
        $payableAmount = $xpath->query('//cac:LegalMonetaryTotal/cbc:PayableAmount');
        $data['total_amount'] = $payableAmount->length > 0 ?
            floatval($payableAmount->item(0)->nodeValue) : 0;

        // VAT amount
        $taxAmount = $xpath->query('//cac:TaxTotal/cbc:TaxAmount');
        $data['vat_amount'] = $taxAmount->length > 0 ?
            floatval($taxAmount->item(0)->nodeValue) : 0;

        // Currency
        $currency = $payableAmount->length > 0 ?
            $payableAmount->item(0)->getAttribute('currencyID') : 'RON';
        $data['currency'] = $currency;

        // Supplier CIF
        $supplierCIF = $xpath->query('//cac:AccountingSupplierParty//cbc:CompanyID');
        $data['supplier_cif'] = $supplierCIF->length > 0 ?
            $supplierCIF->item(0)->nodeValue : 'UNKNOWN';

        return $data;
    }

    /**
     * ADVANCED: Auto-match received invoice with purchase order
     *
     * @param string $receivedInvoiceId UUID of received invoice
     * @param string $companyId UUID of company
     * @return array Match result
     */
    public function autoMatchWithPurchaseOrder($receivedInvoiceId, $companyId) {
        // Get received invoice
        $stmt = $this->pdo->prepare("
            SELECT * FROM efactura_received_invoices
            WHERE id = ? AND company_id = ?
        ");
        $stmt->execute([$receivedInvoiceId, $companyId]);
        $receivedInvoice = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$receivedInvoice) {
            throw new \Exception("Received invoice not found");
        }

        // Find matching purchase order
        // Match by: supplier CIF, amount (with tolerance), date range
        $stmt = $this->pdo->prepare("
            SELECT po.* FROM purchase_orders po
            JOIN contacts c ON po.supplier_id = c.id
            WHERE po.company_id = ?
            AND c.tax_id = ?
            AND po.total_amount BETWEEN ? AND ?
            AND po.status IN ('approved', 'sent')
            AND po.created_at >= ?
            ORDER BY ABS(po.total_amount - ?) ASC
            LIMIT 1
        ");

        $tolerance = 0.01; // 1% tolerance
        $minAmount = $receivedInvoice['total_amount'] * (1 - $tolerance);
        $maxAmount = $receivedInvoice['total_amount'] * (1 + $tolerance);
        $dateThreshold = date('Y-m-d', strtotime('-90 days', strtotime($receivedInvoice['invoice_date'])));

        $stmt->execute([
            $companyId,
            $receivedInvoice['cif'],
            $minAmount,
            $maxAmount,
            $dateThreshold,
            $receivedInvoice['total_amount']
        ]);

        $purchaseOrder = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($purchaseOrder) {
            // Update received invoice with match
            $stmt = $this->pdo->prepare("
                UPDATE efactura_received_invoices
                SET matched_purchase_order_id = ?,
                    status = 'matched'
                WHERE id = ?
            ");
            $stmt->execute([$purchaseOrder['id'], $receivedInvoiceId]);

            return [
                'matched' => true,
                'purchase_order' => $purchaseOrder,
                'confidence' => $this->calculateMatchConfidence($receivedInvoice, $purchaseOrder)
            ];
        }

        return [
            'matched' => false,
            'message' => 'No matching purchase order found'
        ];
    }

    /**
     * Calculate match confidence score
     */
    private function calculateMatchConfidence($receivedInvoice, $purchaseOrder) {
        $score = 0;

        // Exact amount match = 50 points
        if (abs($receivedInvoice['total_amount'] - $purchaseOrder['total_amount']) < 0.01) {
            $score += 50;
        } else {
            // Partial points based on difference
            $diff = abs($receivedInvoice['total_amount'] - $purchaseOrder['total_amount']);
            $diffPercent = ($diff / $receivedInvoice['total_amount']) * 100;
            $score += max(0, 50 - ($diffPercent * 10));
        }

        // Date proximity = 30 points
        $daysDiff = abs(strtotime($receivedInvoice['invoice_date']) -
            strtotime($purchaseOrder['created_at'])) / 86400;
        $score += max(0, 30 - $daysDiff);

        // CIF match = 20 points (already matched in query)
        $score += 20;

        return min(100, round($score));
    }

    /**
     * ADVANCED: Get analytics for e-Factura usage
     *
     * @param string $companyId UUID of company
     * @param array $options Analytics options
     * @return array Analytics data
     */
    public function getAnalytics($companyId, $options = []) {
        $period = $options['period'] ?? 30; // days

        // Total invoices uploaded
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_uploaded,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
                AVG(upload_attempt_count) as avg_attempts
            FROM efactura_invoices
            WHERE company_id = ?
            AND created_at >= NOW() - INTERVAL '$period days'
        ");
        $stmt->execute([$companyId]);
        $uploadStats = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Received invoices
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_received,
                COUNT(CASE WHEN status = 'matched' THEN 1 END) as matched,
                SUM(total_amount) as total_value
            FROM efactura_received_invoices
            WHERE company_id = ?
            AND received_at >= NOW() - INTERVAL '$period days'
        ");
        $stmt->execute([$companyId]);
        $receivedStats = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Performance metrics
        $stmt = $this->pdo->prepare("
            SELECT
                AVG(duration_ms) as avg_duration,
                MAX(duration_ms) as max_duration,
                MIN(duration_ms) as min_duration
            FROM efactura_sync_log
            WHERE company_id = ?
            AND operation_type = 'upload'
            AND success = true
            AND created_at >= NOW() - INTERVAL '$period days'
        ");
        $stmt->execute([$companyId]);
        $performance = $stmt->fetch(\PDO::FETCH_ASSOC);

        return [
            'uploaded' => $uploadStats,
            'received' => $receivedStats,
            'performance' => $performance,
            'success_rate' => $uploadStats['total_uploaded'] > 0 ?
                round(($uploadStats['accepted'] / $uploadStats['total_uploaded']) * 100, 2) : 0
        ];
    }

    // Helper methods

    private function getInvoiceData($invoiceId, $companyId) {
        // Fetch complete invoice data from database
        $stmt = $this->pdo->prepare("
            SELECT i.*, c.name as company_name, c.cif as company_cif,
                   c.address as company_address, c.vat_number as company_vat
            FROM invoices i
            JOIN companies c ON i.company_id = c.id
            WHERE i.id = ? AND i.company_id = ?
        ");
        $stmt->execute([$invoiceId, $companyId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    private function prepareInvoiceForXML($invoice) {
        // Transform database invoice format to XML generator format
        // This is a simplified version - expand based on your schema
        return [
            'invoice_number' => $invoice['invoice_number'],
            'invoice_date' => $invoice['invoice_date'],
            'due_date' => $invoice['due_date'],
            'currency' => $invoice['currency'] ?? 'RON',
            'company_cif' => $invoice['company_cif'],
            'supplier' => [
                'cif' => $invoice['company_cif'],
                'name' => $invoice['company_name'],
                'vat_number' => $invoice['company_vat'],
                'address' => json_decode($invoice['company_address'], true) ?? [],
            ],
            'customer' => json_decode($invoice['customer_data'], true) ?? [],
            'line_items' => json_decode($invoice['line_items'], true) ?? [],
            'tax_totals' => json_decode($invoice['tax_totals'], true) ?? [],
            'totals' => [
                'line_extension' => $invoice['subtotal'],
                'tax_exclusive' => $invoice['subtotal'],
                'tax_inclusive' => $invoice['total'],
                'payable_amount' => $invoice['total']
            ],
            'payment' => json_decode($invoice['payment_info'], true) ?? []
        ];
    }

    private function saveXMLFile($invoiceId, $xml) {
        $filename = $invoiceId . '_' . time() . '.xml';
        $path = EFacturaConfig::XML_STORAGE_PATH . $filename;

        if (!file_put_contents($path, $xml)) {
            throw new \Exception("Failed to save XML file");
        }

        return $path;
    }

    private function getEFacturaRecord($invoiceId) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM efactura_invoices WHERE invoice_id = ?
        ");
        $stmt->execute([$invoiceId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    private function saveEFacturaRecord($invoiceId, $companyId, $data) {
        $existing = $this->getEFacturaRecord($invoiceId);

        if ($existing) {
            $stmt = $this->pdo->prepare("
                UPDATE efactura_invoices SET
                    upload_index = ?,
                    xml_file_path = ?,
                    xml_hash = ?,
                    status = ?,
                    uploaded_at = ?,
                    upload_attempt_count = upload_attempt_count + 1
                WHERE invoice_id = ?
            ");
            $stmt->execute([
                $data['upload_index'],
                $data['xml_file_path'],
                $data['xml_hash'],
                $data['status'],
                $data['uploaded_at'],
                $invoiceId
            ]);
        } else {
            $stmt = $this->pdo->prepare("
                INSERT INTO efactura_invoices (
                    invoice_id, company_id, upload_index, xml_file_path,
                    xml_hash, status, uploaded_at, upload_attempt_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([
                $invoiceId,
                $companyId,
                $data['upload_index'],
                $data['xml_file_path'],
                $data['xml_hash'],
                $data['status'],
                $data['uploaded_at']
            ]);
        }
    }

    private function updateEFacturaStatus($invoiceId, $status, $message = null) {
        $stmt = $this->pdo->prepare("
            UPDATE efactura_invoices SET
                status = ?,
                last_error = ?,
                last_sync_at = CURRENT_TIMESTAMP
            WHERE invoice_id = ?
        ");
        $stmt->execute([$status, $message, $invoiceId]);
    }

    private function updateEFacturaStatusFromANAF($uploadIndex, $anafResponse) {
        $status = $anafResponse['stare'] ?? 'unknown';
        $messages = isset($anafResponse['Messages']) ?
            implode(', ', $anafResponse['Messages']) : null;

        $dbStatus = 'uploaded';
        if ($status === 'ok') {
            $dbStatus = 'accepted';
        } elseif ($status === 'nok') {
            $dbStatus = 'rejected';
        }

        $stmt = $this->pdo->prepare("
            UPDATE efactura_invoices SET
                status = ?,
                anaf_status = ?,
                anaf_message = ?,
                validated_at = CASE WHEN ? = 'accepted' THEN CURRENT_TIMESTAMP ELSE validated_at END,
                last_sync_at = CURRENT_TIMESTAMP
            WHERE upload_index = ?
        ");
        $stmt->execute([$dbStatus, $status, $messages, $dbStatus, $uploadIndex]);
    }

    private function saveReceivedInvoice($companyId, $uploadIndex, $xml, $data) {
        // Check if already exists
        $stmt = $this->pdo->prepare("
            SELECT id FROM efactura_received_invoices
            WHERE upload_index = ? AND company_id = ?
        ");
        $stmt->execute([$uploadIndex, $companyId]);
        $existing = $stmt->fetch();

        if ($existing) {
            return; // Already imported
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO efactura_received_invoices (
                company_id, upload_index, cif, invoice_number,
                invoice_date, total_amount, vat_amount, currency,
                xml_content, received_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");

        $stmt->execute([
            $companyId,
            $uploadIndex,
            $data['supplier_cif'],
            $data['invoice_number'],
            $data['invoice_date'],
            $data['total_amount'],
            $data['vat_amount'],
            $data['currency'],
            $xml
        ]);
    }

    private function getCompanyData($companyId) {
        $stmt = $this->pdo->prepare("SELECT * FROM companies WHERE id = ?");
        $stmt->execute([$companyId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    private function logOperation($companyId, $operation, $invoiceId, $success,
                                 $response = null, $error = null, $duration = 0) {
        $stmt = $this->pdo->prepare("
            INSERT INTO efactura_sync_log (
                company_id, operation_type, invoice_id, success,
                response_payload, error_message, duration_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $companyId,
            $operation,
            $invoiceId,
            $success,
            $response ? json_encode($response) : null,
            $error,
            $duration
        ]);
    }
}
