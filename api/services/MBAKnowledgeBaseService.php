<?php
/**
 * MBA Knowledge Base Service
 *
 * Integrates Personal MBA knowledge (99 books) into AI consultations
 * Provides the foundational business knowledge that powers the entire platform
 *
 * This service:
 * 1. Loads MBA frameworks and principles from database
 * 2. Creates AI system prompts with MBA knowledge
 * 3. Trains local AI (Ollama) with business fundamentals
 * 4. Integrates MBA wisdom into all consultations
 */

require_once __DIR__ . '/../config/database.php';

class MBAKnowledgeBaseService {
    private $db;
    private $mbaCache = null;
    private $frameworksCache = null;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get comprehensive MBA knowledge for AI training
     * Returns system prompt with all 99 books' core concepts
     */
    public function getMBASystemPrompt() {
        $books = $this->getAllMBABooks();

        $prompt = "You are a business consultant powered by the comprehensive knowledge from 99 essential business books (The Personal MBA curriculum). You have deep expertise in:\n\n";

        // Group by category
        $categories = [];
        foreach ($books as $book) {
            $categories[$book['category']][] = $book;
        }

        foreach ($categories as $category => $categoryBooks) {
            $prompt .= "**{$category}:**\n";
            foreach ($categoryBooks as $book) {
                $prompt .= "- {$book['title']} by {$book['author']}: {$book['core_concept']}\n";
            }
            $prompt .= "\n";
        }

        $prompt .= "\nWhen providing business advice, draw upon these universal business principles:\n\n";
        $prompt .= "1. **Value Creation**: Every business creates something valuable (product/service) that people need\n";
        $prompt .= "2. **Marketing**: Attract attention and build demand for what you offer\n";
        $prompt .= "3. **Sales**: Turn prospective customers into paying customers\n";
        $prompt .= "4. **Value Delivery**: Give customers what you promised and ensure satisfaction\n";
        $prompt .= "5. **Finance**: Bring in enough money to make the business worthwhile\n\n";

        $prompt .= "Always:\n";
        $prompt .= "- Provide practical, actionable advice based on proven business principles\n";
        $prompt .= "- Reference specific frameworks when relevant (e.g., Lean Startup, 80/20 Principle, etc.)\n";
        $prompt .= "- Consider the user's specific business context and stage\n";
        $prompt .= "- Prioritize sustainable, ethical business practices\n";
        $prompt .= "- Give concrete next steps the user can implement immediately\n\n";

        $prompt .= "Respond in Romanian when the question is in Romanian, English when in English.\n";

        return $prompt;
    }

    /**
     * Get MBA knowledge relevant to a specific question
     * Returns frameworks and books that apply to the situation
     */
    public function getRelevantMBAKnowledge($question) {
        // Keyword mapping to MBA categories
        $categoryKeywords = [
            'Foundation' => ['business', 'fundamentals', 'start', 'basics', 'principles'],
            'Business Creation' => ['start', 'launch', 'idea', 'validate', 'entrepreneur', 'startup'],
            'Marketing' => ['customers', 'market', 'advertising', 'brand', 'promote', 'reach'],
            'Sales' => ['sell', 'close', 'pitch', 'negotiate', 'price', 'customer'],
            'Operations' => ['process', 'efficiency', 'productivity', 'system', 'workflow'],
            'Finance' => ['money', 'profit', 'revenue', 'cost', 'cash flow', 'accounting', 'tax', 'fiscal'],
            'Psychology' => ['behavior', 'decision', 'motivation', 'thinking', 'cognitive'],
            'Productivity' => ['time', 'focus', 'goals', 'habits', 'energy', 'efficiency'],
            'Communication' => ['present', 'write', 'communicate', 'influence', 'persuade'],
            'Leadership' => ['lead', 'manage', 'team', 'culture', 'inspire', 'vision'],
            'Management' => ['manage', 'employees', 'hiring', 'performance', 'delegation'],
            'Strategy' => ['strategy', 'competitive', 'growth', 'planning', 'positioning'],
        ];

        // Find matching categories
        $matchingCategories = [];
        $questionLower = mb_strtolower($question);

        foreach ($categoryKeywords as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (mb_strpos($questionLower, $keyword) !== false) {
                    $matchingCategories[] = $category;
                    break;
                }
            }
        }

        // Default to Foundation if no matches
        if (empty($matchingCategories)) {
            $matchingCategories = ['Foundation'];
        }

