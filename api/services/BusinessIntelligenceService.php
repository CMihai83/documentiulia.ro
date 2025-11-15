<?php
/**
 * Business Intelligence Service
 * Strategic Business Consultation powered by Universal Business Principles
 *
 * Provides AI-powered business consultation, insights, and recommendations
 * tailored to user's industry, business stage, and specific context.
 *
 * Integrates deeply with Personal Context Technology for personalized advice.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/OllamaService.php';
require_once __DIR__ . '/PersonalContextService.php';
require_once __DIR__ . '/MBAKnowledgeBaseService.php';

class BusinessIntelligenceService {
    private $db;
    private $ollamaService;
    private $contextService;
    private $mbaKnowledge;
    private $useAI = true;
    private $usePCT = true; // Personal Context Technology

    public function __construct() {
        $this->db = Database::getInstance();
        $this->ollamaService = new OllamaService();
        $this->contextService = new PersonalContextService();
        $this->mbaKnowledge = new MBAKnowledgeBaseService();

        // Check if AI is available
        if (!$this->ollamaService->isAvailable()) {
            $this->useAI = false;
        }
    }

    /**
     * Main business consultation function
     * Provides context-aware business advice with PCT integration
     */
    public function consultBusiness($question, $userId = null, $companyId = null) {
        // Get user business context (legacy method for backwards compatibility)
        $userContext = $userId ? $this->getUserBusinessContext($userId, $companyId) : null;

        // Get Personal Context if available (NEW - PCT Integration)
        $personalContext = null;
        if ($userId && $this->usePCT) {
            try {
                $personalContext = $this->contextService->getUserContext($userId, $companyId);
            } catch (Exception $e) {
                error_log("Failed to get personal context: " . $e->getMessage());
            }
        }

        // Find relevant business concepts
        $relevantConcepts = $this->searchBusinessConcepts($question, $userContext);

        // Find relevant frameworks
        $relevantFrameworks = $this->searchBusinessFrameworks($question);

        // Try AI-powered response with PCT
        if ($this->useAI) {
            try {
                // Build prompt with Personal Context if available
                $enhancedPrompt = $personalContext
                    ? $this->contextService->buildContextAwarePrompt($question, $userId, $companyId)
                    : $this->buildBusinessPrompt($question, $userContext, $relevantConcepts, $relevantFrameworks);

                $aiResponse = $this->ollamaService->generateResponse($enhancedPrompt);

                if ($aiResponse['success']) {
                    $response = [
                        'success' => true,
                        'answer' => $aiResponse['answer'],
                        'concepts' => $this->formatConceptReferences($relevantConcepts),
                        'frameworks' => $this->formatFrameworkReferences($relevantFrameworks),
                        'confidence' => $personalContext ? 0.95 : 0.90, // Higher confidence with PCT
                        'source' => $personalContext ? 'ai-strategic-advisor-pct' : 'ai-strategic-advisor',
                        'model' => $aiResponse['model'],
                        'context_used' => $personalContext ? true : false
                    ];

                    // Suggest context updates if using PCT
                    if ($personalContext) {
                        $contextData = $personalContext['context_data'];
                        $contextUpdates = $this->contextService->suggestContextUpdates($question, $response['answer'], $contextData);
                        if (!empty($contextUpdates)) {
                            $response['suggested_context_updates'] = $contextUpdates;
                        }
                    }

                    // Log consultation (with context awareness)
                    if ($userId) {
                        $this->logConsultation($userId, $companyId, $question, $response, $relevantConcepts, $relevantFrameworks, $personalContext);
                    }

                    return $response;
                }
            } catch (Exception $e) {
                error_log("Business AI failed: " . $e->getMessage());
            }
        }

        // Fallback to rule-based system
        $answer = $this->generateRuleBasedAnswer($question, $userContext, $relevantConcepts, $relevantFrameworks);

        $response = [
            'success' => true,
            'answer' => $answer,
            'concepts' => $this->formatConceptReferences($relevantConcepts),
            'frameworks' => $this->formatFrameworkReferences($relevantFrameworks),
            'confidence' => 0.85,
            'source' => 'rule-based-strategic-advisor',
            'context_used' => $personalContext ? true : false
        ];

        // Log consultation
        if ($userId) {
            $this->logConsultation($userId, $companyId, $question, $response, $relevantConcepts, $relevantFrameworks, $personalContext);
        }

        return $response;
    }

    /**
     * Get user's business context from profile and metrics
     */
    private function getUserBusinessContext($userId, $companyId = null) {
        // Get business profile
        $sql = "SELECT * FROM user_business_profiles
                WHERE user_id = :user_id";
        $params = ['user_id' => $userId];

        if ($companyId) {
            $sql .= " AND company_id = :company_id";
            $params['company_id'] = $companyId;
        }

        $sql .= " ORDER BY updated_at DESC LIMIT 1";

        $profile = $this->db->fetchOne($sql, $params);

        if (!$profile) {
            return null;
        }

        // Get recent metrics
        $metricsSql = "SELECT * FROM business_metrics
                       WHERE user_id = :user_id
                       ORDER BY metric_date DESC LIMIT 3";

        $metrics = $this->db->fetchAll($metricsSql, ['user_id' => $userId]);

        return [
            'profile' => $profile,
            'recent_metrics' => $metrics
        ];
    }

    /**
     * Search for relevant business concepts
     */
    private function searchBusinessConcepts($question, $userContext = null) {
        // Analyze question to determine category
        $category = $this->categorizeBusinessQuestion($question);

        $sql = "SELECT id, concept_name, concept_key, category, description,
                       practical_application, examples
                FROM business_concepts
                WHERE
                    category = :category
                    OR to_tsvector('english', concept_name || ' ' || description)
                       @@ plainto_tsquery('english', :question)
                ORDER BY
                    CASE WHEN category = :category THEN 1 ELSE 2 END,
                    ts_rank(to_tsvector('english', concept_name || ' ' || description),
                            plainto_tsquery('english', :question)) DESC
                LIMIT 5";

        return $this->db->fetchAll($sql, [
            'category' => $category,
            'question' => $question
        ]);
    }

    /**
     * Search for relevant business frameworks
     */
    private function searchBusinessFrameworks($question) {
        $sql = "SELECT id, framework_name, framework_key, category, description,
                       steps, when_to_use, templates
                FROM business_frameworks
                WHERE to_tsvector('english', framework_name || ' ' || description || ' ' || when_to_use)
                      @@ plainto_tsquery('english', :question)
                ORDER BY ts_rank(to_tsvector('english', framework_name || ' ' || description),
                                 plainto_tsquery('english', :question)) DESC
                LIMIT 3";

        return $this->db->fetchAll($sql, ['question' => $question]);
    }

    /**
     * Categorize business question
     */
    private function categorizeBusinessQuestion($question) {
        $questionLower = strtolower($question);

        $categories = [
            'value_creation' => ['product', 'service', 'value', 'create', 'build', 'develop', 'idea'],
            'marketing' => ['marketing', 'advertise', 'brand', 'customer', 'audience', 'reach', 'visibility'],
            'sales' => ['sales', 'sell', 'pricing', 'revenue', 'convert', 'close', 'deal'],
            'value_delivery' => ['deliver', 'fulfillment', 'service', 'support', 'quality', 'customer satisfaction'],
            'finance' => ['profit', 'cash flow', 'finance', 'accounting', 'money', 'costs', 'expense', 'budget'],
            'psychology' => ['behavior', 'motivation', 'decision', 'psychology', 'persuasion'],
            'systems' => ['process', 'efficiency', 'system', 'automation', 'optimize', 'workflow']
        ];

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($questionLower, $keyword) !== false) {
                    return $category;
                }
            }
        }

        return 'value_creation'; // Default category
    }

    /**
     * Build enhanced prompt with business context
     * Now powered by MBA Knowledge Base - foundational business wisdom from 99 essential books
     */
    private function buildBusinessPrompt($question, $userContext, $concepts, $frameworks) {
        // Get MBA system prompt (foundational knowledge)
        $mbaSystemPrompt = $this->mbaKnowledge->getMBASystemPrompt();

        // Get relevant MBA knowledge for this specific question
        $relevantMBA = $this->mbaKnowledge->getRelevantMBAKnowledge($question);

        $prompt = $mbaSystemPrompt . "\n\n";
        $prompt .= "=== CONTEXT FOR CURRENT QUESTION ===\n\n";

        // Add relevant MBA knowledge
        if (!empty($relevantMBA['books'])) {
            $prompt .= "RELEVANT MBA KNOWLEDGE:\n";
            $prompt .= $relevantMBA['context'] . "\n";
        }

        // Add user context if available with industry-specific focus
        if ($userContext && isset($userContext['profile'])) {
            $profile = $userContext['profile'];
            $industry = $profile['industry'] ?? 'general';
            $stage = $profile['business_stage'] ?? 'growth';

            $prompt .= "BUSINESS CONTEXT:\n";
            $prompt .= "- Business Type: " . ($profile['business_type'] ?? 'Not specified') . "\n";
            $prompt .= "- Industry: " . $industry . "\n";
            $prompt .= "- Stage: " . $stage . "\n";
            $prompt .= "- Employees: " . ($profile['employee_count'] ?? 'Not specified') . "\n";

            // Add industry-specific context
            $prompt .= "\nINDUSTRY-SPECIFIC CONSIDERATIONS:\n";
            $industryContext = $this->getIndustryContext($industry);
            $prompt .= $industryContext . "\n";

            // Add business-stage specific context
            $prompt .= "\nBUSINESS STAGE PRIORITIES:\n";
            $stageContext = $this->getStageContext($stage);
            $prompt .= $stageContext . "\n";

            if (isset($profile['primary_challenges']) && !empty($profile['primary_challenges'])) {
                $challenges = is_string($profile['primary_challenges'])
                    ? json_decode($profile['primary_challenges'], true)
                    : $profile['primary_challenges'];
                if (is_array($challenges)) {
                    $prompt .= "- Current Challenges: " . implode(', ', $challenges) . "\n";
                }
            }
            $prompt .= "\n";
        }

        // Add relevant concepts
        if (!empty($concepts)) {
            $prompt .= "RELEVANT BUSINESS PRINCIPLES:\n\n";
            foreach ($concepts as $concept) {
                $prompt .= "--- " . $concept['concept_name'] . " ---\n";
                $prompt .= $concept['description'] . "\n";
                if (!empty($concept['practical_application'])) {
                    $prompt .= "Application: " . $concept['practical_application'] . "\n";
                }
                if (!empty($concept['examples'])) {
                    $prompt .= "Examples: " . substr($concept['examples'], 0, 200) . "...\n";
                }
                $prompt .= "\n";
            }
        }

        // Add relevant frameworks
        if (!empty($frameworks)) {
            $prompt .= "STRATEGIC FRAMEWORKS:\n\n";
            foreach ($frameworks as $framework) {
                $prompt .= "--- " . $framework['framework_name'] . " ---\n";
                $prompt .= $framework['description'] . "\n";
                if (!empty($framework['when_to_use'])) {
                    $prompt .= "When to use: " . $framework['when_to_use'] . "\n";
                }
                $prompt .= "\n";
            }
        }

        $prompt .= "QUESTION: " . $question . "\n\n";
        $prompt .= "Provide actionable, data-driven business advice based on universal business principles and best practices. ";
        $prompt .= "Be specific to the industry and business stage. Include concrete, actionable steps. ";
        $prompt .= "Reference metrics and benchmarks where relevant. ";
        $prompt .= "Use the business principles and frameworks provided above to structure your response.";

        return $prompt;
    }

    /**
     * Get industry-specific context for enhanced AI prompts
     */
    private function getIndustryContext($industry) {
        $industryLower = strtolower($industry);

        $contexts = [
            'saas' => "For SaaS businesses, focus on MRR/ARR growth, customer acquisition cost (CAC), customer lifetime value (CLV), churn rate, and net revenue retention. Key priorities: product-market fit, scalable customer acquisition, and retention strategies.",
            'software' => "For software businesses, focus on MRR/ARR growth, customer acquisition cost (CAC), customer lifetime value (CLV), churn rate, and net revenue retention. Key priorities: product-market fit, scalable customer acquisition, and retention strategies.",
            'technology' => "For technology businesses, focus on innovation cycles, technical scalability, user adoption metrics, and competitive positioning. Prioritize R&D investment, talent acquisition, and market timing.",
            'ecommerce' => "For e-commerce, focus on conversion rate, average order value (AOV), cart abandonment, customer acquisition cost, and inventory turnover. Key priorities: UX optimization, supply chain efficiency, and customer retention.",
            'retail' => "For retail, focus on foot traffic, conversion rates, inventory turnover, gross margin, and customer retention. Key priorities: location strategy, merchandising, and omnichannel presence.",
            'services' => "For professional services, focus on utilization rate, realization rate, client retention, revenue per employee, and project profitability. Key priorities: expertise positioning, efficient delivery, and relationship management.",
            'consulting' => "For consulting businesses, focus on billable hours, hourly rates, client retention, and leverage ratio. Prioritize specialization, value demonstration, and scalable delivery models.",
            'manufacturing' => "For manufacturing, focus on production efficiency, gross margin, inventory turnover, defect rates, and time to market. Key priorities: operational excellence, quality control, and supply chain resilience."
        ];

        foreach ($contexts as $key => $context) {
            if (strpos($industryLower, $key) !== false) {
                return $context;
            }
        }

        return "Focus on fundamental business metrics: revenue growth, profit margin, customer acquisition and retention, operational efficiency, and cash flow management.";
    }

    /**
     * Get business-stage specific context for enhanced AI prompts
     */
    private function getStageContext($stage) {
        $stageLower = strtolower($stage);

        $contexts = [
            'startup' => "At the startup stage, prioritize product-market fit, initial customer acquisition, MVP iteration based on feedback, cash runway management, and validating business model assumptions.",
            'early' => "At the early stage, prioritize product-market fit, initial customer acquisition, MVP iteration based on feedback, cash runway management, and validating business model assumptions.",
            'growth' => "At the growth stage, focus on scaling customer acquisition, building scalable processes, expanding team strategically, improving unit economics, and increasing market coverage while maintaining quality.",
            'scale' => "At the scale stage, focus on market leadership, operational excellence, geographic expansion, product diversification, profitability optimization, and building defensible competitive advantages.",
            'maturity' => "At the maturity stage, focus on operational excellence, margin optimization, market consolidation, strategic partnerships, innovation to maintain relevance, and potential expansion into adjacent markets.",
            'turnaround' => "In turnaround mode, prioritize cash flow stabilization, cost reduction, core business refocus, strategic partnerships, customer retention, and identifying quick wins for momentum."
        ];

        foreach ($contexts as $key => $context) {
            if (strpos($stageLower, $key) !== false) {
                return $context;
            }
        }

        return "Focus on sustainable growth, operational efficiency, customer satisfaction, and financial health.";
    }

    /**
     * Generate rule-based answer
     */
    private function generateRuleBasedAnswer($question, $userContext, $concepts, $frameworks) {
        $answer = "<div style='font-family: sans-serif; line-height: 1.6;'>";
        $answer .= "<h3 style='color: #1e40af; margin-bottom: 15px;'>💼 Business Guidance</h3>";

        // Add concept-based insights
        if (!empty($concepts)) {
            $primaryConcept = $concepts[0];
            $answer .= "<p style='margin-bottom: 15px;'><strong>" . $primaryConcept['concept_name'] . ":</strong> " . $primaryConcept['description'] . "</p>";

            if (!empty($primaryConcept['practical_application'])) {
                $answer .= "<h4 style='color: #374151; margin-top: 20px;'>📋 Practical Application:</h4>";
                $answer .= "<p style='margin-bottom: 15px;'>" . nl2br($primaryConcept['practical_application']) . "</p>";
            }

            if (!empty($primaryConcept['examples'])) {
                $answer .= "<h4 style='color: #374151; margin-top: 20px;'>💡 Examples:</h4>";
                $answer .= "<p style='margin-bottom: 15px;'>" . nl2br($primaryConcept['examples']) . "</p>";
            }
        }

        // Add framework guidance
        if (!empty($frameworks)) {
            $primaryFramework = $frameworks[0];
            $answer .= "<h4 style='color: #374151; margin-top: 20px;'>🎯 Recommended Framework: " . $primaryFramework['framework_name'] . "</h4>";
            $answer .= "<p style='margin-bottom: 10px;'>" . $primaryFramework['description'] . "</p>";

            if (!empty($primaryFramework['steps'])) {
                $steps = is_string($primaryFramework['steps'])
                    ? json_decode($primaryFramework['steps'], true)
                    : $primaryFramework['steps'];

                if (is_array($steps)) {
                    $answer .= "<ol style='margin-left: 20px; margin-bottom: 15px;'>";
                    foreach ($steps as $step) {
                        $answer .= "<li style='margin-bottom: 5px;'>" . htmlspecialchars($step) . "</li>";
                    }
                    $answer .= "</ol>";
                }
            }
        }

        // Add context-specific advice
        if ($userContext && isset($userContext['profile'])) {
            $answer .= "<h4 style='color: #374151; margin-top: 20px;'>🎯 For Your Business:</h4>";
            $answer .= "<p style='margin-bottom: 15px;'>";
            $answer .= "Based on your " . ($userContext['profile']['business_stage'] ?? 'current') . " stage business, ";
            $answer .= "focus on applying these principles in your " . ($userContext['profile']['industry'] ?? 'industry') . " context.";
            $answer .= "</p>";
        }

        $answer .= "</div>";

        return $answer;
    }

    /**
     * Format concept references
     */
    private function formatConceptReferences($concepts) {
        $references = [];
        foreach ($concepts as $concept) {
            $references[] = [
                'name' => $concept['concept_name'],
                'category' => $concept['category'],
                'source' => $concept['source_book'] ?? 'Universal Business Principles'
            ];
        }
        return $references;
    }

    /**
     * Format framework references
     */
    private function formatFrameworkReferences($frameworks) {
        $references = [];
        foreach ($frameworks as $framework) {
            $references[] = [
                'name' => $framework['framework_name'],
                'category' => $framework['category']
            ];
        }
        return $references;
    }

    /**
     * Log consultation to database (with PCT support)
     */
    private function logConsultation($userId, $companyId, $question, $response, $concepts, $frameworks, $personalContext = null) {
        try {
            $conceptIds = array_map(function($c) { return $c['id']; }, $concepts);
            $frameworkIds = array_map(function($f) { return $f['id']; }, $frameworks);

            // Log to business_consultations (legacy)
            $this->db->insert('business_consultations', [
                'user_id' => $userId,
                'company_id' => $companyId,
                'question' => $question,
                'answer' => $response['answer'],
                'concepts_referenced' => '{' . implode(',', $conceptIds) . '}',
                'frameworks_suggested' => '{' . implode(',', $frameworkIds) . '}',
                'confidence' => $response['confidence'],
                'source' => $response['source']
            ]);

            // Log to context_aware_consultations if PCT is used
            if ($personalContext) {
                $this->db->insert('context_aware_consultations', [
                    'user_id' => $userId,
                    'context_id' => $personalContext['id'],
                    'question' => $question,
                    'answer' => $response['answer'],
                    'context_sections_used' => json_encode(['all']), // Could be more specific
                    'concepts_applied' => '{' . implode(',', $conceptIds) . '}',
                    'frameworks_applied' => '{' . implode(',', $frameworkIds) . '}',
                    'confidence' => $response['confidence'],
                    'source' => $response['source'],
                    'model' => $response['model'] ?? null,
                    'suggested_updates' => isset($response['suggested_context_updates'])
                        ? json_encode($response['suggested_context_updates'])
                        : null
                ]);
            }
        } catch (Exception $e) {
            error_log("Failed to log consultation: " . $e->getMessage());
        }
    }

    /**
     * Generate insights based on business metrics
     */
    public function generateInsights($userId, $companyId = null) {
        // Get user context
        $userContext = $this->getUserBusinessContext($userId, $companyId);

        if (!$userContext || empty($userContext['recent_metrics'])) {
            return [
                'success' => false,
                'message' => 'Insufficient data to generate insights'
            ];
        }

        $insights = [];

        // Analyze metrics and generate insights
        $metrics = $userContext['recent_metrics'];

        // Cash flow analysis
        if (isset($metrics[0]['cash_flow']) && $metrics[0]['cash_flow'] < 0) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'finance',
                'priority' => 'high',
                'title' => 'Negative Cash Flow Detected',
                'description' => 'Your recent cash flow is negative. This requires immediate attention to ensure business sustainability.',
                'recommended_actions' => [
                    'Review accounts receivable and speed up collections',
                    'Negotiate better payment terms with suppliers',
                    'Consider reducing non-essential expenses',
                    'Explore short-term financing options if needed'
                ],
                'related_concept' => 'Cash Flow Cycle'
            ];
        }

        // Profit margin analysis
        if (isset($metrics[0]['revenue'], $metrics[0]['costs']) && $metrics[0]['revenue'] > 0) {
            $profitMargin = (($metrics[0]['revenue'] - $metrics[0]['costs']) / $metrics[0]['revenue']) * 100;

            if ($profitMargin < 10) {
                $insights[] = [
                    'type' => 'recommendation',
                    'category' => 'finance',
                    'priority' => 'medium',
                    'title' => 'Low Profit Margin',
                    'description' => sprintf('Your profit margin is %.1f%%, which is relatively low. Consider strategies to improve profitability.', $profitMargin),
                    'recommended_actions' => [
                        'Analyze pricing strategy - can you increase prices?',
                        'Identify and reduce unnecessary costs',
                        'Focus on higher-margin products/services',
                        'Improve operational efficiency'
                    ],
                    'related_concept' => 'Profit Margin'
                ];
            }
        }

        // Customer acquisition cost analysis
        if (isset($metrics[0]['customer_acquisition_cost'], $metrics[0]['customer_lifetime_value'])) {
            $cac = $metrics[0]['customer_acquisition_cost'];
            $ltv = $metrics[0]['customer_lifetime_value'];

            if ($ltv > 0 && ($ltv / $cac) < 3) {
                $insights[] = [
                    'type' => 'warning',
                    'category' => 'marketing',
                    'priority' => 'high',
                    'title' => 'Unfavorable LTV:CAC Ratio',
                    'description' => sprintf('Your customer lifetime value (%.2f RON) to acquisition cost (%.2f RON) ratio is below the healthy 3:1 benchmark.', $ltv, $cac),
                    'recommended_actions' => [
                        'Reduce customer acquisition costs through more efficient marketing',
                        'Increase customer lifetime value through upsells and retention',
                        'Focus on most profitable customer segments',
                        'Improve conversion rates to lower CAC'
                    ],
                    'related_concept' => '4 Methods to Increase Revenue'
                ];
            }
        }

        return [
            'success' => true,
            'insights' => $insights,
            'total_count' => count($insights)
        ];
    }
}
