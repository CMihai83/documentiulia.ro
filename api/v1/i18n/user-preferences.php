<?php
/**
 * User Language Preferences
 * GET /api/v1/i18n/user-preferences.php - Get user's language preferences
 * PUT /api/v1/i18n/user-preferences.php - Update user's language preferences
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $db = Database::getInstance()->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user preferences
        $stmt = $db->prepare("
            SELECT
                preferred_language,
                date_format,
                time_format,
                currency,
                timezone,
                number_format
            FROM user_language_preferences
            WHERE user_id = :user_id
        ");
        $stmt->execute([':user_id' => $userId]);
        $prefs = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$prefs) {
            // Return defaults
            $prefs = [
                'preferred_language' => 'ro',
                'date_format' => 'DD.MM.YYYY',
                'time_format' => 'HH:mm',
                'currency' => 'RON',
                'timezone' => 'Europe/Bucharest',
                'number_format' => 'eu'
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $prefs
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Update user preferences
        $input = json_decode(file_get_contents('php://input'), true);

        $validLanguages = ['ro', 'en', 'de', 'it', 'es', 'fr'];
        $validCurrencies = ['RON', 'EUR', 'USD', 'GBP'];
        $validNumberFormats = ['eu', 'us'];

        // Validate inputs
        $preferredLanguage = in_array($input['preferred_language'] ?? '', $validLanguages)
            ? $input['preferred_language'] : 'ro';
        $currency = in_array($input['currency'] ?? '', $validCurrencies)
            ? $input['currency'] : 'RON';
        $numberFormat = in_array($input['number_format'] ?? '', $validNumberFormats)
            ? $input['number_format'] : 'eu';
        $dateFormat = $input['date_format'] ?? 'DD.MM.YYYY';
        $timeFormat = $input['time_format'] ?? 'HH:mm';
        $timezone = $input['timezone'] ?? 'Europe/Bucharest';

        // Upsert preferences
        $stmt = $db->prepare("
            INSERT INTO user_language_preferences
                (user_id, preferred_language, date_format, time_format, currency, timezone, number_format)
            VALUES
                (:user_id, :lang, :date_fmt, :time_fmt, :currency, :tz, :num_fmt)
            ON CONFLICT (user_id) DO UPDATE SET
                preferred_language = :lang,
                date_format = :date_fmt,
                time_format = :time_fmt,
                currency = :currency,
                timezone = :tz,
                number_format = :num_fmt,
                updated_at = NOW()
        ");

        $stmt->execute([
            ':user_id' => $userId,
            ':lang' => $preferredLanguage,
            ':date_fmt' => $dateFormat,
            ':time_fmt' => $timeFormat,
            ':currency' => $currency,
            ':tz' => $timezone,
            ':num_fmt' => $numberFormat
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Preferences updated successfully',
            'data' => [
                'preferred_language' => $preferredLanguage,
                'date_format' => $dateFormat,
                'time_format' => $timeFormat,
                'currency' => $currency,
                'timezone' => $timezone,
                'number_format' => $numberFormat
            ]
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
