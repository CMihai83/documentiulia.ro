<?php
/**
 * Beta Applications API Endpoint
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = new PDO(
        "pgsql:host=127.0.0.1;dbname=accountech_production",
        "accountech_app",
        "AccTech2025Prod@Secure"
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Load EmailService
require_once __DIR__ . '/../../../includes/EmailService.php';
$emailService = new EmailService($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $required = ['company_name', 'contact_name', 'email', 'phone', 'businessType', 'numProducts', 'numEmployees', 'mainProblem'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Missing: $field"]);
            exit;
        }
    }

    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM beta_applications WHERE email = ?");
    $stmt->execute([$input['email']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email deja folosit']);
        exit;
    }

    $score = 0;
    $numProducts = intval($input['numProducts']);
    if ($numProducts >= 100 && $numProducts <= 1000) $score += 20;
    elseif ($numProducts >= 50) $score += 15;
    else $score += 5;

    $numEmployees = intval($input['numEmployees']);
    if ($numEmployees >= 2 && $numEmployees <= 10) $score += 15;
    else $score += 10;

    if ($input['businessType'] === 'hybrid') $score += 10;
    elseif ($input['businessType'] === 'online') $score += 8;
    else $score += 6;

    $problemLength = strlen($input['mainProblem']);
    if ($problemLength >= 100) $score += 10;
    elseif ($problemLength >= 50) $score += 7;
    else $score += 3;

    $score += 20;

    $status = $score >= 60 ? 'accepted' : ($score < 30 ? 'waitlist' : 'pending');

    try {
        $stmt = $pdo->prepare("
            INSERT INTO beta_applications
            (company_name, contact_name, email, phone, business_type, num_products, num_employees, main_problem, score, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $input['company_name'],
            $input['contact_name'],
            $input['email'],
            $input['phone'],
            $input['businessType'],
            $numProducts,
            $numEmployees,
            $input['mainProblem'],
            $score,
            $status
        ]);

        // Send confirmation email
        $status_messages = [
            'accepted' => '✅ ACCEPTAT - Felicitări!',
            'pending' => '⏳ În revizie',
            'waitlist' => '📋 Listă de așteptare'
        ];

        $emailService->send(
            $input['email'],
            'beta-application-confirmation',
            [
                'contact_name' => $input['contact_name'],
                'company_name' => $input['company_name'],
                'application_score' => $score,
                'status' => $status,
                'status_message' => $status_messages[$status],
                'if_accepted' => $status === 'accepted',
                'if_pending' => $status === 'pending',
                'if_waitlist' => $status === 'waitlist'
            ]
        );

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Aplicația trimisă cu succes!',
            'data' => ['score' => $score, 'status' => $status]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error']);
    }

    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM beta_applications ORDER BY score DESC, created_at DESC LIMIT 50");
    $apps = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $apps]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
