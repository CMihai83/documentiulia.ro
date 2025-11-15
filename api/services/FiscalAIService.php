<?php
/**
 * Fiscal AI Service
 * AI-powered consultation with access to Romanian fiscal legislation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/OllamaService.php';
require_once __DIR__ . '/PersonalContextService.php';
require_once __DIR__ . '/BusinessIntelligenceService.php';

class FiscalAIService {
    private $db;
    private $legislationKnowledge;
    private $ollamaService;
    private $contextService;
    private $biService;
    private $useAI = false; // Toggle AI mode - DISABLED due to Ollama timeout issues
    private $usePCT = true; // Personal Context Technology
    private $useBI = true; // Business Intelligence

    public function __construct() {
        $this->db = Database::getInstance();
        $this->initializeLegislationKnowledge();
        $this->ollamaService = new OllamaService();
        $this->contextService = new PersonalContextService();
        $this->biService = new BusinessIntelligenceService();

        // Check if Ollama/DeepSeek is available
        if (!$this->ollamaService->isAvailable()) {
            $this->useAI = false;
        }
    }

    /**
     * Initialize fiscal legislation knowledge base
     */
    private function initializeLegislationKnowledge() {
        $this->legislationKnowledge = [
            'tva' => [
                'threshold' => 300000, // 300,000 lei
                'threshold_eur' => 60000,
                'rates' => [
                    'standard' => 19,
                    'reduced' => 9,
                    'super_reduced' => 5
                ],
                'registration_deadline' => 10, // days
                'payment_deadline' => 25, // of following month
                'split_payment_threshold' => 15000, // lei per invoice
                'cash_accounting_threshold' => 4500000 // lei annual turnover
            ],
            'microenterprise' => [
                'revenue_threshold' => 500000, // EUR
                'employee_requirement' => 1,
                'tax_rate' => 1, // 1% with employees
                'tax_rate_no_employees' => 3, // 3% without employees
                'profit_tax_threshold' => 60000, // EUR (when exceeding, switch to profit tax)
                'allowed_activities' => ['IT', 'consulting', 'manufacturing', 'services']
            ],
            'pfa' => [
                'cas_rate' => 25, // CAS (pension) rate
                'cass_rate' => 10, // CASS (health) rate
                'cas_threshold' => 12, // multiples of minimum wage
                'minimum_wage_2025' => 3700, // lei
                'income_tax_rate' => 10,
                'deductible_expenses' => ['rent', 'utilities', 'materials', 'amortization']
            ],
            'profit_tax' => [
                'standard_rate' => 16,
                'construction_rate' => 16,
                'payment_frequency' => 'quarterly',
                'annual_declaration_deadline' => '2025-03-31'
            ],
            'obligations' => [
                'monthly' => [
                    ['code' => 'D300', 'name' => 'Declarație TVA', 'deadline' => 25, 'applies_to' => 'TVA payers'],
                    ['code' => 'D112', 'name' => 'Obligații de plată salarii', 'deadline' => 25, 'applies_to' => 'Employers'],
                ],
                'quarterly' => [
                    ['code' => 'D101', 'name' => 'Declarație impozit profit', 'deadline' => 25, 'applies_to' => 'Companies'],
                ],
                'annual' => [
                    ['code' => 'D212', 'name' => 'Declarația Unică', 'deadline' => '05-25', 'applies_to' => 'Individuals'],
                    ['code' => 'D101', 'name' => 'Bilanț annual', 'deadline' => '03-31', 'applies_to' => 'Companies'],
                ]
            ],
            'deductible_expenses' => [
                'always_deductible' => [
                    'Chirii spații comerciale',
                    'Utilități (curent, apă, gaz, internet)',
                    'Materii prime și materiale',
                    'Salarii și contribuții sociale',
                    'Amortizare imobilizări',
                    'Transporturi și deplasări'
                ],
                'limited_deductible' => [
                    'Protocol' => '2% din cheltuielile cu salariile',
                    'Sponsorizări' => '0.5% din cifra de afaceri',
                    'Reclame și marketing' => 'Justificare economică necesară'
                ],
                'non_deductible' => [
                    'Amenzi și penalități',
                    'TVA (dacă ești plătitor)',
                    'Impozit pe profit',
                    'Cheltuieli fără justificativ',
                    'Cheltuieli personale'
                ]
            ]
        ];
    }

    /**
     * Main consultation function with User Context & Business Intelligence
     */
    public function consultFiscalQuestion($question, $userId = null, $companyId = null) {
        // Get relevant articles from database
        $relevantArticles = $this->searchLegislation($question);

        // Get user context if available (Personal Context Technology)
        $userContext = null;
        $personalContext = null;
        if ($userId && $this->usePCT) {
            try {
                $personalContext = $this->contextService->getUserContext($userId, $companyId);
                $userContext = $this->getUserFiscalContext($userId, $companyId);
            } catch (Exception $e) {
                error_log("Failed to get user context: " . $e->getMessage());
            }
        }

        // Get MBA frameworks relevant to fiscal optimization
        $mbaFrameworks = [];
        if ($this->useBI) {
            $mbaFrameworks = $this->getMBAFrameworksForFiscal($question);
        }

        // Try AI-powered response first if available
        if ($this->useAI) {
            try {
                // Build context-aware prompt with legislation + user data + MBA models
                $enhancedPrompt = $personalContext
                    ? $this->buildContextAwareFiscalPrompt($question, $personalContext, $userContext, $relevantArticles, $mbaFrameworks)
                    : $this->buildPromptWithLegislation($question, $relevantArticles);

                $aiResponse = $this->ollamaService->generateResponse($enhancedPrompt, $userContext);

                if ($aiResponse['success']) {
                    // Get article references from database
                    $references = $this->formatArticleReferences($relevantArticles);

                    $response = [
                        'answer' => $aiResponse['answer'],
                        'references' => $references,
                        'confidence' => $personalContext ? 0.98 : 0.95, // Higher confidence with context
                        'source' => $personalContext ? 'fiscal-genius-pct-mba' : 'fiscal-genius-legislation',
                        'model' => $aiResponse['model'],
                        'articles_used' => count($relevantArticles),
                        'context_used' => $personalContext ? true : false,
                        'mba_frameworks_applied' => !empty($mbaFrameworks) ? array_column($mbaFrameworks, 'framework_name') : []
                    ];

                    // Add strategic recommendations if using BI
                    if ($personalContext && $this->useBI) {
                        $response['strategic_recommendations'] = $this->getStrategicRecommendations($userContext, $question);
                    }

                    return $response;
                }
            } catch (Exception $e) {
                // Fall back to rule-based system
                error_log("AI consultation failed: " . $e->getMessage());
            }
        }

        // Fallback to rule-based system with database articles
        $topic = $this->analyzeQuestionTopic($question);
        $numbers = $this->extractNumbers($question);
        $answer = $this->generateAnswer($question, $topic, $numbers);
        $references = $this->formatArticleReferences($relevantArticles);

        return [
            'answer' => $answer,
            'references' => $references,
            'confidence' => 0.95,
            'source' => 'rule-based-with-legislation',
            'articles_used' => count($relevantArticles),
            'context_used' => false
        ];
    }

    /**
     * Search legislation database for relevant articles
     */
    private function searchLegislation($question) {
        try {
            $topic = $this->analyzeQuestionTopic($question);

            // Search by category and keywords
            $sql = "SELECT id, code, title, category, summary, full_text, tags
                    FROM fiscal_legislation
                    WHERE
                        category = :topic
                        OR to_tsvector('romanian', title || ' ' || full_text) @@ plainto_tsquery('romanian', :question)
                    ORDER BY
                        CASE WHEN category = :topic THEN 1 ELSE 2 END,
                        ts_rank(to_tsvector('romanian', title || ' ' || full_text), plainto_tsquery('romanian', :question)) DESC
                    LIMIT 10";

            return $this->db->fetchAll($sql, [
                'topic' => $topic,
                'question' => $question
            ]);
        } catch (Exception $e) {
            error_log("Legislation search failed: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Build enhanced prompt with legislation context for AI
     */
    private function buildPromptWithLegislation($question, $articles) {
        $prompt = "Ești un consultant fiscal expert în legislația fiscală din România.\n\n";
        $prompt .= "Bazează-te STRICT pe următoarele articole din Codul Fiscal:\n\n";

        foreach ($articles as $article) {
            $prompt .= "--- " . $article['code'] . " ---\n";
            $prompt .= $article['title'] . "\n";
            $prompt .= substr($article['full_text'], 0, 1000) . "...\n\n";
        }

        $prompt .= "Întrebarea utilizatorului: " . $question . "\n\n";
        $prompt .= "Răspunde clar, profesional și concis în limba română. ";
        $prompt .= "Citează articolele relevante. ";
        $prompt .= "Folosește calcule concrete cu exemple dacă este cazul.";

        return $prompt;
    }

    /**
     * Format article references from database results
     */
    private function formatArticleReferences($articles) {
        $references = [];

        foreach ($articles as $article) {
            $references[] = $article['code'] . ' - ' . $article['title'] . ' (Codul Fiscal 2015)';
        }

        // Add default references if none found
        if (empty($references)) {
            $references[] = 'Codul Fiscal - Legea nr. 227/2015 (actualizată 2025)';
        }

        return array_slice($references, 0, 5); // Max 5 references
    }

    /**
     * Analyze question topic
     */
    private function analyzeQuestionTopic($question) {
        $questionLower = mb_strtolower($question);

        $topicKeywords = [
            'tva' => ['tva', 'taxă valoare adăugată', 'înregistrare tva', 'plătitor tva', 'cod tva'],
            'microenterprise' => ['microîntreprindere', 'micro', 'impozit 1%', 'impozit 3%'],
            'pfa' => ['pfa', 'persoană fizică autorizată', 'autorizat', 'cas', 'cass', 'contribuții sociale'],
            'profit_tax' => ['impozit profit', 'profit', 'd101', 'bilanț'],
            'deductible' => ['deductibil', 'cheltuieli', 'scade', 'scădere'],
            'employer' => ['angajat', 'angajator', 'salarii', 'salariat', 'revisal', 'd112'],
            'obligations' => ['obligații', 'termen', 'declarație', 'depunere']
        ];

        foreach ($topicKeywords as $topic => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($questionLower, $keyword) !== false) {
                    return $topic;
                }
            }
        }

        return 'general';
    }

    /**
     * Extract numbers from question
     */
    private function extractNumbers($question) {
        preg_match_all('/\d+[.,]?\d*/', $question, $matches);
        return array_map(function($num) {
            return floatval(str_replace([',', '.'], ['', '.'], $num));
        }, $matches[0]);
    }

    /**
     * Generate AI answer based on topic
     */
    private function generateAnswer($question, $topic, $numbers) {
        switch ($topic) {
            case 'tva':
                return $this->generateTVAAnswer($question, $numbers);

            case 'microenterprise':
                return $this->generateMicroenterpriseAnswer($question, $numbers);

            case 'pfa':
                return $this->generatePFAAnswer($question, $numbers);

            case 'deductible':
                return $this->generateDeductibleAnswer($question);

            case 'employer':
                return $this->generateEmployerAnswer($question);

            case 'obligations':
                return $this->generateObligationsAnswer($question);

            default:
                return $this->generateGeneralAnswer($question);
        }
    }

    /**
     * Generate TVA-specific answer
     */
    private function generateTVAAnswer($question, $numbers) {
        $threshold = $this->legislationKnowledge['tva']['threshold'];
        $thresholdEur = $this->legislationKnowledge['tva']['threshold_eur'];

        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📊 Înregistrare TVA</strong></p>";

        // Check if user provided a revenue number
        if (!empty($numbers)) {
            $revenue = $numbers[0];

            if ($revenue >= $threshold) {
                $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'>";
                $answer .= "Cu o cifră de afaceri de <strong>" . number_format($revenue, 0, ',', '.') . " lei</strong>, ";
                $answer .= "<strong style='color: #ef4444;'>ești obligat să te înregistrezi ca plătitor de TVA</strong>. ";
                $answer .= "Pragul legal este de <strong>" . number_format($threshold, 0, ',', '.') . " lei</strong> (aproximativ " . number_format($thresholdEur, 0, ',', '.') . " EUR).";
                $answer .= "</p>";

                $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📋 Pași de urmat:</strong></p>";
                $answer .= "<ol style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
                $answer .= "<li>Depui formularul <strong>010</strong> la ANAF în termen de <strong>10 zile</strong> de la depășirea plafonului</li>";
                $answer .= "<li>Aștepți certificatul de înregistrare (codul de TVA - cod RO)</li>";
                $answer .= "<li>Începi să facturezi cu TVA de <strong>19%</strong> din luna următoare înregistrării</li>";
                $answer .= "<li>Depui lunar declarația <strong>D300</strong> până pe <strong>25</strong> a lunii următoare</li>";
                $answer .= "</ol>";

                $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>💰 Impact financiar:</strong></p>";
                $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
                $answer .= "<li>Prețurile tale vor include TVA (cresc cu 19%)</li>";
                $answer .= "<li>Poți deduce TVA-ul de la furnizorii tăi</li>";
                $answer .= "<li>Plătești diferența între TVA încasat și TVA plătit</li>";
                $answer .= "</ul>";
            } else {
                $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'>";
                $answer .= "Cu o cifră de afaceri de <strong>" . number_format($revenue, 0, ',', '.') . " lei</strong>, ";
                $answer .= "<strong style='color: #10b981;'>nu ești obligat să te înregistrezi ca plătitor de TVA</strong>. ";
                $answer .= "Pragul de înregistrare obligatorie este <strong>" . number_format($threshold, 0, ',', '.') . " lei</strong>.";
                $answer .= "</p>";

                $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>🤔 Poți opta pentru înregistrare voluntară dacă:</strong></p>";
                $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
                $answer .= "<li>Lucrezi cu companii mari care preferă furnizori cu TVA</li>";
                $answer .= "<li>Ai cheltuieli mari cu TVA pe care vrei să le recuperezi</li>";
                $answer .= "<li>Vrei să pari o companie mai mare</li>";
                $answer .= "</ul>";
            }
        } else {
            // General TVA info
            $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'>";
            $answer .= "Înregistrarea ca plătitor de TVA este <strong>obligatorie</strong> când cifra de afaceri din ultimele 12 luni depășește <strong>" . number_format($threshold, 0, ',', '.') . " lei</strong> (aproximativ " . number_format($thresholdEur, 0, ',', '.') . " EUR).";
            $answer .= "</p>";

            $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📋 Procedură înregistrare:</strong></p>";
            $answer .= "<ol style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
            $answer .= "<li>Depui formularul <strong>010</strong> la ANAF în termen de <strong>10 zile</strong></li>";
            $answer .= "<li>Primești certificatul de înregistrare (cod de TVA)</li>";
            $answer .= "<li>Începi să aplici TVA din luna următoare</li>";
            $answer .= "</ol>";

            $answer .= "<p style='margin: 0 0 0 0; color: #64748b; font-size: 14px; font-style: italic;'>";
            $answer .= "💡 Dacă ai o cifră de afaceri specifică, spune-mi și îți pot oferi o analiză detaliată.";
            $answer .= "</p>";
        }

        return $answer;
    }

    /**
     * Generate Microenterprise-specific answer
     */
    private function generateMicroenterpriseAnswer($question, $numbers) {
        $threshold = $this->legislationKnowledge['microenterprise']['revenue_threshold'];
        $taxRate = $this->legislationKnowledge['microenterprise']['tax_rate'];
        $taxRateNoEmp = $this->legislationKnowledge['microenterprise']['tax_rate_no_employees'];

        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>🏢 Regim Microîntreprindere 2025</strong></p>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>Condiții eligibilitate:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li>Cifra de afaceri <strong>sub " . number_format($threshold, 0, ',', '.') . " EUR</strong></li>";
        $answer .= "<li>Capital social deținut de persoane fizice sau juridice (max 25% stat)</li>";
        $answer .= "<li><strong>Minimum 1 angajat</strong> cu contract de muncă cu normă întreagă</li>";
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>💰 Cote de impozitare:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li><strong>" . $taxRate . "%</strong> din cifra de afaceri (cu minimum 1 angajat)</li>";
        $answer .= "<li><strong>" . $taxRateNoEmp . "%</strong> din cifra de afaceri (fără angajați)</li>";
        $answer .= "</ul>";

        if (!empty($numbers)) {
            $revenue = $numbers[0];
            $taxWithEmployee = $revenue * ($taxRate / 100);
            $taxWithoutEmployee = $revenue * ($taxRateNoEmp / 100);

            $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📊 Calcul pentru cifra ta (" . number_format($revenue, 0, ',', '.') . " lei):</strong></p>";
            $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
            $answer .= "<li>Cu angajați: <strong style='color: #10b981;'>" . number_format($taxWithEmployee, 2, ',', '.') . " lei</strong> impozit anual</li>";
            $answer .= "<li>Fără angajați: <strong style='color: #ef4444;'>" . number_format($taxWithoutEmployee, 2, ',', '.') . " lei</strong> impozit anual</li>";
            $answer .= "<li>Diferență: <strong>" . number_format($taxWithoutEmployee - $taxWithEmployee, 2, ',', '.') . " lei</strong> (ești taxat mai mult fără angajați)</li>";
            $answer .= "</ul>";
        }

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>⚠️ Atenție:</strong></p>";
        $answer .= "<ul style='margin: 0 0 0 20px; color: #ef4444; line-height: 1.8;'>";
        $answer .= "<li>Dacă depășești " . number_format($threshold, 0, ',', '.') . " EUR, treci <strong>automat</strong> la impozit pe profit de 16%</li>";
        $answer .= "<li>Obligația de a avea angajat este permanentă pentru cota de 1%</li>";
        $answer .= "</ul>";

        return $answer;
    }

    /**
     * Generate PFA-specific answer
     */
    private function generatePFAAnswer($question, $numbers) {
        $casRate = $this->legislationKnowledge['pfa']['cas_rate'];
        $cassRate = $this->legislationKnowledge['pfa']['cass_rate'];
        $minWage = $this->legislationKnowledge['pfa']['minimum_wage_2025'];

        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>👤 Contribuții Sociale PFA 2025</strong></p>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>Cotele de contribuții:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li><strong>CAS (pensie):</strong> " . $casRate . "% din venitul net anual</li>";
        $answer .= "<li><strong>CASS (sănătate):</strong> " . $cassRate . "% din venitul net anual</li>";
        $answer .= "<li><strong>Impozit venit:</strong> 10% din venitul net anual</li>";
        $answer .= "</ul>";

        if (!empty($numbers) && $numbers[0] > 10000) {
            $revenue = $numbers[0];

            // Assume 40% deductible expenses (typical)
            $expenses = $revenue * 0.4;
            $netIncome = $revenue - $expenses;

            $cas = $netIncome * ($casRate / 100);
            $cass = $netIncome * ($cassRate / 100);
            $incomeTax = $netIncome * 0.10;
            $total = $cas + $cass + $incomeTax;

            $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📊 Exemplu calcul pentru venitul tău:</strong></p>";
            $answer .= "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;'>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>Venit brut: <strong>" . number_format($revenue, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>Cheltuieli deductibile (estimat 40%): <strong>" . number_format($expenses, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #0f172a;'>Venit net: <strong>" . number_format($netIncome, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<hr style='border: none; border-top: 1px solid #cbd5e1; margin: 10px 0;'>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>CAS (" . $casRate . "%): <strong>" . number_format($cas, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>CASS (" . $cassRate . "%): <strong>" . number_format($cass, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>Impozit venit (10%): <strong>" . number_format($incomeTax, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<hr style='border: none; border-top: 1px solid #cbd5e1; margin: 10px 0;'>";
            $answer .= "<p style='margin: 0; color: #0f172a; font-size: 16px;'>Total taxe: <strong style='color: #ef4444;'>" . number_format($total, 0, ',', '.') . " lei</strong></p>";
            $answer .= "<p style='margin: 8px 0 0 0; color: #10b981; font-size: 16px;'>Rămâi cu: <strong>" . number_format($netIncome - $total, 0, ',', '.') . " lei</strong></p>";
            $answer .= "</div>";

            $answer .= "<p style='margin: 0 0 0 0; color: #64748b; font-size: 13px; font-style: italic;'>";
            $answer .= "💡 Calculul presupune 40% cheltuieli deductibile. Procentul real depinde de situația ta specifică.";
            $answer .= "</p>";
        } else {
            $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>Formula de calcul:</strong></p>";
            $answer .= "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;'>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>Venit net = Venit brut - Cheltuieli deductibile</p>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>CAS = Venit net × 25%</p>";
            $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>CASS = Venit net × 10%</p>";
            $answer .= "<p style='margin: 0; color: #475569;'>Impozit = Venit net × 10%</p>";
            $answer .= "</div>";

            $answer .= "<p style='margin: 0 0 0 0; color: #64748b; font-size: 14px; font-style: italic;'>";
            $answer .= "💡 Spune-mi venitul tău anual și îți calculez exact contribuțiile.";
            $answer .= "</p>";
        }

        return $answer;
    }

    /**
     * Generate deductible expenses answer
     */
    private function generateDeductibleAnswer($question) {
        $always = $this->legislationKnowledge['deductible_expenses']['always_deductible'];
        $limited = $this->legislationKnowledge['deductible_expenses']['limited_deductible'];
        $nonDeductible = $this->legislationKnowledge['deductible_expenses']['non_deductible'];

        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>💼 Cheltuieli Deductibile Fiscal</strong></p>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>✅ Întotdeauna deductibile:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        foreach ($always as $expense) {
            $answer .= "<li>" . $expense . "</li>";
        }
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>⚠️ Deductibile cu limită:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        foreach ($limited as $expense => $limit) {
            $answer .= "<li><strong>" . $expense . ":</strong> " . $limit . "</li>";
        }
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>❌ Nedeductibile:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #ef4444; line-height: 1.8;'>";
        foreach ($nonDeductible as $expense) {
            $answer .= "<li>" . $expense . "</li>";
        }
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 0 0; color: #0f172a; line-height: 1.8;'><strong>📋 Condiții pentru deductibilitate:</strong></p>";
        $answer .= "<ol style='margin: 0 0 0 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li>Efectuate în scopul desfășurării activității</li>";
        $answer .= "<li>Justificate cu documente (facturi, bonuri fiscale)</li>";
        $answer .= "<li>Nu sunt în lista cheltuielilor nedeductibile din Codul Fiscal</li>";
        $answer .= "</ol>";

        return $answer;
    }

    /**
     * Generate employer obligations answer
     */
    private function generateEmployerAnswer($question) {
        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>👥 Obligații Fiscale pentru Angajatori</strong></p>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📅 Obligații lunare (până pe 25):</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li><strong>Declarație D112</strong> - obligații de plată pentru salarii</li>";
        $answer .= "<li><strong>Plata CAS</strong> (25% din salariul brut) - contribuție pensie</li>";
        $answer .= "<li><strong>Plata CASS</strong> (10% din salariul brut) - contribuție sănătate</li>";
        $answer .= "<li><strong>Plata impozit</strong> (10% din salariul net) - reținut din salariu</li>";
        $answer .= "<li><strong>CAM</strong> (2.25% din salariul brut) - asigurări sociale</li>";
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📝 La angajare (înainte de începerea activității):</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li><strong>Înregistrare în REVISAL</strong> - obligatoriu înainte de start</li>";
        $answer .= "<li><strong>Contract individual de muncă</strong> - 2 exemplare (1 pentru ITM)</li>";
        $answer .= "<li><strong>Fișa postului</strong></li>";
        $answer .= "<li><strong>ROPD</strong> - Regulament organizare și protecție date</li>";
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>💰 Exemplu calcul salariat cu 5.000 lei brut:</strong></p>";
        $answer .= "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;'>";
        $answer .= "<p style='margin: 0 0 8px 0; color: #0f172a;'>Salariu brut: <strong>5.000 lei</strong></p>";
        $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>CAS angajat (25%): -1.250 lei</p>";
        $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>CASS angajat (10%): -500 lei</p>";
        $answer .= "<p style='margin: 0 0 8px 0; color: #475569;'>Impozit (10% din 3.250): -325 lei</p>";
        $answer .= "<hr style='border: none; border-top: 1px solid #cbd5e1; margin: 10px 0;'>";
        $answer .= "<p style='margin: 0 0 8px 0; color: #10b981; font-size: 16px;'>Salariu net: <strong>2.925 lei</strong></p>";
        $answer .= "<p style='margin: 0 0 8px 0; color: #ef4444;'>CAM angajator (2.25%): <strong>+113 lei</strong></p>";
        $answer .= "<hr style='border: none; border-top: 1px solid #cbd5e1; margin: 10px 0;'>";
        $answer .= "<p style='margin: 0; color: #0f172a; font-size: 16px;'>Cost total angajator: <strong>5.113 lei</strong></p>";
        $answer .= "</div>";

        $answer .= "<p style='margin: 0 0 0 0; color: #ef4444; line-height: 1.8;'>";
        $answer .= "⚠️ <strong>Atenție:</strong> Nerespectarea termenelor poate duce la penalități de până la 5.000 lei!";
        $answer .= "</p>";

        return $answer;
    }

    /**
     * Generate obligations answer
     */
    private function generateObligationsAnswer($question) {
        $monthly = $this->legislationKnowledge['obligations']['monthly'];
        $quarterly = $this->legislationKnowledge['obligations']['quarterly'];
        $annual = $this->legislationKnowledge['obligations']['annual'];

        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>📅 Obligații Fiscale pe Tipuri</strong></p>";

        $answer .= "<p style='margin: 0 0 10px 0; color: #0f172a; line-height: 1.8;'><strong>🗓️ Lunare (până pe 25):</strong></p>";
        $answer .= "<ul style='margin: 0 0 20px 20px; color: #475569; line-height: 1.8;'>";
        foreach ($monthly as $obl) {
            $answer .= "<li><strong>" . $obl['code'] . "</strong> - " . $obl['name'] . " (" . $obl['applies_to'] . ")</li>";
        }
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 10px 0; color: #0f172a; line-height: 1.8;'><strong>📆 Trimestriale (până pe 25):</strong></p>";
        $answer .= "<ul style='margin: 0 0 20px 20px; color: #475569; line-height: 1.8;'>";
        foreach ($quarterly as $obl) {
            $answer .= "<li><strong>" . $obl['code'] . "</strong> - " . $obl['name'] . " (" . $obl['applies_to'] . ")</li>";
        }
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 10px 0; color: #0f172a; line-height: 1.8;'><strong>📅 Anuale:</strong></p>";
        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        foreach ($annual as $obl) {
            $answer .= "<li><strong>" . $obl['code'] . "</strong> - " . $obl['name'] . " (deadline: " . $obl['deadline'] . ") - " . $obl['applies_to'] . "</li>";
        }
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 0 0; color: #64748b; font-size: 14px; font-style: italic;'>";
        $answer .= "💡 Folosește funcția 'Adaugă în Calendar' pentru a primi reminder-uri automate!";
        $answer .= "</p>";

        return $answer;
    }

    /**
     * Generate general answer
     */
    private function generateGeneralAnswer($question) {
        $answer = "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'><strong>🤖 Consultanță Fiscală Generală</strong></p>";

        $answer .= "<p style='margin: 0 0 15px 0; color: #0f172a; line-height: 1.8;'>";
        $answer .= "Am înțeles întrebarea ta și pot oferi consultanță pe următoarele subiecte:";
        $answer .= "</p>";

        $answer .= "<ul style='margin: 0 0 15px 20px; color: #475569; line-height: 1.8;'>";
        $answer .= "<li><strong>TVA</strong> - înregistrare, declarații, split payment</li>";
        $answer .= "<li><strong>Microîntreprinderi</strong> - condiții, cote, tranziții</li>";
        $answer .= "<li><strong>PFA</strong> - contribuții sociale, impozitare</li>";
        $answer .= "<li><strong>Impozit profit</strong> - calcul, declarații</li>";
        $answer .= "<li><strong>Cheltuieli deductibile</strong> - ce poți scădea din profit</li>";
        $answer .= "<li><strong>Obligații angajatori</strong> - salarii, contribuții</li>";
        $answer .= "<li><strong>Termene fiscale</strong> - declarații, plăți</li>";
        $answer .= "</ul>";

        $answer .= "<p style='margin: 0 0 0 0; color: #0f172a; line-height: 1.8;'>";
        $answer .= "Pentru o consultanță mai specifică, te rog să formulezi întrebarea cu mai multe detalii (de exemplu: cifra de afaceri, tip de business, situația ta specifică).";
        $answer .= "</p>";

        return $answer;
    }

    /**
     * Get relevant legislation references
     */
    private function getLegislationReferences($topic) {
        $references = [
            'tva' => [
                'Codul Fiscal - Titlul VI: Taxa pe valoarea adăugată',
                'Legea nr. 227/2015 privind Codul fiscal (actualizată 2024)',
                'Norme metodologice ANAF - OMFP nr. 3699/2022'
            ],
            'microenterprise' => [
                'Codul Fiscal - Art. 47-52: Impozitul pe veniturile microîntreprinderilor',
                'Legea nr. 227/2015 (actualizată OUG 115/2023)',
                'OMFP nr. 3456/2023 - Procedură aplicare regim microîntreprinderi'
            ],
            'pfa' => [
                'Codul Fiscal - Titlul III: Impozitul pe venit',
                'Legea nr. 95/2006 privind reforma în domeniul sănătății (CASS)',
                'Legea nr. 263/2010 privind sistemul unitar de pensii (CAS)'
            ],
            'deductible' => [
                'Codul Fiscal - Art. 25: Cheltuieli deductibile',
                'Codul Fiscal - Art. 25^1: Cheltuieli nedeductibile',
                'Norme metodologice - Ordinul 3055/2009 (actualizat)'
            ],
            'employer' => [
                'Codul Fiscal - Titlul III: Venituri din salarii',
                'Codul muncii - Legea nr. 53/2003 (actualizată)',
                'Legea nr. 76/2002 privind sistemul asigurărilor pentru șomaj'
            ]
        ];

        return $references[$topic] ?? [
            'Codul Fiscal - Legea nr. 227/2015 (actualizată 2025)',
            'Norme metodologice ANAF',
            'Legislație fiscală în vigoare'
        ];
    }

    /**
     * Get user's fiscal context (revenue, expenses, employees, etc.)
     */
    private function getUserFiscalContext($userId, $companyId = null) {
        try {
            // Get user's company financial data
            $sql = "SELECT
                        c.company_name,
                        c.company_type,
                        c.tva_registered,
                        c.fiscal_code,
                        COALESCE(SUM(i.total_amount), 0) as current_year_revenue,
                        COALESCE((SELECT SUM(total_amount) FROM expenses WHERE company_id = c.id
                                  AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) as current_year_expenses,
                        COALESCE((SELECT COUNT(*) FROM employees WHERE company_id = c.id AND status = 'active'), 0) as employee_count,
                        bg.monthly_revenue_target,
                        bg.annual_profit_target,
                        bg.growth_rate_target
                    FROM companies c
                    LEFT JOIN invoices i ON c.id = i.company_id
                        AND EXTRACT(YEAR FROM i.invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                    LEFT JOIN business_goals bg ON c.id = bg.company_id AND bg.year = EXTRACT(YEAR FROM CURRENT_DATE)
                    WHERE c.user_id = :user_id";

            $params = ['user_id' => $userId];

            if ($companyId) {
                $sql .= " AND c.id = :company_id";
                $params['company_id'] = $companyId;
            }

            $sql .= " GROUP BY c.id, c.company_name, c.company_type, c.tva_registered,
                              c.fiscal_code, bg.monthly_revenue_target, bg.annual_profit_target, bg.growth_rate_target
                      LIMIT 1";

            $fiscalData = $this->db->fetchOne($sql, $params);

            if (!$fiscalData) {
                return null;
            }

            // Calculate key metrics
            $netProfit = $fiscalData['current_year_revenue'] - $fiscalData['current_year_expenses'];
            $profitMargin = $fiscalData['current_year_revenue'] > 0
                ? ($netProfit / $fiscalData['current_year_revenue']) * 100
                : 0;

            return [
                'company_name' => $fiscalData['company_name'],
                'company_type' => $fiscalData['company_type'], // PFA, SRL, Micro, etc.
                'tva_registered' => $fiscalData['tva_registered'],
                'current_year_revenue' => (float)$fiscalData['current_year_revenue'],
                'current_year_expenses' => (float)$fiscalData['current_year_expenses'],
                'net_profit' => $netProfit,
                'profit_margin' => round($profitMargin, 2),
                'employee_count' => (int)$fiscalData['employee_count'],
                'monthly_revenue_target' => (float)$fiscalData['monthly_revenue_target'],
                'annual_profit_target' => (float)$fiscalData['annual_profit_target'],
                'growth_rate_target' => (float)$fiscalData['growth_rate_target']
            ];
        } catch (Exception $e) {
            error_log("Failed to get fiscal context: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get MBA frameworks relevant to fiscal optimization
     */
    private function getMBAFrameworksForFiscal($question) {
        try {
            $sql = "SELECT framework_name, framework_key, description, when_to_use, how_to_apply
                    FROM business_frameworks
                    WHERE category IN ('finance', 'strategy', 'operations')
                    AND (
                        to_tsvector('english', framework_name || ' ' || description) @@ plainto_tsquery('english', :question)
                        OR framework_key IN ('4_revenue_methods', '5_parts_analysis', 'evaluate_market')
                    )
                    ORDER BY ts_rank(to_tsvector('english', framework_name || ' ' || description),
                                     plainto_tsquery('english', :question)) DESC
                    LIMIT 3";

            return $this->db->fetchAll($sql, ['question' => $question]);
        } catch (Exception $e) {
            error_log("Failed to get MBA frameworks: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Build context-aware fiscal prompt with user data + legislation + MBA models
     */
    private function buildContextAwareFiscalPrompt($question, $personalContext, $userContext, $articles, $mbaFrameworks) {
        $prompt = "Ești EXPERT CONSULTANT FISCAL ȘI STRATEGIC BUSINESS ADVISOR pentru România.\n\n";

        // Add user business context
        if ($userContext) {
            $prompt .= "=== CONTEXT BUSINESS CLIENT ===\n";
            $prompt .= "Companie: " . $userContext['company_name'] . "\n";
            $prompt .= "Tip: " . $userContext['company_type'] . "\n";
            $prompt .= "Platitor TVA: " . ($userContext['tva_registered'] ? 'DA' : 'NU') . "\n";
            $prompt .= "Cifra de afaceri 2025: " . number_format($userContext['current_year_revenue'], 2) . " lei\n";
            $prompt .= "Cheltuieli 2025: " . number_format($userContext['current_year_expenses'], 2) . " lei\n";
            $prompt .= "Profit net: " . number_format($userContext['net_profit'], 2) . " lei\n";
            $prompt .= "Marja profit: " . $userContext['profit_margin'] . "%\n";
            $prompt .= "Angajați: " . $userContext['employee_count'] . "\n";
            if ($userContext['annual_profit_target']) {
                $prompt .= "Target profit anual: " . number_format($userContext['annual_profit_target'], 2) . " lei\n";
            }
            $prompt .= "\n";
        }

        // Add MBA frameworks
        if (!empty($mbaFrameworks)) {
            $prompt .= "=== MBA FRAMEWORKS PENTRU OPTIMIZARE FISCALĂ ===\n";
            foreach ($mbaFrameworks as $framework) {
                $prompt .= "--- " . $framework['framework_name'] . " ---\n";
                $prompt .= $framework['description'] . "\n";
                if (!empty($framework['how_to_apply'])) {
                    $prompt .= "Cum se aplică: " . $framework['how_to_apply'] . "\n";
                }
                $prompt .= "\n";
            }
        }

        // Add legislation articles
        $prompt .= "=== LEGISLAȚIE FISCALĂ ROMÂNĂ 2025 ===\n";
        foreach ($articles as $article) {
            $prompt .= "--- " . $article['code'] . " ---\n";
            $prompt .= $article['title'] . "\n";
            $prompt .= substr($article['full_text'], 0, 800) . "...\n\n";
        }

        $prompt .= "ÎNTREBAREA CLIENTULUI: " . $question . "\n\n";

        $prompt .= "INSTRUCȚIUNI RĂSPUNS:\n";
        $prompt .= "1. Analizează situația SPECIFICĂ a clientului pe baza datelor sale reale\n";
        $prompt .= "2. Citează articolele exacte din legislație (Art. X Cod Fiscal)\n";
        $prompt .= "3. Calculează CONCRET cu cifrele clientului (nu generic!)\n";
        $prompt .= "4. Aplică MBA frameworks pentru recomandări strategice\n";
        $prompt .= "5. Oferă sfaturi ACȚIONABILE pentru optimizare fiscală\n";
        $prompt .= "6. Identifică oportunități de economisire bazate pe situația reală\n";
        $prompt .= "7. Formatează cu HTML profesional (<p>, <strong>, <ul>, <li>)\n";
        $prompt .= "8. Limbă română, ton profesional dar accesibil\n\n";

        $prompt .= "Răspunde PERSONALIZAT pentru acest client specific!";

        return $prompt;
    }

    /**
     * Get strategic recommendations based on user context
     */
    private function getStrategicRecommendations($userContext, $question) {
        if (!$userContext) {
            return [];
        }

        $recommendations = [];

        // TVA registration recommendation
        if (!$userContext['tva_registered'] && $userContext['current_year_revenue'] > 250000) {
            $recommendations[] = [
                'type' => 'tva_planning',
                'priority' => 'high',
                'title' => 'Pregătire pentru înregistrare TVA',
                'description' => 'Cifra ta de afaceri se apropie de pragul TVA (300.000 lei). Recomand pregătirea sistemelor pentru înregistrare TVA.',
                'estimated_impact' => 'Evitarea penalităților și pregătire optimă pentru TVA'
            ];
        }

        // Profit margin optimization
        if ($userContext['profit_margin'] < 15) {
            $recommendations[] = [
                'type' => 'profit_optimization',
                'priority' => 'high',
                'title' => 'Optimizare marjă de profit',
                'description' => 'Marja ta de profit (' . $userContext['profit_margin'] . '%) este sub media sectorului (15-25%). Recomand analiza cheltuielilor și strategii de pricing.',
                'estimated_impact' => 'Creștere potențială cu ' . round((15 - $userContext['profit_margin']) * $userContext['current_year_revenue'] / 100, 2) . ' lei profit anual'
            ];
        }

        // Employee hiring for tax optimization (Microenterprise)
        if ($userContext['company_type'] === 'microenterprise' && $userContext['employee_count'] === 0) {
            $savings = $userContext['current_year_revenue'] * 0.02; // 2% savings from 3% to 1%
            $recommendations[] = [
                'type' => 'tax_optimization',
                'priority' => 'medium',
                'title' => 'Angajare pentru reducere impozit',
                'description' => 'Cu minimum 1 angajat, scazi impozitul de la 3% la 1% din cifra de afaceri.',
                'estimated_impact' => 'Economie: ' . number_format($savings, 2) . ' lei/an (chiar după salariul angajatului)'
            ];
        }

        return $recommendations;
    }
}
