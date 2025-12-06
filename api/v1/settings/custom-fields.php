<?php
/**
 * Custom Fields API
 * Define and manage custom fields for entities
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Supported entity types for custom fields
$entityTypes = [
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts'],
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices'],
    'products' => ['ro' => 'Produse', 'en' => 'Products'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects'],
    'tasks' => ['ro' => 'Sarcini', 'en' => 'Tasks'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees'],
];

// Supported field types
$fieldTypes = [
    'text' => ['ro' => 'Text', 'en' => 'Text', 'has_options' => false],
    'textarea' => ['ro' => 'Text lung', 'en' => 'Long Text', 'has_options' => false],
    'number' => ['ro' => 'Număr', 'en' => 'Number', 'has_options' => false],
    'currency' => ['ro' => 'Valută', 'en' => 'Currency', 'has_options' => false],
    'date' => ['ro' => 'Dată', 'en' => 'Date', 'has_options' => false],
    'datetime' => ['ro' => 'Dată și oră', 'en' => 'Date & Time', 'has_options' => false],
    'select' => ['ro' => 'Selecție', 'en' => 'Select', 'has_options' => true],
    'multiselect' => ['ro' => 'Selecție multiplă', 'en' => 'Multi-Select', 'has_options' => true],
    'checkbox' => ['ro' => 'Bifă', 'en' => 'Checkbox', 'has_options' => false],
    'email' => ['ro' => 'Email', 'en' => 'Email', 'has_options' => false],
    'phone' => ['ro' => 'Telefon', 'en' => 'Phone', 'has_options' => false],
    'url' => ['ro' => 'URL', 'en' => 'URL', 'has_options' => false],
    'file' => ['ro' => 'Fișier', 'en' => 'File', 'has_options' => false],
    'user' => ['ro' => 'Utilizator', 'en' => 'User', 'has_options' => false],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $fieldId = $_GET['id'] ?? null;
            $entityType = $_GET['entity_type'] ?? null;

            if ($fieldId) {
                // Get single field
                $stmt = $db->prepare("SELECT * FROM custom_fields WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $fieldId, 'company_id' => $companyId]);
                $field = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$field) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Custom field not found']);
                    exit;
                }

                $field['options'] = json_decode($field['options'] ?? '[]', true);
                $field['validation'] = json_decode($field['validation'] ?? '{}', true);
                $field['entity_type_label'] = $entityTypes[$field['entity_type']] ?? null;
                $field['field_type_label'] = $fieldTypes[$field['field_type']] ?? null;

                echo json_encode([
                    'success' => true,
                    'data' => $field,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List fields
                $sql = "SELECT * FROM custom_fields WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];

                if ($entityType) {
                    $sql .= " AND entity_type = :entity_type";
                    $params['entity_type'] = $entityType;
                }

                $sql .= " ORDER BY sort_order ASC, label_ro ASC";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($fields as &$f) {
                    $f['options'] = json_decode($f['options'] ?? '[]', true);
                    $f['validation'] = json_decode($f['validation'] ?? '{}', true);
                    $f['entity_type_label'] = $entityTypes[$f['entity_type']] ?? null;
                    $f['field_type_label'] = $fieldTypes[$f['field_type']] ?? null;
                }

                // Group by entity type
                $grouped = [];
                foreach ($fields as $f) {
                    $type = $f['entity_type'];
                    if (!isset($grouped[$type])) {
                        $grouped[$type] = [
                            'entity_type' => $type,
                            'label' => $entityTypes[$type] ?? ['ro' => $type, 'en' => $type],
                            'fields' => [],
                        ];
                    }
                    $grouped[$type]['fields'][] = $f;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'fields' => $fields,
                        'grouped' => array_values($grouped),
                        'entity_types' => $entityTypes,
                        'field_types' => $fieldTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a crea câmpuri personalizate',
                    'error' => 'You do not have permission to create custom fields'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $entityType = $input['entity_type'] ?? null;
            $fieldType = $input['field_type'] ?? null;
            $labelRo = $input['label_ro'] ?? null;
            $labelEn = $input['label_en'] ?? null;
            $fieldKey = $input['field_key'] ?? null;

            if (!$entityType || !$fieldType || !$labelRo) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tipul entității, tipul câmpului și eticheta sunt obligatorii',
                    'error' => 'Entity type, field type, and label are required'
                ]);
                exit;
            }

            if (!isset($entityTypes[$entityType])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tip de entitate invalid',
                    'error' => 'Invalid entity type'
                ]);
                exit;
            }

            if (!isset($fieldTypes[$fieldType])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tip de câmp invalid',
                    'error' => 'Invalid field type'
                ]);
                exit;
            }

            // Generate field key if not provided
            if (!$fieldKey) {
                $fieldKey = 'custom_' . preg_replace('/[^a-z0-9_]/', '', strtolower($labelRo));
            }

            // Check for duplicate key
            $stmt = $db->prepare("SELECT id FROM custom_fields WHERE company_id = :company_id AND entity_type = :entity_type AND field_key = :field_key");
            $stmt->execute(['company_id' => $companyId, 'entity_type' => $entityType, 'field_key' => $fieldKey]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Cheia câmpului există deja',
                    'error' => 'Field key already exists'
                ]);
                exit;
            }

            $fieldId = 'cf_' . bin2hex(random_bytes(8));
            $stmt = $db->prepare("
                INSERT INTO custom_fields (
                    id, company_id, entity_type, field_type, field_key, label_ro, label_en,
                    placeholder_ro, placeholder_en, description_ro, description_en,
                    options, validation, default_value, is_required, is_searchable,
                    is_visible_in_list, sort_order, created_at
                ) VALUES (
                    :id, :company_id, :entity_type, :field_type, :field_key, :label_ro, :label_en,
                    :placeholder_ro, :placeholder_en, :description_ro, :description_en,
                    :options, :validation, :default_value, :is_required, :is_searchable,
                    :is_visible_in_list, :sort_order, NOW()
                )
            ");
            $stmt->execute([
                'id' => $fieldId,
                'company_id' => $companyId,
                'entity_type' => $entityType,
                'field_type' => $fieldType,
                'field_key' => $fieldKey,
                'label_ro' => $labelRo,
                'label_en' => $labelEn ?? $labelRo,
                'placeholder_ro' => $input['placeholder_ro'] ?? null,
                'placeholder_en' => $input['placeholder_en'] ?? null,
                'description_ro' => $input['description_ro'] ?? null,
                'description_en' => $input['description_en'] ?? null,
                'options' => json_encode($input['options'] ?? []),
                'validation' => json_encode($input['validation'] ?? []),
                'default_value' => $input['default_value'] ?? null,
                'is_required' => ($input['is_required'] ?? false) ? 1 : 0,
                'is_searchable' => ($input['is_searchable'] ?? true) ? 1 : 0,
                'is_visible_in_list' => ($input['is_visible_in_list'] ?? true) ? 1 : 0,
                'sort_order' => $input['sort_order'] ?? 0,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Câmp personalizat creat',
                'message_en' => 'Custom field created',
                'data' => ['id' => $fieldId, 'field_key' => $fieldKey],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a modifica câmpuri personalizate',
                    'error' => 'You do not have permission to modify custom fields'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $fieldId = $input['id'] ?? null;

            if (!$fieldId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify exists
            $stmt = $db->prepare("SELECT id FROM custom_fields WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $fieldId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Custom field not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $fieldId];

            $allowedFields = ['label_ro', 'label_en', 'placeholder_ro', 'placeholder_en', 'description_ro', 'description_en', 'default_value', 'is_required', 'is_searchable', 'is_visible_in_list', 'sort_order'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = is_bool($input[$field]) ? ($input[$field] ? 1 : 0) : $input[$field];
                }
            }

            if (isset($input['options'])) {
                $updates[] = "options = :options";
                $params['options'] = json_encode($input['options']);
            }
            if (isset($input['validation'])) {
                $updates[] = "validation = :validation";
                $params['validation'] = json_encode($input['validation']);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE custom_fields SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Câmp personalizat actualizat',
                'message_en' => 'Custom field updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a șterge câmpuri personalizate',
                    'error' => 'You do not have permission to delete custom fields'
                ]);
                exit;
            }

            $fieldId = $_GET['id'] ?? null;

            if (!$fieldId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify exists
            $stmt = $db->prepare("SELECT id, field_key, entity_type FROM custom_fields WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $fieldId, 'company_id' => $companyId]);
            $field = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$field) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Custom field not found']);
                exit;
            }

            // Delete field values first
            $db->prepare("DELETE FROM custom_field_values WHERE field_id = :field_id")->execute(['field_id' => $fieldId]);

            // Delete field
            $stmt = $db->prepare("DELETE FROM custom_fields WHERE id = :id");
            $stmt->execute(['id' => $fieldId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Câmp personalizat șters',
                'message_en' => 'Custom field deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
