<?php
/**
 * Test DeepSeek Integration
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/services/OllamaService.php';
require_once __DIR__ . '/services/FiscalAIService.php';

echo "<h1>DeepSeek Integration Test</h1>";

// Test 1: Check Ollama availability
echo "<h2>Test 1: Ollama Service Status</h2>";
$ollama = new OllamaService();
$isAvailable = $ollama->isAvailable();
echo "<p><strong>Ollama Available:</strong> " . ($isAvailable ? "✅ YES" : "❌ NO") . "</p>";

if ($isAvailable) {
    $modelInfo = $ollama->getModelInfo();
    if ($modelInfo) {
        echo "<p><strong>Model:</strong> " . $modelInfo['name'] . "</p>";
        echo "<p><strong>Size:</strong> " . round($modelInfo['size'] / 1024 / 1024, 2) . " MB</p>";
        echo "<p><strong>Modified:</strong> " . $modelInfo['modified_at'] . "</p>";
    }
}

// Test 2: Test Romanian fiscal question with Ollama
echo "<h2>Test 2: Romanian Fiscal Question (DeepSeek AI)</h2>";
echo "<p><strong>Question:</strong> Ce este TVA și când trebuie să mă înregistrez?</p>";

try {
    $response = $ollama->generateResponse("Ce este TVA și când trebuie să mă înregistrez?");
    if ($response['success']) {
        echo "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px;'>";
        echo "<p><strong>Source:</strong> " . $response['source'] . " (" . $response['model'] . ")</p>";
        echo "<hr>";
        echo $response['answer'];
        echo "</div>";
    } else {
        echo "<p style='color: red;'>❌ Error: " . $response['error'] . "</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Exception: " . $e->getMessage() . "</p>";
}

// Test 3: Test FiscalAIService with AI integration
echo "<h2>Test 3: FiscalAIService Integration</h2>";
echo "<p><strong>Question:</strong> Cât plătesc contribuții ca PFA cu 50.000 lei venit?</p>";

try {
    $fiscalAI = new FiscalAIService();
    $result = $fiscalAI->consultFiscalQuestion("Cât plătesc contribuții ca PFA cu 50.000 lei venit?");

    echo "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;'>";
    echo "<p><strong>Source:</strong> " . ($result['source'] ?? 'unknown') . "</p>";
    echo "<p><strong>Confidence:</strong> " . round($result['confidence'] * 100) . "%</p>";
    if (isset($result['model'])) {
        echo "<p><strong>Model:</strong> " . $result['model'] . "</p>";
    }
    echo "<hr>";
    echo $result['answer'];
    echo "</div>";

    if (!empty($result['references'])) {
        echo "<h4>Referințe legislative:</h4>";
        echo "<ul>";
        foreach ($result['references'] as $ref) {
            echo "<li>" . $ref . "</li>";
        }
        echo "</ul>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Exception: " . $e->getMessage() . "</p>";
}

// Test 4: Compare AI vs Rule-based
echo "<h2>Test 4: Comparison Test</h2>";
echo "<p><strong>Question:</strong> Am o microîntreprindere cu 200.000 EUR cifra de afaceri. Cât plătesc?</p>";

try {
    $fiscalAI = new FiscalAIService();
    $result = $fiscalAI->consultFiscalQuestion("Am o microîntreprindere cu 200.000 EUR cifra de afaceri. Cât plătesc?");

    echo "<div style='background: #e0f2fe; padding: 15px; border-radius: 8px;'>";
    echo "<p><strong>Source:</strong> " . ($result['source'] ?? 'unknown') . "</p>";
    echo $result['answer'];
    echo "</div>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Exception: " . $e->getMessage() . "</p>";
}

echo "<hr>";
echo "<p><strong>All tests completed!</strong></p>";
