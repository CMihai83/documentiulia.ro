<?php
/**
 * Contact Management Service
 * Handles customers, vendors, employees
 */

require_once __DIR__ . '/../config/database.php';

class ContactService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Create a new contact
     */
    public function createContact($companyId, $data) {
        // Validate contact type
        $validTypes = ['customer', 'vendor', 'employee', 'contractor'];
        if (!in_array($data['contact_type'], $validTypes)) {
            throw new Exception('Invalid contact type');
        }

        $contactId = $this->db->insert('contacts', [
            'company_id' => $companyId,
            'contact_type' => $data['contact_type'],
            'display_name' => $data['display_name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'payment_terms' => $data['payment_terms'] ?? 30,
            'currency' => $data['currency'] ?? 'USD',
            'is_active' => true
        ]);

        return $this->getContact($contactId);
    }

    /**
     * Get contact by ID
     */
    public function getContact($contactId) {
        $contact = $this->db->fetchOne(
            "SELECT * FROM contacts WHERE id = :id",
            ['id' => $contactId]
        );

        if (!$contact) {
            throw new Exception('Contact not found');
        }

        return $contact;
    }

    /**
     * List contacts
     */
    public function listContacts($companyId, $filters = []) {
        $where = ['company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if (!empty($filters['contact_type'])) {
            $where[] = 'contact_type = :contact_type';
            $params['contact_type'] = $filters['contact_type'];
        }

        if (!empty($filters['is_active'])) {
            $where[] = 'is_active = :is_active';
            $params['is_active'] = $filters['is_active'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(display_name ILIKE :search OR email ILIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $limit = $filters['limit'] ?? 100;
        $offset = $filters['offset'] ?? 0;

        $sql = "SELECT * FROM contacts
                WHERE $whereClause
                ORDER BY display_name
                LIMIT :limit OFFSET :offset";

        $params['limit'] = $limit;
        $params['offset'] = $offset;

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Update contact
     */
    public function updateContact($contactId, $data) {
        $allowedFields = ['display_name', 'email', 'phone', 'payment_terms', 'currency', 'is_active'];
        $updateData = [];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (empty($updateData)) {
            throw new Exception('No valid fields to update');
        }

        $this->db->update('contacts', $updateData, "id = '$contactId'");
        return $this->getContact($contactId);
    }

    /**
     * Delete contact
     */
    public function deleteContact($contactId) {
        // Check if contact has any transactions
        $hasInvoices = $this->db->fetchOne(
            "SELECT COUNT(*) as count FROM invoices WHERE customer_id = :id",
            ['id' => $contactId]
        );

        $hasBills = $this->db->fetchOne(
            "SELECT COUNT(*) as count FROM bills WHERE vendor_id = :id",
            ['id' => $contactId]
        );

        if ($hasInvoices['count'] > 0 || $hasBills['count'] > 0) {
            // Soft delete - just mark as inactive
            $this->db->update('contacts', ['is_active' => false], "id = '$contactId'");
            return ['deleted' => false, 'message' => 'Contact marked as inactive (has transactions)'];
        }

        // Hard delete
        $this->db->delete('contacts', 'id = :id', ['id' => $contactId]);
        return ['deleted' => true, 'message' => 'Contact deleted successfully'];
    }
}
