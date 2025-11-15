<?php
/**
 * Tree Generator Service
 * AI-powered decision tree generation from unanswered questions
 *
 * Process:
 * 1. Analyze question and context
 * 2. Generate decision tree structure
 * 3. Identify key decision points
 * 4. Map legislation references
 * 5. Create examples for each path
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/OllamaService.php';

class TreeGeneratorService {
    private $db;
    private $ollamaService;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->ollamaService = new OllamaService();
    }

    /**
     * Generate decision tree structure from a question
     */
    public function generateTree($question, $context = null) {
        try {
            // Build prompt for tree generation
            $prompt = $this->buildTreeGenerationPrompt($question, $context);

            // Use AI to generate tree structure
            $aiResponse = $this->ollamaService->generateResponse($prompt, $context, [
                'temperature' => 0.3, // Lower temperature for more structured output
                'max_tokens' => 2000
            ]);

            if (!$aiResponse['success']) {
                return [
                    'success' => false,
                    'message' => 'AI generation failed: ' . ($aiResponse['error'] ?? 'Unknown error')
                ];
            }

            // Parse AI response into tree structure
            $treeStructure = $this->parseTreeStructure($aiResponse['answer']);

            // Enhance tree with legislation references
            $enhancedTree = $this->enhanceWithLegislation($treeStructure, $question);

            // Calculate confidence score
            $confidence = $this->calculateConfidence($enhancedTree);

            return [
                'success' => true,
                'tree_structure' => $enhancedTree,
                'confidence' => $confidence
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Tree generation error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Build prompt for AI tree generation
     */
    private function buildTreeGenerationPrompt($question, $context) {
        $prompt = "Ești expert în creare arbori de decizie pentru consultanță fiscală și legală din România.\n\n";

        $prompt .= "TASK: Creează un arbore de decizie structurat pentru întrebarea:\n";
        $prompt .= "\"" . $question . "\"\n\n";

        if ($context) {
            $prompt .= "CONTEXT CLIENT:\n";
            $prompt .= json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
        }

        $prompt .= "INSTRUCȚIUNI:\n";
        $prompt .= "1. Identifică întrebările cheie necesare pentru a răspunde complet\n";
        $prompt .= "2. Creează un flux logic de întrebări (maxim 5 nivele adâncime)\n";
        $prompt .= "3. Pentru fiecare întrebare, oferă opțiuni clare de răspuns\n";
        $prompt .= "4. Oferă exemple concrete pentru fiecare opțiune\n";
        $prompt .= "5. La final, oferă răspunsul detaliat cu referințe legislative\n\n";

        $prompt .= "FORMAT RĂSPUNS (JSON):\n";
        $prompt .= "{\n";
        $prompt .= "  \"tree_name\": \"Nume sugestiv\",\n";
        $prompt .= "  \"category\": \"fiscal|accounting|labor|commercial|audit\",\n";
        $prompt .= "  \"nodes\": [\n";
        $prompt .= "    {\n";
        $prompt .= "      \"question\": \"Prima întrebare?\",\n";
        $prompt .= "      \"help_text\": \"Ghidare suplimentară\",\n";
        $prompt .= "      \"examples\": [\"Exemplu 1\", \"Exemplu 2\"],\n";
        $prompt .= "      \"paths\": [\n";
        $prompt .= "        {\n";
        $prompt .= "          \"answer\": \"Opțiunea 1\",\n";
        $prompt .= "          \"next_question\": \"Întrebarea următoare sau null pentru răspuns final\",\n";
        $prompt .= "          \"final_answer\": \"Răspunsul complet (dacă este terminal)\",\n";
        $prompt .= "          \"legislation\": [\"Art. X Cod Fiscal\", \"Legea Y/Z\"]\n";
        $prompt .= "        }\n";
        $prompt .= "      ]\n";
        $prompt .= "    }\n";
        $prompt .= "  ]\n";
        $prompt .= "}\n\n";

        $prompt .= "Răspunde DOAR cu JSON valid, fără text suplimentar.";

        return $prompt;
    }

    /**
     * Parse AI response into tree structure
     */
    private function parseTreeStructure($aiResponse) {
        try {
            // Extract JSON from response (in case AI added extra text)
            if (preg_match('/\{[\s\S]*\}/', $aiResponse, $matches)) {
                $jsonStr = $matches[0];
            } else {
                $jsonStr = $aiResponse;
            }

            $structure = json_decode($jsonStr, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON from AI: " . json_last_error_msg());
            }

            // Validate structure
            if (!isset($structure['tree_name']) || !isset($structure['nodes'])) {
                throw new Exception("Invalid tree structure: missing required fields");
            }

            return $structure;

        } catch (Exception $e) {
            error_log("Failed to parse tree structure: " . $e->getMessage());

            // Return fallback simple structure
            return [
                'tree_name' => 'Consultanță generală',
                'category' => 'general',
                'nodes' => [
                    [
                        'question' => 'Descrie situația ta?',
                        'help_text' => 'Oferă cât mai multe detalii',
                        'examples' => [],
                        'paths' => []
                    ]
                ]
            ];
        }
    }

    /**
     * Enhance tree with legislation references from database
     */
    private function enhanceWithLegislation($treeStructure, $question) {
        try {
            // Search for relevant legislation
            $keywords = $this->extractKeywords($question);

            $sql = "SELECT id, code, title, category, summary
                    FROM fiscal_legislation
                    WHERE to_tsvector('romanian', title || ' ' || full_text) @@ plainto_tsquery('romanian', :keywords)
                    AND is_active = TRUE
                    ORDER BY ts_rank(to_tsvector('romanian', title || ' ' || full_text), plainto_tsquery('romanian', :keywords)) DESC
                    LIMIT 10";

            $legislation = $this->db->fetchAll($sql, ['keywords' => implode(' ', $keywords)]);

            // Attach legislation to relevant nodes/paths
            foreach ($treeStructure['nodes'] as &$node) {
                if (isset($node['paths'])) {
                    foreach ($node['paths'] as &$path) {
                        if (!empty($path['final_answer'])) {
                            // Add legislation IDs
                            $path['legislation_ids'] = array_column($legislation, 'id');
                            $path['legislation_details'] = array_slice($legislation, 0, 3);
                        }
                    }
                }
            }

            return $treeStructure;

        } catch (Exception $e) {
            error_log("Failed to enhance with legislation: " . $e->getMessage());
            return $treeStructure;
        }
    }

    /**
     * Extract keywords from question
     */
    private function extractKeywords($question) {
        // Remove common words
        $stopWords = ['ce', 'cum', 'când', 'unde', 'care', 'este', 'sunt', 'pentru', 'la', 'de', 'pe', 'în', 'cu', 'și', 'sau'];

        $words = preg_split('/\s+/', mb_strtolower($question));
        $keywords = array_filter($words, function($word) use ($stopWords) {
            return strlen($word) > 3 && !in_array($word, $stopWords);
        });

        return array_values($keywords);
    }

    /**
     * Calculate confidence score for generated tree
     */
    private function calculateConfidence($treeStructure) {
        $score = 0.5; // Base score

        // More nodes = more detailed = higher confidence
        $nodeCount = count($treeStructure['nodes'] ?? []);
        $score += min($nodeCount * 0.05, 0.2);

        // Presence of legislation = higher confidence
        foreach ($treeStructure['nodes'] as $node) {
            if (isset($node['paths'])) {
                foreach ($node['paths'] as $path) {
                    if (!empty($path['legislation_ids'])) {
                        $score += 0.05;
                    }
                }
            }
        }

        // Examples provided = higher confidence
        foreach ($treeStructure['nodes'] as $node) {
            if (!empty($node['examples'])) {
                $score += 0.05;
            }
        }

        return min($score, 0.95); // Cap at 95%
    }

    /**
     * Convert tree structure to database format
     */
    public function convertToDatabase($treeStructure, $questionId) {
        try {
            $this->db->beginTransaction();

            // Create main tree
            $sql = "INSERT INTO decision_trees (tree_key, tree_name, description, category, priority)
                    VALUES (:key, :name, :description, :category, 50)
                    RETURNING id";

            $tree = $this->db->fetchOne($sql, [
                'key' => 'generated_' . $questionId,
                'name' => $treeStructure['tree_name'],
                'description' => 'Generated from user question',
                'category' => $treeStructure['category'] ?? 'general'
            ]);

            $treeId = $tree['id'];

            // Create nodes and paths
            $nodeIdMap = []; // Map original node index to DB ID

            foreach ($treeStructure['nodes'] as $index => $node) {
                $sql = "INSERT INTO decision_nodes
                        (tree_id, node_key, parent_node_id, question, question_type, help_text, examples, display_order)
                        VALUES (:tree_id, :key, :parent, :question, 'multiple_choice', :help, :examples, :order)
                        RETURNING id";

                $dbNode = $this->db->fetchOne($sql, [
                    'tree_id' => $treeId,
                    'key' => 'node_' . $index,
                    'parent' => null, // Simplified - would need parent tracking for nested trees
                    'question' => $node['question'],
                    'help' => $node['help_text'] ?? '',
                    'examples' => json_encode($node['examples'] ?? []),
                    'order' => $index
                ]);

                $nodeIdMap[$index] = $dbNode['id'];

                // Create paths for this node
                if (isset($node['paths'])) {
                    foreach ($node['paths'] as $pathIndex => $path) {
                        $sql = "INSERT INTO decision_paths
                                (node_id, path_key, answer_option, next_node_id, legislation_refs, answer_text, display_order)
                                VALUES (:node_id, :key, :answer, :next, :legislation, :answer_text, :order)";

                        $this->db->execute($sql, [
                            'node_id' => $dbNode['id'],
                            'key' => 'path_' . $pathIndex,
                            'answer' => $path['answer'],
                            'next' => null, // Would need to resolve next node references
                            'legislation' => json_encode($path['legislation_ids'] ?? []),
                            'answer_text' => $path['final_answer'] ?? null,
                            'order' => $pathIndex
                        ]);
                    }
                }
            }

            $this->db->commit();

            return [
                'success' => true,
                'tree_id' => $treeId
            ];

        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Database conversion failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate tree from batch of similar questions
     */
    public function generateFromBatch($questions) {
        try {
            // Analyze common patterns across questions
            $commonThemes = $this->identifyCommonThemes($questions);

            // Generate comprehensive tree covering all questions
            $prompt = $this->buildBatchTreePrompt($questions, $commonThemes);

            $aiResponse = $this->ollamaService->generateResponse($prompt);

            if (!$aiResponse['success']) {
                return [
                    'success' => false,
                    'message' => 'Batch generation failed'
                ];
            }

            $treeStructure = $this->parseTreeStructure($aiResponse['answer']);

            return [
                'success' => true,
                'tree_structure' => $treeStructure,
                'covers_questions' => count($questions)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Batch generation error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Identify common themes across multiple questions
     */
    private function identifyCommonThemes($questions) {
        $allKeywords = [];

        foreach ($questions as $question) {
            $keywords = $this->extractKeywords($question);
            foreach ($keywords as $keyword) {
                if (!isset($allKeywords[$keyword])) {
                    $allKeywords[$keyword] = 0;
                }
                $allKeywords[$keyword]++;
            }
        }

        // Sort by frequency
        arsort($allKeywords);

        // Return top themes
        return array_slice(array_keys($allKeywords), 0, 5);
    }

    /**
     * Build prompt for batch tree generation
     */
    private function buildBatchTreePrompt($questions, $themes) {
        $prompt = "Creează un arbore de decizie care să acopere următoarele întrebări similare:\n\n";

        foreach ($questions as $i => $question) {
            $prompt .= ($i + 1) . ". " . $question . "\n";
        }

        $prompt .= "\nTeme comune identificate: " . implode(', ', $themes) . "\n\n";
        $prompt .= "Creează un arbore de decizie general care să răspundă la toate aceste întrebări.\n";

        return $prompt;
    }
}
