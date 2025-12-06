<?php
/**
 * Persona Selection Quiz
 * GET /api/v1/personas/quiz.php - Get quiz questions
 * POST /api/v1/personas/quiz.php - Submit quiz answers and get recommendation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID, Accept-Language');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';

try {
    // Get language preference
    $lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'ro';
    $lang = substr($lang, 0, 2);
    if (!in_array($lang, ['ro', 'en'])) {
        $lang = 'ro';
    }

    $db = Database::getInstance()->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Return quiz questions
        $questionField = $lang === 'en' ? 'question_en' : 'question_ro';

        $stmt = $db->prepare("
            SELECT
                id,
                $questionField as question,
                options,
                question_order
            FROM persona_quiz_questions
            WHERE is_active = true
            ORDER BY question_order ASC
        ");

        $stmt->execute();
        $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse options and localize labels
        foreach ($questions as &$q) {
            $options = json_decode($q['options'], true) ?? [];
            foreach ($options as &$opt) {
                $opt['label'] = $lang === 'en' ? $opt['label_en'] : $opt['label_ro'];
                unset($opt['label_ro'], $opt['label_en']);
            }
            $q['options'] = $options;
        }

        echo json_encode([
            'success' => true,
            'data' => $questions,
            'language' => $lang,
            'total_questions' => count($questions)
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Process quiz answers and calculate recommendation
        $input = json_decode(file_get_contents('php://input'), true);
        $answers = $input['answers'] ?? [];

        if (empty($answers) || !is_array($answers)) {
            throw new Exception('answers array is required');
        }

        // Get all questions with their persona weights
        $stmt = $db->prepare("SELECT id, options FROM persona_quiz_questions WHERE is_active = true");
        $stmt->execute();
        $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate persona scores
        $personaScores = [];

        foreach ($questions as $question) {
            $questionId = $question['id'];
            $options = json_decode($question['options'], true) ?? [];

            // Find the answer for this question
            $userAnswer = null;
            foreach ($answers as $answer) {
                if ($answer['question_id'] === $questionId) {
                    $userAnswer = $answer['value'];
                    break;
                }
            }

            if ($userAnswer === null) continue;

            // Find the selected option and add its weights
            foreach ($options as $option) {
                if ($option['value'] === $userAnswer) {
                    $weights = $option['persona_weights'] ?? [];
                    foreach ($weights as $personaId => $weight) {
                        if (!isset($personaScores[$personaId])) {
                            $personaScores[$personaId] = 0;
                        }
                        $personaScores[$personaId] += $weight;
                    }
                    break;
                }
            }
        }

        // Sort by score descending
        arsort($personaScores);

        // Get top 3 recommendations
        $topPersonaIds = array_slice(array_keys($personaScores), 0, 3);

        if (empty($topPersonaIds)) {
            throw new Exception('Could not calculate recommendations from answers');
        }

        // Get persona details for recommendations
        $nameField = $lang === 'en' ? 'name_en' : 'name_ro';
        $descField = $lang === 'en' ? 'description_en' : 'description_ro';

        $placeholders = implode(',', array_fill(0, count($topPersonaIds), '?'));
        $stmt = $db->prepare("
            SELECT
                id,
                $nameField as name,
                $descField as description,
                icon,
                color,
                category,
                recommended_tier
            FROM business_personas
            WHERE id IN ($placeholders)
            ORDER BY CASE id " .
            implode(' ', array_map(fn($id, $i) => "WHEN '$id' THEN $i", $topPersonaIds, range(0, count($topPersonaIds)-1))) .
            " END
        ");

        $stmt->execute($topPersonaIds);
        $recommendations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add scores and match percentage
        $maxScore = max($personaScores) ?: 1;
        foreach ($recommendations as &$rec) {
            $rec['score'] = $personaScores[$rec['id']] ?? 0;
            $rec['match_percentage'] = round(($rec['score'] / $maxScore) * 100);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'recommended' => $recommendations[0] ?? null,
                'alternatives' => array_slice($recommendations, 1),
                'all_scores' => $personaScores
            ],
            'language' => $lang
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
