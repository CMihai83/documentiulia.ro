<?php
/**
 * Centralized Error Handler
 * Provides consistent error responses across the API
 */

class ErrorHandler {
    /**
     * Handle exceptions and return consistent JSON error response
     */
    public static function handleException($e, $defaultStatus = 400) {
        // Log the error
        error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());

        // Determine HTTP status code
        $statusCode = $defaultStatus;

        if ($e instanceof ValidationException) {
            $statusCode = 422; // Unprocessable Entity
        } elseif ($e instanceof UnauthorizedException) {
            $statusCode = 401;
        } elseif ($e instanceof ForbiddenException) {
            $statusCode = 403;
        } elseif ($e instanceof NotFoundException) {
            $statusCode = 404;
        } elseif ($e instanceof DatabaseException) {
            $statusCode = 500;
            // Don't expose database errors to clients in production
            $message = 'An error occurred while processing your request';
        } else {
            $message = $e->getMessage();
        }

        http_response_code($statusCode);

        $response = [
            'success' => false,
            'error' => $message ?? $e->getMessage(),
            'error_code' => get_class($e)
        ];

        // Add validation errors if available
        if ($e instanceof ValidationException && method_exists($e, 'getErrors')) {
            $response['validation_errors'] = $e->getErrors();
        }

        // Add trace in development mode
        if (getenv('APP_ENV') === 'development') {
            $response['trace'] = $e->getTraceAsString();
        }

        echo json_encode($response);
        exit;
    }

    /**
     * Validate required fields
     */
    public static function validateRequired($data, $requiredFields) {
        $missing = [];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            throw new ValidationException('Missing required fields: ' . implode(', ', $missing), $missing);
        }
    }

    /**
     * Validate UUID format
     */
    public static function validateUUID($value, $fieldName = 'id') {
        $pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

        if (!preg_match($pattern, $value)) {
            throw new ValidationException("Invalid UUID format for $fieldName");
        }
    }

    /**
     * Sanitize input
     */
    public static function sanitize($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitize'], $data);
        }

        if (is_string($data)) {
            return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
        }

        return $data;
    }
}

/**
 * Custom Exception Classes
 */
class ValidationException extends Exception {
    private $errors = [];

    public function __construct($message, $errors = []) {
        parent::__construct($message);
        $this->errors = $errors;
    }

    public function getErrors() {
        return $this->errors;
    }
}

class UnauthorizedException extends Exception {}
class ForbiddenException extends Exception {}
class NotFoundException extends Exception {}
class DatabaseException extends Exception {}