        // Get relevant books
        $placeholders = implode(',', array_fill(0, count($matchingCategories), '?'));
        $sql = "SELECT id, book_number, title, author, category, core_concept
                FROM mba_books
                WHERE category IN ($placeholders)
                ORDER BY book_number ASC
                LIMIT 5";

        $relevantBooks = $this->db->fetchAll($sql, $matchingCategories);

        return [
            'categories' => array_unique($matchingCategories),
            'books' => $relevantBooks,
            'context' => $this->buildContextFromBooks($relevantBooks)
        ];
    }

    /**
     * Build AI context from relevant MBA books
     */
    private function buildContextFromBooks($books) {
        if (empty($books)) {
            return '';
        }

        $context = "Relevant business knowledge for this question:\n\n";

        foreach ($books as $book) {
            $context .= "📚 {$book['title']} ({$book['author']}):\n";
            $context .= "   {$book['core_concept']}\n\n";
        }

        return $context;
    }

    /**
     * Get all MBA books (cached)
     */
    private function getAllMBABooks() {
        if ($this->mbaCache !== null) {
            return $this->mbaCache;
        }

        $sql = "SELECT * FROM mba_books ORDER BY book_number ASC";
        $this->mbaCache = $this->db->fetchAll($sql);

        return $this->mbaCache;
    }

    /**
     * Train Ollama AI with MBA knowledge
     * Creates a custom model or system message with all MBA principles
     */
    public function trainAIWithMBAKnowledge() {
        $systemPrompt = $this->getMBASystemPrompt();

        // Save system prompt to a file for Ollama modelfile
        $modelfilePath = '/tmp/mba_knowledge_modelfile';
        $modelfileContent = "FROM deepseek-r1:1.5b\n\n";
        $modelfileContent .= "SYSTEM \"\"\"\n";
        $modelfileContent .= $systemPrompt;
        $modelfileContent .= "\"\"\"\n\n";
        $modelfileContent .= "PARAMETER temperature 0.7\n";
        $modelfileContent .= "PARAMETER top_p 0.9\n";

        file_put_contents($modelfilePath, $modelfileContent);

        return [
            'modelfile_path' => $modelfilePath,
            'system_prompt' => $systemPrompt,
            'instructions' => 'Run: ollama create mba-consultant -f ' . $modelfilePath
        ];
    }

    /**
     * Get specific MBA framework details
     */
    public function getFramework($frameworkName) {
        $sql = "SELECT * FROM mba_frameworks WHERE framework_name ILIKE :name LIMIT 1";
        return $this->db->fetchOne($sql, ['name' => "%{$frameworkName}%"]);
    }

    /**
     * Log when MBA knowledge is used in consultations
     */
    public function logMBAUsage($userId, $companyId, $question, $booksUsed, $outcome) {
        try {
            $sql = "INSERT INTO mba_consultation_log
                    (user_id, company_id, question, books_referenced, outcome, created_at)
                    VALUES (:user_id, :company_id, :question, :books, :outcome, NOW())";

            $this->db->query($sql, [
                'user_id' => $userId,
                'company_id' => $companyId,
                'question' => $question,
                'books' => json_encode($booksUsed),
                'outcome' => json_encode($outcome)
            ]);
        } catch (Exception $e) {
            error_log("Failed to log MBA usage: " . $e->getMessage());
        }
    }

    /**
     * Get MBA learning path for user
     * Recommends which books to read based on their business needs
     */
    public function getLearningPath($userContext) {
        // Analyze user's business stage and needs
        $recommendations = [];

        // Beginners: Foundation
        if (empty($userContext) || !isset($userContext['business_stage'])) {
            $recommendations[] = [
                'category' => 'Foundation',
                'reason' => 'Start with business fundamentals',
                'priority' => 1
            ];
            $recommendations[] = [
                'category' => 'Business Creation',
                'reason' => 'Learn how to start and validate a business',
                'priority' => 2
            ];
        }

        // Get recommended books
        $books = [];
        foreach ($recommendations as $rec) {
            $sql = "SELECT * FROM mba_books WHERE category = :category ORDER BY book_number ASC LIMIT 3";
            $categoryBooks = $this->db->fetchAll($sql, ['category' => $rec['category']]);

            foreach ($categoryBooks as $book) {
                $books[] = [
                    'book' => $book,
                    'reason' => $rec['reason'],
                    'priority' => $rec['priority']
                ];
            }
        }

        return $books;
    }
}
