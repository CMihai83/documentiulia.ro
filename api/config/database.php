<?php
/**
 * AccounTech AI - Database Configuration
 * Production-grade PostgreSQL connection
 */

class Database {
    private static $instance = null;
    private $connection;

    private $host = 'localhost';
    private $port = '5432';
    private $database = 'accountech_production';
    private $username = 'postgres';
    private $password = '';  // Will be set via environment variable

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
        $stmt = $this->connection->prepare($sql);
        $stmt->execute($params);
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
        $stmt->execute($data);
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
