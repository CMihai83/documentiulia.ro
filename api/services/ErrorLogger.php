<?php
/**
 * Centralized Error Logging Service
 * Logs errors to files and database with severity levels
 */

require_once __DIR__ . '/../config/Database.php';

class ErrorLogger {
    private static $instance = null;
    private $db;
    private $logDir;
    private $currentFile;

    // Severity levels
    const DEBUG = 'DEBUG';
    const INFO = 'INFO';
    const WARNING = 'WARNING';
    const ERROR = 'ERROR';
    const CRITICAL = 'CRITICAL';

    private function __construct() {
        $this->logDir = '/var/log/documentiulia';
        if (!is_dir($this->logDir)) {
            mkdir($this->logDir, 0755, true);
        }
        $this->currentFile = $this->logDir . '/app_' . date('Y-m-d') . '.log';

        try {
            $this->db = Database::getInstance()->getConnection();
        } catch (Exception $e) {
            $this->db = null;
        }
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Log a message
     */
    public function log(string $level, string $message, array $context = [], ?string $component = null): void {
        $entry = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'level' => $level,
            'component' => $component ?? $this->detectComponent(),
            'message' => $message,
            'context' => $context,
            'request' => $this->getRequestInfo(),
            'trace' => $level === self::ERROR || $level === self::CRITICAL ? $this->getBacktrace() : null
        ];

        // Always log to file
        $this->writeToFile($entry);

        // Log errors to database
        if (in_array($level, [self::ERROR, self::CRITICAL])) {
            $this->writeToDatabase($entry);
        }

        // Critical errors: send notification
        if ($level === self::CRITICAL) {
            $this->sendAlert($entry);
        }
    }

    /**
     * Shorthand methods
     */
    public function debug(string $message, array $context = [], ?string $component = null): void {
        $this->log(self::DEBUG, $message, $context, $component);
    }

    public function info(string $message, array $context = [], ?string $component = null): void {
        $this->log(self::INFO, $message, $context, $component);
    }

    public function warning(string $message, array $context = [], ?string $component = null): void {
        $this->log(self::WARNING, $message, $context, $component);
    }

    public function error(string $message, array $context = [], ?string $component = null): void {
        $this->log(self::ERROR, $message, $context, $component);
    }

    public function critical(string $message, array $context = [], ?string $component = null): void {
        $this->log(self::CRITICAL, $message, $context, $component);
    }

    /**
     * Log an exception
     */
    public function exception(Throwable $e, array $context = [], ?string $component = null): void {
        $context['exception'] = [
            'class' => get_class($e),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ];

        $this->error($e->getMessage(), $context, $component);
    }

    /**
     * Write log entry to file
     */
    private function writeToFile(array $entry): void {
        $line = sprintf(
            "[%s] [%s] [%s] %s %s\n",
            $entry['timestamp'],
            str_pad($entry['level'], 8),
            $entry['component'],
            $entry['message'],
            !empty($entry['context']) ? json_encode($entry['context']) : ''
        );

        file_put_contents($this->currentFile, $line, FILE_APPEND | LOCK_EX);
    }

    /**
     * Write error to database
     */
    private function writeToDatabase(array $entry): void {
        if (!$this->db) return;

        try {
            $stmt = $this->db->prepare("
                INSERT INTO error_logs (level, component, message, context, request_info, stack_trace, created_at)
                VALUES (:level, :component, :message, :context, :request, :trace, NOW())
            ");

            $stmt->execute([
                ':level' => $entry['level'],
                ':component' => $entry['component'],
                ':message' => substr($entry['message'], 0, 1000),
                ':context' => json_encode($entry['context']),
                ':request' => json_encode($entry['request']),
                ':trace' => $entry['trace']
            ]);
        } catch (Exception $e) {
            // Log DB error to file
            file_put_contents(
                $this->logDir . '/db_error.log',
                date('Y-m-d H:i:s') . " DB Log Error: " . $e->getMessage() . "\n",
                FILE_APPEND
            );
        }
    }

    /**
     * Send alert for critical errors
     */
    private function sendAlert(array $entry): void {
        // Log to critical file for monitoring
        file_put_contents(
            $this->logDir . '/critical.log',
            date('Y-m-d H:i:s') . " CRITICAL: {$entry['message']}\n",
            FILE_APPEND
        );

        // Could integrate with email/SMS/Slack here
    }

    /**
     * Get request information
     */
    private function getRequestInfo(): array {
        return [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
            'uri' => $_SERVER['REQUEST_URI'] ?? 'N/A',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'N/A',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'N/A',
        ];
    }

    /**
     * Detect calling component
     */
    private function detectComponent(): string {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 4);
        foreach ($trace as $frame) {
            if (isset($frame['file']) && strpos($frame['file'], 'ErrorLogger') === false) {
                $file = basename($frame['file'], '.php');
                return $file;
            }
        }
        return 'Unknown';
    }

    /**
     * Get formatted backtrace
     */
    private function getBacktrace(): string {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        $output = [];

        foreach (array_slice($trace, 2, 10) as $i => $frame) {
            $output[] = sprintf(
                "#%d %s:%d %s%s%s()",
                $i,
                $frame['file'] ?? 'unknown',
                $frame['line'] ?? 0,
                $frame['class'] ?? '',
                $frame['type'] ?? '',
                $frame['function'] ?? 'unknown'
            );
        }

        return implode("\n", $output);
    }

    /**
     * Get recent errors from database
     */
    public function getRecentErrors(int $limit = 50, ?string $level = null): array {
        if (!$this->db) return [];

        try {
            $sql = "SELECT * FROM error_logs";
            $params = [];

            if ($level) {
                $sql .= " WHERE level = :level";
                $params[':level'] = $level;
            }

            $sql .= " ORDER BY created_at DESC LIMIT :limit";

            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Clear old logs
     */
    public function cleanup(int $daysToKeep = 30): void {
        // Clean old log files
        $files = glob($this->logDir . '/app_*.log');
        $cutoff = strtotime("-{$daysToKeep} days");

        foreach ($files as $file) {
            if (filemtime($file) < $cutoff) {
                unlink($file);
            }
        }

        // Clean database
        if ($this->db) {
            try {
                $this->db->exec("DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '{$daysToKeep} days'");
            } catch (Exception $e) {
                // Ignore
            }
        }
    }
}

/**
 * Global error handler
 */
function documentiulia_error_handler($errno, $errstr, $errfile, $errline) {
    $logger = ErrorLogger::getInstance();

    $level = match($errno) {
        E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR => ErrorLogger::ERROR,
        E_WARNING, E_CORE_WARNING, E_COMPILE_WARNING, E_USER_WARNING => ErrorLogger::WARNING,
        E_NOTICE, E_USER_NOTICE => ErrorLogger::INFO,
        default => ErrorLogger::DEBUG
    };

    $logger->log($level, $errstr, [
        'errno' => $errno,
        'file' => $errfile,
        'line' => $errline
    ]);

    return false; // Continue with PHP's internal error handler
}

/**
 * Global exception handler
 */
function documentiulia_exception_handler($exception) {
    $logger = ErrorLogger::getInstance();
    $logger->exception($exception);
}

// Register handlers
set_error_handler('documentiulia_error_handler');
set_exception_handler('documentiulia_exception_handler');
