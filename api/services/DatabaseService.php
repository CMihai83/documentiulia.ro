<?php
/**
 * DatabaseService - Wrapper for Database class
 * Provides backward compatibility for services using DatabaseService
 */

require_once __DIR__ . '/../config/database.php';

class DatabaseService {
    private static $instance = null;
    private $db;

    private function __construct() {
        $this->db = Database::getInstance();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->db->getConnection();
    }

    public function query($sql, $params = []) {
        return $this->db->query($sql, $params);
    }

    public function fetchOne($sql, $params = []) {
        return $this->db->fetchOne($sql, $params);
    }

    public function fetchAll($sql, $params = []) {
        return $this->db->fetchAll($sql, $params);
    }

    public function insert($table, $data) {
        return $this->db->insert($table, $data);
    }

    public function update($table, $data, $where) {
        return $this->db->update($table, $data, $where);
    }

    public function delete($table, $where, $params = []) {
        return $this->db->delete($table, $where, $params);
    }

    public function beginTransaction() {
        return $this->db->beginTransaction();
    }

    public function commit() {
        return $this->db->commit();
    }

    public function rollback() {
        return $this->db->rollback();
    }

    public function execute($sql, $params = []) {
        return $this->db->query($sql, $params);
    }
}
