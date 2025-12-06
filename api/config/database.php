<?php
/**
 * AccounTech AI - Database Configuration
 * Production-grade PostgreSQL connection
 */

class Database {
    private static $instance = null;
    private $connection;

    private $host = '127.0.0.1';
    private $port = '5432';
    private $database = 'accountech_production';
    private $username = 'accountech_app';
    private $password = 'AccTech2025Prod@Secure';

    private function __construct() {
        try {
            $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->database}";
            $this->connection = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => true
            ]);
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        // PostgreSQL uses $1, $2, $3 placeholders, but PDO expects ? or :name
        // Convert PostgreSQL-style $N placeholders to PDO question marks
        if (!empty($params) && preg_match('/\$\d+/', $sql)) {
            // Count occurrences of $N placeholders
            $convertedSql = preg_replace('/\$\d+/', '?', $sql);
            $stmt = $this->connection->prepare($convertedSql);

            // Bind parameters with proper types
            $values = array_values($params);
            foreach ($values as $index => $value) {
                $paramIndex = $index + 1; // PDO uses 1-based indexing
                if (is_bool($value)) {
                    $stmt->bindValue($paramIndex, $value, PDO::PARAM_BOOL);
                } elseif (is_int($value)) {
                    $stmt->bindValue($paramIndex, $value, PDO::PARAM_INT);
                } elseif (is_null($value)) {
                    $stmt->bindValue($paramIndex, $value, PDO::PARAM_NULL);
                } else {
                    $stmt->bindValue($paramIndex, $value, PDO::PARAM_STR);
                }
            }
            $stmt->execute();
        } else {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
        }
        return $stmt;
    }

    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }

    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }

    public function insert($table, $data) {
        $fields = array_keys($data);
        $placeholders = array_map(fn($f) => ":$f", $fields);

        $sql = "INSERT INTO $table (" . implode(', ', $fields) . ")
                VALUES (" . implode(', ', $placeholders) . ")
                RETURNING id";

        $stmt = $this->connection->prepare($sql);

        // Bind all parameters with correct types
        foreach ($data as $key => $value) {
            if (is_bool($value)) {
                $stmt->bindValue(":$key", $value, PDO::PARAM_BOOL);
            } elseif (is_int($value)) {
                $stmt->bindValue(":$key", $value, PDO::PARAM_INT);
            } elseif (is_null($value)) {
                $stmt->bindValue(":$key", $value, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(":$key", $value, PDO::PARAM_STR);
            }
        }

        $stmt->execute();
        return $stmt->fetch()['id'];
    }

    public function update($table, $data, $where) {
        $sets = array_map(fn($f) => "$f = :$f", array_keys($data));
        $sql = "UPDATE $table SET " . implode(', ', $sets) . " WHERE $where";

        $stmt = $this->connection->prepare($sql);
        return $stmt->execute($data);
    }

    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM $table WHERE $where";
        $stmt = $this->connection->prepare($sql);
        return $stmt->execute($params);
    }

    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }

    public function commit() {
        return $this->connection->commit();
    }

    public function rollback() {
        return $this->connection->rollback();
    }
}
