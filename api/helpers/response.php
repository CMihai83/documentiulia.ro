<?php
/**
 * Response Helper Functions
 * Standard response formatting for API endpoints
 */

/**
 * Send a successful response
 */
function respondSuccess($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    exit;
}

/**
 * Send an error response
 */
function respondError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit;
}

/**
 * Send a created response
 */
function respondCreated($data, $message = 'Created successfully') {
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}

/**
 * Send a no content response
 */
function respondNoContent() {
    http_response_code(204);
    exit;
}

/**
 * Send a validation error response
 */
function respondValidationError($errors) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error' => 'Validation failed',
        'errors' => $errors
    ]);
    exit;
}
