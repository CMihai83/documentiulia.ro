<?php
/**
 * Ollama DeepSeek Integration Service
 * Provides AI-powered consultation using DeepSeek R1 model
 */

class OllamaService {
    private $baseUrl = 'http://127.0.0.1:11434';
    private $model = 'romanian-fiscal-genius'; // Custom genius-level Romanian fiscal law expert model
    private $knowledgeBase;
    private $timeout = 30; // Reduced timeout for faster responses

    public function __construct() {
        $this->loadKnowledgeBase();
    }

    /**
     * Load Romanian fiscal code knowledge base
     */
    private function loadKnowledgeBase() {
        $knowledgePath = __DIR__ . '/../config/romanian_fiscal_code_knowledge.txt';
        if (file_exists($knowledgePath)) {
            $this->knowledgeBase = file_get_contents($knowledgePath);
        } else {
            $this->knowledgeBase = "Legislatie fiscala romana - baza de cunostinte.";
        }
    }

    /**
     * Generate AI response using DeepSeek
     */
    public function generateResponse($question, $context = []) {
        // Build EXPERT Romanian fiscal law system prompt (optimized for Qwen 2.5:14b)
        // REMOVED knowledge base to fit within 4096 token context window
        $systemPrompt = "Ești EXPERT CONTABIL ȘI FISCAL ROMÂN cu acreditări CECCAR și Camera Consultanților Fiscali.\n" .
                       "Specialist în: Cod Fiscal 2025 (Legea 227/2015), OMFP 1802/2014, Legea 190/2018 GDPR, Codul Muncii 2025.\n\n" .

                       "REGULI OBLIGATORII PENTRU RĂSPUNS:\n" .
                       "1. CITEZ ÎNTOTDEAUNA articolele exacte din legi (ex: Art. 316 alin. 1 Cod Fiscal)\n" .
                       "2. Dau exemple practice numerice în LEI cu calcule pas-cu-pas\n" .
                       "3. Menționez termene legale precise și consecințe pentru nerespectare\n" .
                       "4. Formatare HTML profesională: <p>, <strong>, <ul>, <li>, <em>\n" .
                       "5. Limbă: Română profesională, clară, accesibilă (evit jargonul excesiv)\n" .
                       "6. Dacă nu știu răspunsul exact: menționez că recomand consultarea unui specialist\n\n" .

                       "PRAGURI FISCALE 2025 (Referință):\n" .
                       "- TVA: 300.000 lei (60.000 EUR)\n" .
                       "- Microîntreprindere: max 500.000 EUR cifră afaceri, cota 1% (cu angajați) sau 3% (fără)\n" .
                       "- PFA: CAS 25%, CASS 10%, Impozit 10%\n\n" .

                       "Răspunde PRECIS, COMPLET și PROFESIONAL la următoarea întrebare:";

        // Build the user prompt
        $userPrompt = "INTREBARE: " . $question . "\n\n" .
                     "Raspunde in limba romana, concis si precis. " .
                     "Include exemple numerice daca sunt relevante. " .
                     "Formateaza raspunsul cu HTML (<p>, <strong>, <ul>, <li>).";

        // Add context if provided
        if (!empty($context)) {
            $contextStr = "\n\nCONTEXT SUPLIMENTAR:\n";
            foreach ($context as $key => $value) {
                $contextStr .= "- $key: $value\n";
            }
            $userPrompt .= $contextStr;
        }

        // Call Ollama API
        try {
            $response = $this->callOllama($systemPrompt, $userPrompt);
            return [
                'success' => true,
                'answer' => $this->formatResponse($response),
                'model' => $this->model,
                'source' => 'qwen-ai'
            ];
        } catch (Exception $e) {
            // Fallback to rule-based system if Ollama fails
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'answer' => "Asistent AI temporar indisponibil. Foloseste formularul de mai jos pentru intrebari specifice.",
                'source' => 'fallback'
            ];
        }
    }

    /**
     * Call Ollama API
     */
    private function callOllama($systemPrompt, $userPrompt) {
        $url = $this->baseUrl . '/api/generate';

        $data = [
            'model' => $this->model,
            'prompt' => $systemPrompt . "\n\n" . $userPrompt,
            'stream' => false,
            'options' => [
                'temperature' => 0.2,  // Very low for factual accuracy (fiscal law)
                'top_p' => 0.85,       // Focused sampling for consistent answers
                'top_k' => 40,         // Limit vocabulary for precise terminology
                'repeat_penalty' => 1.1, // Prevent repetition
                'num_predict' => 400,  // Reduced for faster responses
                'num_ctx' => 2048,     // Reduced context window to prevent truncation
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Ollama API error: " . $error);
        }

        if ($httpCode !== 200) {
            throw new Exception("Ollama API returned status code: " . $httpCode);
        }

        $result = json_decode($response, true);

        if (!isset($result['response'])) {
            throw new Exception("Invalid response from Ollama API");
        }

        return $result['response'];
    }

    /**
     * Format AI response for HTML display
     */
    private function formatResponse($text) {
        // Remove any markdown-style formatting
        $text = preg_replace('/\*\*(.*?)\*\*/', '<strong>$1</strong>', $text);
        $text = preg_replace('/\*(.*?)\*/', '<em>$1</em>', $text);

        // Convert newlines to paragraphs
        $paragraphs = explode("\n\n", trim($text));
        $html = '';

        foreach ($paragraphs as $para) {
            $para = trim($para);
            if (empty($para)) continue;

            // Check if it's a list
            if (preg_match('/^[-•]\s/', $para)) {
                $items = explode("\n", $para);
                $html .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
                foreach ($items as $item) {
                    $item = preg_replace('/^[-•]\s*/', '', trim($item));
                    if (!empty($item)) {
                        $html .= "<li>" . $item . "</li>";
                    }
                }
                $html .= "</ul>";
            } else {
                $html .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'>" . $para . "</p>";
            }
        }

        return $html;
    }

    /**
     * Check if Ollama is available
     */
    public function isAvailable() {
        try {
            $ch = curl_init($this->baseUrl . '/api/tags');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $httpCode === 200;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get model info
     */
    public function getModelInfo() {
        try {
            $ch = curl_init($this->baseUrl . '/api/tags');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $response = curl_exec($ch);
            curl_close($ch);

            $result = json_decode($response, true);

            if (isset($result['models'])) {
                foreach ($result['models'] as $model) {
                    if (strpos($model['name'], 'qwen') !== false) {
                        return $model;
                    }
                }
            }

            return null;
        } catch (Exception $e) {
            return null;
        }
    }
}
