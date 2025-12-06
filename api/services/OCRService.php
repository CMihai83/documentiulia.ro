<?php
/**
 * OCR Service - Handles Optical Character Recognition for receipt images
 *
 * Supports multiple OCR providers:
 * - Google Cloud Vision API (primary)
 * - Tesseract OCR (fallback)
 */

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/Database.php';

class OCRService
{
    private $db;
    private $provider;
    private $googleCredentialsPath;
    private $googleApiKey;

    public function __construct(string $provider = 'auto')
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();

        // Get Google credentials from environment
        $this->googleCredentialsPath = getenv('GOOGLE_APPLICATION_CREDENTIALS')
            ?: '/var/www/documentiulia.ro/config/google-vision-credentials.json';

        // Get Google API key from environment
        $this->googleApiKey = getenv('GOOGLE_VISION_API_KEY')
            ?: 'AIzaSyDuKI8Qc5EesOt79dN8kOtj8c8p_7lNwo0';

        // Auto-select provider based on availability
        if ($provider === 'auto') {
            // Try Google Vision REST first (best accuracy)
            if ($this->googleApiKey) {
                $this->provider = 'google_vision_rest';
            } elseif (file_exists($this->googleCredentialsPath) && class_exists('Google\Cloud\Vision\V1\ImageAnnotatorClient')) {
                $this->provider = 'google_vision';
            } elseif (class_exists('thiagoalessio\TesseractOCR\TesseractOCR')) {
                $this->provider = 'tesseract';
            } else {
                throw new Exception("No OCR provider available. Install either Google Cloud Vision or Tesseract OCR.");
            }
        } else {
            $this->provider = $provider;
        }
    }

    /**
     * Process receipt image with OCR
     *
     * @param string $imagePath Full path to image file
     * @return array OCR results with raw text and structured data
     */
    public function processReceipt(string $imagePath): array
    {
        if (!file_exists($imagePath)) {
            throw new Exception("Image file not found: {$imagePath}");
        }

        try {
            if ($this->provider === 'google_vision') {
                return $this->processWithGoogleVision($imagePath);
            } elseif ($this->provider === 'google_vision_rest') {
                return $this->processWithGoogleVisionREST($imagePath);
            } elseif ($this->provider === 'tesseract') {
                return $this->processWithTesseract($imagePath);
            } else {
                throw new Exception("Unsupported OCR provider: {$this->provider}");
            }
        } catch (Exception $e) {
            error_log("OCRService::processReceipt Error: " . $e->getMessage());
            throw new Exception("OCR processing failed: " . $e->getMessage());
        }
    }

    /**
     * Process with Google Cloud Vision API
     */
    private function processWithGoogleVision(string $imagePath): array
    {
        // Check if Google Cloud Vision SDK is available
        if (!class_exists('Google\Cloud\Vision\V1\ImageAnnotatorClient')) {
            throw new Exception("Google Cloud Vision SDK not installed. Run: composer require google/cloud-vision");
        }

        try {
            // Set credentials
            putenv("GOOGLE_APPLICATION_CREDENTIALS={$this->googleCredentialsPath}");

            $imageAnnotator = new Google\Cloud\Vision\V1\ImageAnnotatorClient();

            // Read image content
            $imageContent = file_get_contents($imagePath);
            $image = new Google\Cloud\Vision\V1\Image();
            $image->setContent($imageContent);

            // Perform text detection
            $response = $imageAnnotator->textDetection($image);
            $texts = $response->getTextAnnotations();

            if (count($texts) === 0) {
                throw new Exception("No text detected in image");
            }

            // First annotation contains full text
            $fullText = $texts[0]->getDescription();

            // Get individual text blocks
            $textBlocks = [];
            for ($i = 1; $i < count($texts); $i++) {
                $textBlocks[] = [
                    'text' => $texts[$i]->getDescription(),
                    'confidence' => $this->calculateConfidence($texts[$i])
                ];
            }

            // Perform document text detection for structure
            $documentResponse = $imageAnnotator->documentTextDetection($image);
            $documentAnnotation = $documentResponse->getFullTextAnnotation();

            $structure = [];
            if ($documentAnnotation) {
                foreach ($documentAnnotation->getPages() as $page) {
                    foreach ($page->getBlocks() as $block) {
                        $blockText = '';
                        foreach ($block->getParagraphs() as $paragraph) {
                            foreach ($paragraph->getWords() as $word) {
                                $wordText = '';
                                foreach ($word->getSymbols() as $symbol) {
                                    $wordText .= $symbol->getText();
                                }
                                $blockText .= $wordText . ' ';
                            }
                        }
                        $structure[] = trim($blockText);
                    }
                }
            }

            $imageAnnotator->close();

            return [
                'success' => true,
                'provider' => 'google_vision',
                'raw_text' => $fullText,
                'text_blocks' => $textBlocks,
                'structure' => $structure,
                'confidence' => $this->calculateOverallConfidence($textBlocks)
            ];

        } catch (Exception $e) {
            error_log("Google Vision API Error: " . $e->getMessage());

            // Fallback to Tesseract if available
            if (class_exists('thiagoalessio\TesseractOCR\TesseractOCR')) {
                error_log("Falling back to Tesseract OCR");
                return $this->processWithTesseract($imagePath);
            }

            throw new Exception("Google Vision processing failed: " . $e->getMessage());
        }
    }

    /**
     * Process with Google Cloud Vision REST API (using API key)
     */
    private function processWithGoogleVisionREST(string $imagePath): array
    {
        try {
            // Read and encode image
            $imageContent = file_get_contents($imagePath);
            $base64Image = base64_encode($imageContent);

            // Build request payload
            $requestData = [
                'requests' => [
                    [
                        'image' => [
                            'content' => $base64Image
                        ],
                        'features' => [
                            [
                                'type' => 'TEXT_DETECTION',
                                'maxResults' => 50
                            ],
                            [
                                'type' => 'DOCUMENT_TEXT_DETECTION',
                                'maxResults' => 1
                            ]
                        ],
                        'imageContext' => [
                            'languageHints' => ['ro', 'en']
                        ]
                    ]
                ]
            ];

            // Make API request
            $url = 'https://vision.googleapis.com/v1/images:annotate?key=' . $this->googleApiKey;

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                $result = json_decode($response, true);
                $errorMsg = $result['error']['message'] ?? "HTTP {$httpCode}";
                error_log("Google Vision API HTTP error: {$errorMsg}");
                throw new Exception("Google Vision API not available: {$errorMsg}");
            }

            $result = json_decode($response, true);

            if (isset($result['responses'][0]['error'])) {
                $error = $result['responses'][0]['error'];
                error_log("Google Vision API response error: {$error['message']}");
                throw new Exception("Google Vision API error: {$error['message']}");
            }

            $annotations = $result['responses'][0];

            // Extract text annotations
            $textAnnotations = $annotations['textAnnotations'] ?? [];

            if (empty($textAnnotations)) {
                throw new Exception("No text detected in image");
            }

            // First annotation contains full text
            $fullText = $textAnnotations[0]['description'] ?? '';

            // Get individual text blocks
            $textBlocks = [];
            for ($i = 1; $i < count($textAnnotations); $i++) {
                $textBlocks[] = [
                    'text' => $textAnnotations[$i]['description'] ?? '',
                    'confidence' => 85.0 // Google Vision REST doesn't provide confidence per word
                ];
            }

            // Extract document structure
            $structure = [];
            if (isset($annotations['fullTextAnnotation'])) {
                $pages = $annotations['fullTextAnnotation']['pages'] ?? [];
                foreach ($pages as $page) {
                    $blocks = $page['blocks'] ?? [];
                    foreach ($blocks as $block) {
                        $blockText = '';
                        $paragraphs = $block['paragraphs'] ?? [];
                        foreach ($paragraphs as $paragraph) {
                            $words = $paragraph['words'] ?? [];
                            foreach ($words as $word) {
                                $symbols = $word['symbols'] ?? [];
                                foreach ($symbols as $symbol) {
                                    $blockText .= $symbol['text'] ?? '';
                                }
                                $blockText .= ' ';
                            }
                        }
                        $structure[] = trim($blockText);
                    }
                }
            }

            return [
                'success' => true,
                'provider' => 'google_vision_rest',
                'raw_text' => $fullText,
                'text_blocks' => $textBlocks,
                'structure' => $structure,
                'confidence' => $this->calculateOverallConfidence($textBlocks)
            ];

        } catch (Exception $e) {
            error_log("Google Vision REST API Error: " . $e->getMessage());

            // Fallback to Tesseract if available
            if (class_exists('thiagoalessio\TesseractOCR\TesseractOCR')) {
                error_log("Falling back to Tesseract OCR");
                return $this->processWithTesseract($imagePath);
            }

            throw new Exception("Google Vision REST processing failed: " . $e->getMessage());
        }
    }

    /**
     * Process with Tesseract OCR (enhanced with preprocessing)
     */
    private function processWithTesseract(string $imagePath): array
    {
        // Check if Tesseract is available
        if (!class_exists('thiagoalessio\TesseractOCR\TesseractOCR')) {
            throw new Exception("Tesseract OCR not installed. Run: composer require thiagoalessio/tesseract_ocr");
        }

        try {
            // Preprocess image for better OCR
            $preprocessedPath = $this->preprocessImage($imagePath);

            $ocr = new thiagoalessio\TesseractOCR\TesseractOCR($preprocessedPath);

            // Set Romanian and English languages
            $ocr->lang('ron', 'eng');

            // Configure Tesseract for better receipt recognition
            $ocr->psm(6); // Assume uniform block of text
            $ocr->oem(3); // Default OCR Engine Mode (LSTM)

            // Optimize for receipts
            $ocr->config('tessedit_char_whitelist', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzĂÂÎȘȚăâîșț.,:-/() ');

            // Get text
            $text = $ocr->run();

            // Clean up preprocessed image if different from original
            if ($preprocessedPath !== $imagePath && file_exists($preprocessedPath)) {
                @unlink($preprocessedPath);
            }

            if (empty($text)) {
                throw new Exception("No text detected in image");
            }

            // Split into lines and clean
            $lines = array_filter(array_map('trim', explode("\n", $text)));

            return [
                'success' => true,
                'provider' => 'tesseract_enhanced',
                'raw_text' => $text,
                'text_blocks' => array_map(function($line) {
                    return ['text' => $line, 'confidence' => 75.0];
                }, $lines),
                'structure' => $lines,
                'confidence' => 75.0
            ];

        } catch (Exception $e) {
            error_log("Tesseract OCR Error: " . $e->getMessage());
            throw new Exception("Tesseract processing failed: " . $e->getMessage());
        }
    }

    /**
     * Calculate confidence from Google Vision annotation
     */
    private function calculateConfidence($annotation): float
    {
        // Google Vision doesn't directly provide confidence scores for text
        // We estimate based on detection quality
        return 85.0; // Default high confidence for Google Vision
    }

    /**
     * Calculate overall confidence from text blocks
     */
    private function calculateOverallConfidence(array $textBlocks): float
    {
        if (empty($textBlocks)) {
            return 0.0;
        }

        $sum = 0.0;
        foreach ($textBlocks as $block) {
            $sum += $block['confidence'];
        }

        return $sum / count($textBlocks);
    }

    /**
     * Extract text from image (simple wrapper)
     */
    public function extractText(string $imagePath): string
    {
        $result = $this->processReceipt($imagePath);
        return $result['raw_text'];
    }

    /**
     * Get document structure
     */
    public function getDocumentStructure(string $imagePath): array
    {
        $result = $this->processReceipt($imagePath);
        return $result['structure'];
    }

    /**
     * Preprocess image for better OCR results
     *
     * @param string $imagePath Path to image
     * @return string Path to preprocessed image
     */
    public function preprocessImage(string $imagePath): string
    {
        // Check if ImageMagick is available
        if (!extension_loaded('imagick')) {
            // Return original if ImageMagick not available
            return $imagePath;
        }

        try {
            $image = new Imagick($imagePath);

            // Convert to grayscale
            $image->setImageType(Imagick::IMGTYPE_GRAYSCALE);

            // Enhance contrast
            $image->contrastImage(1);

            // Sharpen
            $image->sharpenImage(0, 1);

            // Normalize
            $image->normalizeImage();

            // Save preprocessed image
            $preprocessedPath = sys_get_temp_dir() . '/preprocessed_' . basename($imagePath);
            $image->writeImage($preprocessedPath);
            $image->clear();

            return $preprocessedPath;

        } catch (Exception $e) {
            error_log("Image preprocessing error: " . $e->getMessage());
            return $imagePath; // Return original on error
        }
    }

    /**
     * Validate image for OCR processing
     */
    public function validateImage(string $imagePath): array
    {
        if (!file_exists($imagePath)) {
            return ['valid' => false, 'error' => 'File does not exist'];
        }

        $fileSize = filesize($imagePath);
        $maxSize = 10 * 1024 * 1024; // 10MB

        if ($fileSize > $maxSize) {
            return ['valid' => false, 'error' => 'File too large (max 10MB)'];
        }

        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        $mimeType = mime_content_type($imagePath);

        if (!in_array($mimeType, $allowedTypes)) {
            return ['valid' => false, 'error' => 'Invalid file type. Only JPEG, PNG, PDF allowed'];
        }

        // Check image dimensions
        if (in_array($mimeType, ['image/jpeg', 'image/jpg', 'image/png'])) {
            $imageInfo = getimagesize($imagePath);
            if (!$imageInfo) {
                return ['valid' => false, 'error' => 'Invalid image file'];
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];

            // Minimum 200x200, maximum 10000x10000
            if ($width < 200 || $height < 200) {
                return ['valid' => false, 'error' => 'Image too small (minimum 200x200 pixels)'];
            }

            if ($width > 10000 || $height > 10000) {
                return ['valid' => false, 'error' => 'Image too large (maximum 10000x10000 pixels)'];
            }

            return [
                'valid' => true,
                'width' => $width,
                'height' => $height,
                'mime_type' => $mimeType,
                'file_size' => $fileSize
            ];
        }

        return [
            'valid' => true,
            'mime_type' => $mimeType,
            'file_size' => $fileSize
        ];
    }

    /**
     * Get OCR statistics for a company
     */
    public function getOCRStats(string $companyId): array
    {
        $query = "SELECT
            COUNT(*) as total_processed,
            COUNT(*) FILTER (WHERE ocr_status = 'completed') as completed,
            COUNT(*) FILTER (WHERE ocr_status = 'failed') as failed,
            AVG(ocr_confidence) FILTER (WHERE ocr_status = 'completed') as avg_confidence,
            COUNT(*) FILTER (WHERE ocr_provider = 'google_vision') as google_vision_count,
            COUNT(*) FILTER (WHERE ocr_provider = 'tesseract') as tesseract_count
            FROM receipts
            WHERE company_id = :company_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([':company_id' => $companyId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
