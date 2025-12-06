<?php
/**
 * Delivery Service
 * E4: Delivery/Logistics Module - Route Planning, Drivers, Vehicles, Packages
 */

class DeliveryService {
    private static ?DeliveryService $instance = null;
    private PDO $pdo;

    private function __construct() {
        $database = Database::getInstance();
        $this->pdo = $database->getConnection();
    }

    public static function getInstance(): DeliveryService {
        if (self::$instance === null) {
            self::$instance = new DeliveryService();
        }
        return self::$instance;
    }

    // ==================== ROUTES ====================

    /**
     * Create a new delivery route
     */
    public function createRoute(string $companyId, array $data): array {
        $id = $this->generateUuid();
        $routeNumber = $data['route_number'] ?? $this->generateRouteNumber($companyId);

        $stmt = $this->pdo->prepare("
            INSERT INTO delivery_routes (
                id, company_id, route_number, name, date, driver_id, vehicle_id,
                status, planned_start_time, planned_end_time, start_location_lat,
                start_location_lng, start_address, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $companyId,
            $routeNumber,
            $data['name'] ?? null,
            $data['date'],
            $data['driver_id'] ?? null,
            $data['vehicle_id'] ?? null,
            $data['status'] ?? 'planned',
            $data['planned_start_time'] ?? null,
            $data['planned_end_time'] ?? null,
            $data['start_location_lat'] ?? null,
            $data['start_location_lng'] ?? null,
            $data['start_address'] ?? null,
            $data['notes'] ?? null
        ]);

        return $this->getRoute($companyId, $id);
    }

    /**
     * Get a single route by ID
     */
    public function getRoute(string $companyId, string $routeId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT r.*,
                   d.first_name as driver_first_name, d.last_name as driver_last_name, d.phone as driver_phone,
                   v.registration_number, v.make as vehicle_make, v.model as vehicle_model
            FROM delivery_routes r
            LEFT JOIN drivers d ON r.driver_id = d.id
            LEFT JOIN vehicles v ON r.vehicle_id = v.id
            WHERE r.id = ? AND r.company_id = ?
        ");
        $stmt->execute([$routeId, $companyId]);
        $route = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($route) {
            $route['stops'] = $this->getRouteStops($routeId);
        }

        return $route ?: null;
    }

    /**
     * List routes with filters
     */
    public function listRoutes(string $companyId, array $filters = []): array {
        $where = ['r.company_id = ?'];
        $params = [$companyId];

        if (!empty($filters['date'])) {
            $where[] = 'r.date = ?';
            $params[] = $filters['date'];
        }

        if (!empty($filters['date_from'])) {
            $where[] = 'r.date >= ?';
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $where[] = 'r.date <= ?';
            $params[] = $filters['date_to'];
        }

        if (!empty($filters['driver_id'])) {
            $where[] = 'r.driver_id = ?';
            $params[] = $filters['driver_id'];
        }

        if (!empty($filters['vehicle_id'])) {
            $where[] = 'r.vehicle_id = ?';
            $params[] = $filters['vehicle_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'r.status = ?';
            $params[] = $filters['status'];
        }

        $limit = intval($filters['limit'] ?? 50);
        $offset = intval($filters['offset'] ?? 0);

        $sql = "
            SELECT r.*,
                   d.first_name as driver_first_name, d.last_name as driver_last_name,
                   v.registration_number, v.make as vehicle_make, v.model as vehicle_model
            FROM delivery_routes r
            LEFT JOIN drivers d ON r.driver_id = d.id
            LEFT JOIN vehicles v ON r.vehicle_id = v.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY r.date DESC, r.planned_start_time ASC
            LIMIT ? OFFSET ?
        ";

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update a route
     */
    public function updateRoute(string $companyId, string $routeId, array $data): array {
        $fields = [];
        $params = [];

        $allowedFields = [
            'name', 'date', 'driver_id', 'vehicle_id', 'status',
            'start_time', 'end_time', 'planned_start_time', 'planned_end_time',
            'start_location_lat', 'start_location_lng', 'start_address',
            'actual_distance_km', 'actual_duration_minutes', 'fuel_cost', 'notes'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return $this->getRoute($companyId, $routeId);
        }

        $fields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $routeId;
        $params[] = $companyId;

        $stmt = $this->pdo->prepare("
            UPDATE delivery_routes
            SET " . implode(', ', $fields) . "
            WHERE id = ? AND company_id = ?
        ");
        $stmt->execute($params);

        return $this->getRoute($companyId, $routeId);
    }

    /**
     * Delete a route
     */
    public function deleteRoute(string $companyId, string $routeId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM delivery_routes WHERE id = ? AND company_id = ?");
        $stmt->execute([$routeId, $companyId]);
        return $stmt->rowCount() > 0;
    }

    // ==================== ROUTE STOPS ====================

    /**
     * Add a stop to a route
     */
    public function addRouteStop(string $routeId, array $data): array {
        $id = $this->generateUuid();

        // Get next stop order
        $stmt = $this->pdo->prepare("SELECT COALESCE(MAX(stop_order), 0) + 1 FROM route_stops WHERE route_id = ?");
        $stmt->execute([$routeId]);
        $stopOrder = $data['stop_order'] ?? $stmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            INSERT INTO route_stops (
                id, route_id, stop_order, package_id, customer_name, address, city,
                postal_code, country, latitude, longitude, contact_phone, contact_name,
                delivery_notes, time_window_start, time_window_end, estimated_arrival
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $routeId,
            $stopOrder,
            $data['package_id'] ?? null,
            $data['customer_name'] ?? null,
            $data['address'],
            $data['city'] ?? null,
            $data['postal_code'] ?? null,
            $data['country'] ?? 'Romania',
            $data['latitude'] ?? null,
            $data['longitude'] ?? null,
            $data['contact_phone'] ?? null,
            $data['contact_name'] ?? null,
            $data['delivery_notes'] ?? null,
            $data['time_window_start'] ?? null,
            $data['time_window_end'] ?? null,
            $data['estimated_arrival'] ?? null
        ]);

        // Update route total stops
        $this->updateRouteStopCount($routeId);

        return $this->getRouteStop($id);
    }

    /**
     * Get route stops
     */
    public function getRouteStops(string $routeId): array {
        $stmt = $this->pdo->prepare("
            SELECT rs.*, p.tracking_number, p.package_type, p.weight_kg, p.cod_amount
            FROM route_stops rs
            LEFT JOIN packages p ON rs.package_id = p.id
            WHERE rs.route_id = ?
            ORDER BY rs.stop_order ASC
        ");
        $stmt->execute([$routeId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a single route stop
     */
    public function getRouteStop(string $stopId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM route_stops WHERE id = ?");
        $stmt->execute([$stopId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update a route stop
     */
    public function updateRouteStop(string $stopId, array $data): array {
        $fields = [];
        $params = [];

        $allowedFields = [
            'stop_order', 'customer_name', 'address', 'city', 'postal_code', 'country',
            'latitude', 'longitude', 'contact_phone', 'contact_name', 'delivery_notes',
            'time_window_start', 'time_window_end', 'estimated_arrival', 'actual_arrival',
            'status', 'failure_reason', 'signature_data', 'photo_proof', 'recipient_name',
            'delivery_confirmed_at'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return $this->getRouteStop($stopId);
        }

        $fields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $stopId;

        $stmt = $this->pdo->prepare("
            UPDATE route_stops SET " . implode(', ', $fields) . " WHERE id = ?
        ");
        $stmt->execute($params);

        // Update route completed stops count
        $stop = $this->getRouteStop($stopId);
        if ($stop) {
            $this->updateRouteStopCount($stop['route_id']);
        }

        return $this->getRouteStop($stopId);
    }

    /**
     * Delete a route stop
     */
    public function deleteRouteStop(string $stopId): bool {
        $stop = $this->getRouteStop($stopId);
        $stmt = $this->pdo->prepare("DELETE FROM route_stops WHERE id = ?");
        $stmt->execute([$stopId]);

        if ($stmt->rowCount() > 0 && $stop) {
            $this->updateRouteStopCount($stop['route_id']);
            return true;
        }
        return false;
    }

    /**
     * Reorder stops
     */
    public function reorderStops(string $routeId, array $stopOrder): bool {
        $this->pdo->beginTransaction();
        try {
            foreach ($stopOrder as $order => $stopId) {
                $stmt = $this->pdo->prepare("
                    UPDATE route_stops SET stop_order = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND route_id = ?
                ");
                $stmt->execute([$order + 1, $stopId, $routeId]);
            }
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Optimize route (simple nearest-neighbor algorithm)
     */
    public function optimizeRoute(string $companyId, string $routeId): array {
        $route = $this->getRoute($companyId, $routeId);
        if (!$route || empty($route['stops'])) {
            return $route;
        }

        $stops = $route['stops'];
        $optimized = [];
        $remaining = $stops;

        // Start from depot (first stop or route start location)
        $currentLat = $route['start_location_lat'] ?? ($stops[0]['latitude'] ?? 0);
        $currentLng = $route['start_location_lng'] ?? ($stops[0]['longitude'] ?? 0);

        while (!empty($remaining)) {
            $nearestIndex = 0;
            $nearestDistance = PHP_FLOAT_MAX;

            foreach ($remaining as $index => $stop) {
                $lat = floatval($stop['latitude'] ?? 0);
                $lng = floatval($stop['longitude'] ?? 0);

                if ($lat == 0 && $lng == 0) {
                    // No coordinates, add to end
                    continue;
                }

                $distance = $this->haversineDistance($currentLat, $currentLng, $lat, $lng);

                if ($distance < $nearestDistance) {
                    $nearestDistance = $distance;
                    $nearestIndex = $index;
                }
            }

            $nearest = $remaining[$nearestIndex];
            $optimized[] = $nearest['id'];
            $currentLat = floatval($nearest['latitude'] ?? $currentLat);
            $currentLng = floatval($nearest['longitude'] ?? $currentLng);

            array_splice($remaining, $nearestIndex, 1);
        }

        // Update stop order
        if (!empty($optimized)) {
            $this->reorderStops($routeId, $optimized);
        }

        // Calculate total distance
        $totalDistance = $this->calculateRouteDistance($companyId, $routeId);
        $this->updateRoute($companyId, $routeId, ['total_distance_km' => $totalDistance]);

        return $this->getRoute($companyId, $routeId);
    }

    /**
     * Calculate total route distance
     */
    public function calculateRouteDistance(string $companyId, string $routeId): float {
        $route = $this->getRoute($companyId, $routeId);
        if (!$route || empty($route['stops'])) {
            return 0;
        }

        $totalDistance = 0;
        $prevLat = floatval($route['start_location_lat'] ?? 0);
        $prevLng = floatval($route['start_location_lng'] ?? 0);

        foreach ($route['stops'] as $stop) {
            $lat = floatval($stop['latitude'] ?? 0);
            $lng = floatval($stop['longitude'] ?? 0);

            if ($lat != 0 && $lng != 0) {
                if ($prevLat != 0 && $prevLng != 0) {
                    $totalDistance += $this->haversineDistance($prevLat, $prevLng, $lat, $lng);
                }
                $prevLat = $lat;
                $prevLng = $lng;
            }
        }

        return round($totalDistance, 2);
    }

    // ==================== DRIVERS ====================

    /**
     * Create a driver
     */
    public function createDriver(string $companyId, array $data): array {
        $id = $this->generateUuid();

        $stmt = $this->pdo->prepare("
            INSERT INTO drivers (
                id, company_id, user_id, first_name, last_name, phone, email,
                license_number, license_type, license_expiry, medical_certificate_expiry,
                employment_type, hourly_rate, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $companyId,
            $data['user_id'] ?? null,
            $data['first_name'],
            $data['last_name'],
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['license_number'] ?? null,
            $data['license_type'] ?? null,
            $data['license_expiry'] ?? null,
            $data['medical_certificate_expiry'] ?? null,
            $data['employment_type'] ?? 'full_time',
            $data['hourly_rate'] ?? null,
            $data['status'] ?? 'active',
            $data['notes'] ?? null
        ]);

        return $this->getDriver($companyId, $id);
    }

    /**
     * Get a driver by ID
     */
    public function getDriver(string $companyId, string $driverId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM drivers WHERE id = ? AND company_id = ?
        ");
        $stmt->execute([$driverId, $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List drivers
     */
    public function listDrivers(string $companyId, array $filters = []): array {
        $where = ['company_id = ?'];
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $where[] = "(first_name ILIKE ? OR last_name ILIKE ? OR phone ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM drivers
            WHERE " . implode(' AND ', $where) . "
            ORDER BY first_name, last_name
        ");
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update a driver
     */
    public function updateDriver(string $companyId, string $driverId, array $data): array {
        $fields = [];
        $params = [];

        $allowedFields = [
            'first_name', 'last_name', 'phone', 'email', 'license_number',
            'license_type', 'license_expiry', 'medical_certificate_expiry',
            'employment_type', 'hourly_rate', 'status', 'notes'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return $this->getDriver($companyId, $driverId);
        }

        $fields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $driverId;
        $params[] = $companyId;

        $stmt = $this->pdo->prepare("
            UPDATE drivers SET " . implode(', ', $fields) . " WHERE id = ? AND company_id = ?
        ");
        $stmt->execute($params);

        return $this->getDriver($companyId, $driverId);
    }

    /**
     * Delete a driver
     */
    public function deleteDriver(string $companyId, string $driverId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM drivers WHERE id = ? AND company_id = ?");
        $stmt->execute([$driverId, $companyId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Get available drivers for a date
     */
    public function getAvailableDrivers(string $companyId, string $date): array {
        $stmt = $this->pdo->prepare("
            SELECT d.* FROM drivers d
            WHERE d.company_id = ? AND d.status = 'active'
            AND d.id NOT IN (
                SELECT driver_id FROM delivery_routes
                WHERE company_id = ? AND date = ? AND driver_id IS NOT NULL
                AND status NOT IN ('completed', 'cancelled')
            )
            ORDER BY d.first_name, d.last_name
        ");
        $stmt->execute([$companyId, $companyId, $date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ==================== VEHICLES ====================

    /**
     * Create a vehicle
     */
    public function createVehicle(string $companyId, array $data): array {
        $id = $this->generateUuid();

        $stmt = $this->pdo->prepare("
            INSERT INTO vehicles (
                id, company_id, registration_number, make, model, year, vehicle_type,
                capacity_kg, capacity_volume, fuel_type, avg_consumption,
                itp_expiry, insurance_expiry, rca_expiry, casco_expiry,
                status, current_mileage, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $companyId,
            $data['registration_number'],
            $data['make'] ?? null,
            $data['model'] ?? null,
            $data['year'] ?? null,
            $data['vehicle_type'] ?? 'van',
            $data['capacity_kg'] ?? null,
            $data['capacity_volume'] ?? null,
            $data['fuel_type'] ?? 'diesel',
            $data['avg_consumption'] ?? null,
            $data['itp_expiry'] ?? null,
            $data['insurance_expiry'] ?? null,
            $data['rca_expiry'] ?? null,
            $data['casco_expiry'] ?? null,
            $data['status'] ?? 'available',
            $data['current_mileage'] ?? 0,
            $data['notes'] ?? null
        ]);

        return $this->getVehicle($companyId, $id);
    }

    /**
     * Get a vehicle by ID
     */
    public function getVehicle(string $companyId, string $vehicleId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM vehicles WHERE id = ? AND company_id = ?");
        $stmt->execute([$vehicleId, $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List vehicles
     */
    public function listVehicles(string $companyId, array $filters = []): array {
        $where = ['company_id = ?'];
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['vehicle_type'])) {
            $where[] = 'vehicle_type = ?';
            $params[] = $filters['vehicle_type'];
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM vehicles
            WHERE " . implode(' AND ', $where) . "
            ORDER BY registration_number
        ");
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update a vehicle
     */
    public function updateVehicle(string $companyId, string $vehicleId, array $data): array {
        $fields = [];
        $params = [];

        $allowedFields = [
            'registration_number', 'make', 'model', 'year', 'vehicle_type',
            'capacity_kg', 'capacity_volume', 'fuel_type', 'avg_consumption',
            'itp_expiry', 'insurance_expiry', 'rca_expiry', 'casco_expiry',
            'status', 'current_mileage', 'notes'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return $this->getVehicle($companyId, $vehicleId);
        }

        $fields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $vehicleId;
        $params[] = $companyId;

        $stmt = $this->pdo->prepare("
            UPDATE vehicles SET " . implode(', ', $fields) . " WHERE id = ? AND company_id = ?
        ");
        $stmt->execute($params);

        return $this->getVehicle($companyId, $vehicleId);
    }

    /**
     * Delete a vehicle
     */
    public function deleteVehicle(string $companyId, string $vehicleId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM vehicles WHERE id = ? AND company_id = ?");
        $stmt->execute([$vehicleId, $companyId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Get available vehicles for a date
     */
    public function getAvailableVehicles(string $companyId, string $date): array {
        $stmt = $this->pdo->prepare("
            SELECT v.* FROM vehicles v
            WHERE v.company_id = ? AND v.status = 'available'
            AND v.id NOT IN (
                SELECT vehicle_id FROM delivery_routes
                WHERE company_id = ? AND date = ? AND vehicle_id IS NOT NULL
                AND status NOT IN ('completed', 'cancelled')
            )
            ORDER BY v.registration_number
        ");
        $stmt->execute([$companyId, $companyId, $date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get vehicles with expiring documents
     */
    public function getVehiclesWithExpiringDocuments(string $companyId, int $daysAhead = 30): array {
        $expiryDate = date('Y-m-d', strtotime("+{$daysAhead} days"));

        $stmt = $this->pdo->prepare("
            SELECT *,
                CASE
                    WHEN itp_expiry <= ? THEN 'itp'
                    WHEN rca_expiry <= ? THEN 'rca'
                    WHEN insurance_expiry <= ? THEN 'insurance'
                    WHEN casco_expiry <= ? THEN 'casco'
                END as expiring_document,
                LEAST(
                    COALESCE(itp_expiry, '9999-12-31'),
                    COALESCE(rca_expiry, '9999-12-31'),
                    COALESCE(insurance_expiry, '9999-12-31'),
                    COALESCE(casco_expiry, '9999-12-31')
                ) as nearest_expiry
            FROM vehicles
            WHERE company_id = ?
            AND (itp_expiry <= ? OR rca_expiry <= ? OR insurance_expiry <= ? OR casco_expiry <= ?)
            ORDER BY nearest_expiry ASC
        ");
        $stmt->execute([
            $expiryDate, $expiryDate, $expiryDate, $expiryDate,
            $companyId,
            $expiryDate, $expiryDate, $expiryDate, $expiryDate
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ==================== HELPER METHODS ====================

    private function generateUuid(): string {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    private function generateRouteNumber(string $companyId): string {
        $date = date('Ymd');
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM delivery_routes
            WHERE company_id = ? AND route_number LIKE ?
        ");
        $stmt->execute([$companyId, "RT-{$date}-%"]);
        $count = $stmt->fetchColumn() + 1;

        return "RT-{$date}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
    }

    private function updateRouteStopCount(string $routeId): void {
        $stmt = $this->pdo->prepare("
            UPDATE delivery_routes SET
                total_stops = (SELECT COUNT(*) FROM route_stops WHERE route_id = ?),
                completed_stops = (SELECT COUNT(*) FROM route_stops WHERE route_id = ? AND status = 'completed'),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$routeId, $routeId, $routeId]);
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    private function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float {
        $earthRadius = 6371; // km

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon/2) * sin($dLon/2);

        $c = 2 * atan2(sqrt($a), sqrt(1-$a));

        return $earthRadius * $c;
    }

    // ==================== PACKAGES ====================

    /**
     * Create a package
     */
    public function createPackage(string $companyId, array $data): array {
        $id = $this->generateUuid();
        $trackingNumber = $data['tracking_number'] ?? $this->generateTrackingNumber($companyId);

        $stmt = $this->pdo->prepare("
            INSERT INTO packages (
                id, company_id, tracking_number, order_reference, sender_name,
                sender_address, sender_phone, recipient_name, recipient_address,
                recipient_city, recipient_postal_code, recipient_country,
                recipient_phone, recipient_email, recipient_latitude, recipient_longitude,
                weight_kg, dimensions_length, dimensions_width, dimensions_height,
                package_type, contents_description, declared_value, cod_amount,
                status, priority, delivery_date, delivery_time_window_start,
                delivery_time_window_end, special_instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $companyId,
            $trackingNumber,
            $data['order_reference'] ?? null,
            $data['sender_name'] ?? null,
            $data['sender_address'] ?? null,
            $data['sender_phone'] ?? null,
            $data['recipient_name'],
            $data['recipient_address'],
            $data['recipient_city'] ?? null,
            $data['recipient_postal_code'] ?? null,
            $data['recipient_country'] ?? 'Romania',
            $data['recipient_phone'] ?? null,
            $data['recipient_email'] ?? null,
            $data['recipient_latitude'] ?? null,
            $data['recipient_longitude'] ?? null,
            $data['weight_kg'] ?? null,
            $data['dimensions_length'] ?? null,
            $data['dimensions_width'] ?? null,
            $data['dimensions_height'] ?? null,
            $data['package_type'] ?? 'parcel',
            $data['contents_description'] ?? null,
            $data['declared_value'] ?? null,
            $data['cod_amount'] ?? null,
            $data['status'] ?? 'created',
            $data['priority'] ?? 'normal',
            $data['delivery_date'] ?? null,
            $data['delivery_time_window_start'] ?? null,
            $data['delivery_time_window_end'] ?? null,
            $data['special_instructions'] ?? null
        ]);

        // Add initial status to history
        $this->addPackageStatusHistory($id, 'created', 'Package created');

        return $this->getPackage($companyId, $id);
    }

    /**
     * Get a package by ID
     */
    public function getPackage(string $companyId, string $packageId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT p.*, r.route_number, r.date as route_date,
                   d.first_name as driver_first_name, d.last_name as driver_last_name
            FROM packages p
            LEFT JOIN delivery_routes r ON p.route_id = r.id
            LEFT JOIN drivers d ON r.driver_id = d.id
            WHERE p.id = ? AND p.company_id = ?
        ");
        $stmt->execute([$packageId, $companyId]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($package) {
            $package['status_history'] = $this->getPackageStatusHistory($packageId);
        }

        return $package ?: null;
    }

    /**
     * Get a package by ID only (for public portal APIs)
     */
    public function getPackageById(string $packageId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT p.*, r.route_number, r.date as route_date,
                   d.first_name as driver_first_name, d.last_name as driver_last_name
            FROM packages p
            LEFT JOIN delivery_routes r ON p.route_id = r.id
            LEFT JOIN drivers d ON r.driver_id = d.id
            WHERE p.id = ?
        ");
        $stmt->execute([$packageId]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($package) {
            $package['status_history'] = $this->getPackageStatusHistory($packageId);
        }

        return $package ?: null;
    }

    /**
     * Get package by tracking number (public tracking)
     */
    public function getPackageByTracking(string $trackingNumber): ?array {
        $stmt = $this->pdo->prepare("
            SELECT id, tracking_number, status, recipient_city, recipient_country,
                   package_type, delivered_at, created_at
            FROM packages WHERE tracking_number = ?
        ");
        $stmt->execute([$trackingNumber]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($package) {
            $package['status_history'] = $this->getPackageStatusHistory($package['id'], true);
        }

        return $package ?: null;
    }

    /**
     * List packages
     */
    public function listPackages(string $companyId, array $filters = []): array {
        $where = ['p.company_id = ?'];
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $where[] = 'p.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['route_id'])) {
            $where[] = 'p.route_id = ?';
            $params[] = $filters['route_id'];
        }

        if (!empty($filters['delivery_date'])) {
            $where[] = 'p.delivery_date = ?';
            $params[] = $filters['delivery_date'];
        }

        if (!empty($filters['priority'])) {
            $where[] = 'p.priority = ?';
            $params[] = $filters['priority'];
        }

        if (!empty($filters['search'])) {
            $where[] = "(p.tracking_number ILIKE ? OR p.recipient_name ILIKE ? OR p.recipient_address ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        if (!empty($filters['unassigned'])) {
            $where[] = 'p.route_id IS NULL';
        }

        $limit = intval($filters['limit'] ?? 50);
        $offset = intval($filters['offset'] ?? 0);

        $sql = "
            SELECT p.*, r.route_number, r.date as route_date
            FROM packages p
            LEFT JOIN delivery_routes r ON p.route_id = r.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        ";

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update a package
     */
    public function updatePackage(string $companyId, string $packageId, array $data): array {
        $fields = [];
        $params = [];

        $allowedFields = [
            'order_reference', 'recipient_name', 'recipient_address', 'recipient_city',
            'recipient_postal_code', 'recipient_country', 'recipient_phone', 'recipient_email',
            'recipient_latitude', 'recipient_longitude', 'weight_kg', 'dimensions_length',
            'dimensions_width', 'dimensions_height', 'package_type', 'contents_description',
            'declared_value', 'cod_amount', 'status', 'priority', 'delivery_date',
            'delivery_time_window_start', 'delivery_time_window_end', 'special_instructions',
            'route_id', 'delivered_at', 'delivery_photo', 'delivery_signature'
        ];

        $oldPackage = $this->getPackage($companyId, $packageId);
        $oldStatus = $oldPackage['status'] ?? null;

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return $this->getPackage($companyId, $packageId);
        }

        $fields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $packageId;
        $params[] = $companyId;

        $stmt = $this->pdo->prepare("
            UPDATE packages SET " . implode(', ', $fields) . " WHERE id = ? AND company_id = ?
        ");
        $stmt->execute($params);

        // Add status change to history if status changed
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            $this->addPackageStatusHistory($packageId, $data['status'], $data['status_notes'] ?? null);
        }

        return $this->getPackage($companyId, $packageId);
    }

    /**
     * Delete a package
     */
    public function deletePackage(string $companyId, string $packageId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM packages WHERE id = ? AND company_id = ?");
        $stmt->execute([$packageId, $companyId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Assign packages to route
     */
    public function assignPackagesToRoute(string $companyId, string $routeId, array $packageIds): int {
        $count = 0;
        foreach ($packageIds as $packageId) {
            $stmt = $this->pdo->prepare("
                UPDATE packages SET route_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ? AND route_id IS NULL
            ");
            $stmt->execute([$routeId, $packageId, $companyId]);
            if ($stmt->rowCount() > 0) {
                $this->addPackageStatusHistory($packageId, 'assigned', "Assigned to route $routeId");
                $count++;
            }
        }
        return $count;
    }

    /**
     * Mark package as delivered
     */
    public function markPackageDelivered(string $packageId, array $data = []): array {
        $stmt = $this->pdo->prepare("
            UPDATE packages SET
                status = 'delivered',
                delivered_at = CURRENT_TIMESTAMP,
                delivery_photo = ?,
                delivery_signature = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([
            $data['photo'] ?? null,
            $data['signature'] ?? null,
            $packageId
        ]);

        $this->addPackageStatusHistory($packageId, 'delivered', $data['notes'] ?? 'Package delivered', $data['latitude'] ?? null, $data['longitude'] ?? null);

        // Get company ID for return
        $stmt = $this->pdo->prepare("SELECT company_id FROM packages WHERE id = ?");
        $stmt->execute([$packageId]);
        $companyId = $stmt->fetchColumn();

        return $this->getPackage($companyId, $packageId);
    }

    /**
     * Mark package delivery as failed
     */
    public function markPackageFailed(string $packageId, string $reason, array $data = []): array {
        $stmt = $this->pdo->prepare("
            UPDATE packages SET
                status = 'failed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$packageId]);

        $this->addPackageStatusHistory($packageId, 'failed', $reason, $data['latitude'] ?? null, $data['longitude'] ?? null);

        $stmt = $this->pdo->prepare("SELECT company_id FROM packages WHERE id = ?");
        $stmt->execute([$packageId]);
        $companyId = $stmt->fetchColumn();

        return $this->getPackage($companyId, $packageId);
    }

    /**
     * Add status to package history
     */
    public function addPackageStatusHistory(string $packageId, string $status, ?string $notes = null, ?float $latitude = null, ?float $longitude = null, ?string $userId = null): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO package_status_history (id, package_id, status, notes, latitude, longitude, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $this->generateUuid(),
            $packageId,
            $status,
            $notes,
            $latitude,
            $longitude,
            $userId
        ]);
    }

    /**
     * Get package status history
     */
    public function getPackageStatusHistory(string $packageId, bool $publicView = false): array {
        $columns = $publicView
            ? "status, created_at"
            : "status, notes, latitude, longitude, created_at";

        $stmt = $this->pdo->prepare("
            SELECT $columns FROM package_status_history
            WHERE package_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$packageId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get package statistics
     */
    public function getPackageStats(string $companyId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $where = ['company_id = ?'];
        $params = [$companyId];

        if ($dateFrom) {
            $where[] = 'created_at >= ?';
            $params[] = $dateFrom;
        }

        if ($dateTo) {
            $where[] = 'created_at <= ?';
            $params[] = $dateTo . ' 23:59:59';
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'created') as created,
                COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
                COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
                COUNT(*) FILTER (WHERE status = 'out_for_delivery') as out_for_delivery,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status = 'returned') as returned,
                COALESCE(SUM(cod_amount) FILTER (WHERE status = 'delivered'), 0) as total_cod_collected
            FROM packages WHERE $whereClause
        ");
        $stmt->execute($params);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Generate tracking number
     */
    private function generateTrackingNumber(string $companyId): string {
        $prefix = 'PKG';
        $date = date('ymd');
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM packages
            WHERE company_id = ? AND tracking_number LIKE ?
        ");
        $stmt->execute([$companyId, "{$prefix}{$date}%"]);
        $count = $stmt->fetchColumn() + 1;

        return $prefix . $date . str_pad($count, 5, '0', STR_PAD_LEFT);
    }

    // ==================== FLEET MANAGEMENT ====================

    /**
     * Add maintenance record
     */
    public function addMaintenanceRecord(string $vehicleId, array $data): array {
        $id = $this->generateUuid();

        $stmt = $this->pdo->prepare("
            INSERT INTO vehicle_maintenance (
                id, vehicle_id, maintenance_type, description, date,
                mileage_at_service, cost, vendor, next_service_date,
                next_service_mileage, invoice_number, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $vehicleId,
            $data['maintenance_type'],
            $data['description'] ?? null,
            $data['date'],
            $data['mileage_at_service'] ?? null,
            $data['cost'] ?? null,
            $data['vendor'] ?? null,
            $data['next_service_date'] ?? null,
            $data['next_service_mileage'] ?? null,
            $data['invoice_number'] ?? null,
            $data['notes'] ?? null
        ]);

        // Update vehicle mileage if provided
        if (!empty($data['mileage_at_service'])) {
            $stmt = $this->pdo->prepare("
                UPDATE vehicles SET current_mileage = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND current_mileage < ?
            ");
            $stmt->execute([$data['mileage_at_service'], $vehicleId, $data['mileage_at_service']]);
        }

        return $this->getMaintenanceRecord($id);
    }

    /**
     * Get maintenance record
     */
    public function getMaintenanceRecord(string $recordId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM vehicle_maintenance WHERE id = ?");
        $stmt->execute([$recordId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get vehicle maintenance history
     */
    public function getVehicleMaintenanceHistory(string $vehicleId, ?int $limit = 50): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM vehicle_maintenance
            WHERE vehicle_id = ?
            ORDER BY date DESC
            LIMIT ?
        ");
        $stmt->execute([$vehicleId, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get upcoming maintenance
     */
    public function getUpcomingMaintenance(string $companyId, int $daysAhead = 30): array {
        $futureDate = date('Y-m-d', strtotime("+{$daysAhead} days"));

        $stmt = $this->pdo->prepare("
            SELECT vm.*, v.registration_number, v.make, v.model
            FROM vehicle_maintenance vm
            JOIN vehicles v ON vm.vehicle_id = v.id
            WHERE v.company_id = ?
            AND vm.next_service_date IS NOT NULL
            AND vm.next_service_date <= ?
            ORDER BY vm.next_service_date ASC
        ");
        $stmt->execute([$companyId, $futureDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Add fuel log
     */
    public function addFuelLog(string $vehicleId, array $data): array {
        $id = $this->generateUuid();

        $totalCost = isset($data['quantity_liters']) && isset($data['price_per_liter'])
            ? $data['quantity_liters'] * $data['price_per_liter']
            : ($data['total_cost'] ?? null);

        $stmt = $this->pdo->prepare("
            INSERT INTO vehicle_fuel_logs (
                id, vehicle_id, driver_id, date, quantity_liters,
                price_per_liter, total_cost, mileage, fuel_station, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $vehicleId,
            $data['driver_id'] ?? null,
            $data['date'],
            $data['quantity_liters'],
            $data['price_per_liter'] ?? null,
            $totalCost,
            $data['mileage'] ?? null,
            $data['fuel_station'] ?? null,
            $data['notes'] ?? null
        ]);

        // Update vehicle mileage if provided
        if (!empty($data['mileage'])) {
            $stmt = $this->pdo->prepare("
                UPDATE vehicles SET current_mileage = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND current_mileage < ?
            ");
            $stmt->execute([$data['mileage'], $vehicleId, $data['mileage']]);
        }

        return $this->getFuelLog($id);
    }

    /**
     * Get fuel log
     */
    public function getFuelLog(string $logId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM vehicle_fuel_logs WHERE id = ?");
        $stmt->execute([$logId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get vehicle fuel history
     */
    public function getVehicleFuelHistory(string $vehicleId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $where = ['vehicle_id = ?'];
        $params = [$vehicleId];

        if ($dateFrom) {
            $where[] = 'date >= ?';
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $where[] = 'date <= ?';
            $params[] = $dateTo;
        }

        $stmt = $this->pdo->prepare("
            SELECT vfl.*, d.first_name as driver_first_name, d.last_name as driver_last_name
            FROM vehicle_fuel_logs vfl
            LEFT JOIN drivers d ON vfl.driver_id = d.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY date DESC
        ");
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get vehicle cost report
     */
    public function getVehicleCostReport(string $companyId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $dateFilter = '';
        $params = [$companyId];

        if ($dateFrom && $dateTo) {
            $dateFilter = "AND date BETWEEN ? AND ?";
            $params[] = $dateFrom;
            $params[] = $dateTo;
        }

        $stmt = $this->pdo->prepare("
            SELECT
                v.id,
                v.registration_number,
                v.make,
                v.model,
                v.current_mileage,
                COALESCE(m.maintenance_cost, 0) as total_maintenance_cost,
                COALESCE(m.maintenance_count, 0) as maintenance_count,
                COALESCE(f.fuel_cost, 0) as total_fuel_cost,
                COALESCE(f.fuel_liters, 0) as total_fuel_liters,
                COALESCE(f.fuel_count, 0) as fuel_entries,
                COALESCE(m.maintenance_cost, 0) + COALESCE(f.fuel_cost, 0) as total_cost
            FROM vehicles v
            LEFT JOIN (
                SELECT vehicle_id,
                       SUM(cost) as maintenance_cost,
                       COUNT(*) as maintenance_count
                FROM vehicle_maintenance
                WHERE 1=1 $dateFilter
                GROUP BY vehicle_id
            ) m ON v.id = m.vehicle_id
            LEFT JOIN (
                SELECT vehicle_id,
                       SUM(total_cost) as fuel_cost,
                       SUM(quantity_liters) as fuel_liters,
                       COUNT(*) as fuel_count
                FROM vehicle_fuel_logs
                WHERE 1=1 $dateFilter
                GROUP BY vehicle_id
            ) f ON v.id = f.vehicle_id
            WHERE v.company_id = ?
            ORDER BY total_cost DESC
        ");

        // Adjust params for the subqueries
        $finalParams = [];
        if ($dateFrom && $dateTo) {
            $finalParams = [$dateFrom, $dateTo, $dateFrom, $dateTo, $companyId];
        } else {
            $finalParams = [$companyId];
        }

        $stmt->execute($finalParams);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get vehicle fuel efficiency
     */
    public function getVehicleFuelEfficiency(string $vehicleId): array {
        // Get last 10 fuel logs with mileage to calculate efficiency
        $stmt = $this->pdo->prepare("
            SELECT date, quantity_liters, mileage
            FROM vehicle_fuel_logs
            WHERE vehicle_id = ? AND mileage IS NOT NULL
            ORDER BY date DESC
            LIMIT 10
        ");
        $stmt->execute([$vehicleId]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($logs) < 2) {
            return [
                'avg_consumption' => null,
                'total_distance' => null,
                'total_fuel' => null,
                'data_points' => count($logs)
            ];
        }

        $totalFuel = 0;
        $startMileage = null;
        $endMileage = null;

        foreach ($logs as $i => $log) {
            if ($i === 0) {
                $endMileage = $log['mileage'];
            }
            if ($i === count($logs) - 1) {
                $startMileage = $log['mileage'];
            }
            if ($i > 0) {
                $totalFuel += $log['quantity_liters'];
            }
        }

        $distance = $endMileage - $startMileage;
        $avgConsumption = $distance > 0 ? ($totalFuel / $distance) * 100 : null;

        return [
            'avg_consumption' => $avgConsumption ? round($avgConsumption, 2) : null,
            'total_distance' => $distance,
            'total_fuel' => round($totalFuel, 2),
            'data_points' => count($logs),
            'period_start' => $logs[count($logs) - 1]['date'],
            'period_end' => $logs[0]['date']
        ];
    }

    /**
     * Get fleet summary
     */
    public function getFleetSummary(string $companyId): array {
        // Vehicle counts by status
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_vehicles,
                COUNT(*) FILTER (WHERE status = 'available') as available,
                COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
                COUNT(*) FILTER (WHERE status = 'maintenance') as in_maintenance,
                COUNT(*) FILTER (WHERE status = 'retired') as retired
            FROM vehicles WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $vehicleStats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Expiring documents count
        $expiryDate = date('Y-m-d', strtotime('+30 days'));
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as expiring_documents
            FROM vehicles
            WHERE company_id = ?
            AND (itp_expiry <= ? OR rca_expiry <= ? OR insurance_expiry <= ?)
        ");
        $stmt->execute([$companyId, $expiryDate, $expiryDate, $expiryDate]);
        $expiringDocs = $stmt->fetchColumn();

        // Monthly costs (current month)
        $monthStart = date('Y-m-01');
        $monthEnd = date('Y-m-t');

        $stmt = $this->pdo->prepare("
            SELECT COALESCE(SUM(cost), 0) as maintenance_cost
            FROM vehicle_maintenance vm
            JOIN vehicles v ON vm.vehicle_id = v.id
            WHERE v.company_id = ? AND vm.date BETWEEN ? AND ?
        ");
        $stmt->execute([$companyId, $monthStart, $monthEnd]);
        $maintenanceCost = $stmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT COALESCE(SUM(total_cost), 0) as fuel_cost
            FROM vehicle_fuel_logs vfl
            JOIN vehicles v ON vfl.vehicle_id = v.id
            WHERE v.company_id = ? AND vfl.date BETWEEN ? AND ?
        ");
        $stmt->execute([$companyId, $monthStart, $monthEnd]);
        $fuelCost = $stmt->fetchColumn();

        return [
            'vehicles' => $vehicleStats,
            'expiring_documents' => intval($expiringDocs),
            'monthly_costs' => [
                'maintenance' => floatval($maintenanceCost),
                'fuel' => floatval($fuelCost),
                'total' => floatval($maintenanceCost) + floatval($fuelCost),
                'period' => $monthStart . ' to ' . $monthEnd
            ]
        ];
    }

    // ==================== DRIVER PERFORMANCE ====================

    /**
     * Record a delivery performance entry for a driver
     * Uses existing table schema: driver_performance
     */
    public function recordDeliveryPerformance(string $driverId, string $routeId, array $data): array {
        $id = $this->generateUuid();
        $date = $data['date'] ?? date('Y-m-d');

        // Check if record for this driver/date already exists (UPSERT)
        $stmt = $this->pdo->prepare("
            INSERT INTO driver_performance (
                id, driver_id, date, routes_completed, deliveries_completed,
                deliveries_failed, on_time_deliveries, total_distance_km,
                total_hours_worked, fuel_consumed, average_rating, customer_complaints
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (driver_id, date) DO UPDATE SET
                routes_completed = driver_performance.routes_completed + EXCLUDED.routes_completed,
                deliveries_completed = driver_performance.deliveries_completed + EXCLUDED.deliveries_completed,
                deliveries_failed = driver_performance.deliveries_failed + EXCLUDED.deliveries_failed,
                on_time_deliveries = driver_performance.on_time_deliveries + EXCLUDED.on_time_deliveries,
                total_distance_km = driver_performance.total_distance_km + EXCLUDED.total_distance_km,
                total_hours_worked = driver_performance.total_hours_worked + EXCLUDED.total_hours_worked,
                fuel_consumed = driver_performance.fuel_consumed + EXCLUDED.fuel_consumed,
                customer_complaints = driver_performance.customer_complaints + EXCLUDED.customer_complaints
            RETURNING *
        ");

        $hoursWorked = isset($data['total_time_minutes']) ? $data['total_time_minutes'] / 60 : ($data['total_hours_worked'] ?? 0);

        $stmt->execute([
            $id,
            $driverId,
            $date,
            1, // routes_completed
            $data['deliveries_completed'] ?? 0,
            $data['failed_deliveries'] ?? $data['deliveries_failed'] ?? 0,
            $data['on_time_deliveries'] ?? 0,
            $data['total_distance_km'] ?? 0,
            $hoursWorked,
            $data['fuel_consumed'] ?? 0,
            $data['average_rating'] ?? null,
            $data['customer_complaints'] ?? 0
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['id' => $id];
    }

    /**
     * Get a specific performance record
     */
    public function getPerformanceRecord(string $recordId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT dp.*,
                   d.first_name, d.last_name, d.phone
            FROM driver_performance dp
            JOIN drivers d ON dp.driver_id = d.id
            WHERE dp.id = ?
        ");
        $stmt->execute([$recordId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get driver performance history
     */
    public function getDriverPerformanceHistory(string $driverId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $where = ['dp.driver_id = ?'];
        $params = [$driverId];

        if ($dateFrom) {
            $where[] = 'dp.date >= ?';
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $where[] = 'dp.date <= ?';
            $params[] = $dateTo;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->pdo->prepare("
            SELECT dp.*
            FROM driver_performance dp
            WHERE $whereClause
            ORDER BY dp.date DESC
            LIMIT 100
        ");
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get driver performance metrics summary
     */
    public function getDriverMetrics(string $driverId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $where = ['dp.driver_id = ?'];
        $params = [$driverId];

        if ($dateFrom) {
            $where[] = 'dp.date >= ?';
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $where[] = 'dp.date <= ?';
            $params[] = $dateTo;
        }

        $whereClause = implode(' AND ', $where);

        // Get aggregated metrics using existing columns
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_days,
                COALESCE(SUM(deliveries_completed), 0) as total_deliveries,
                COALESCE(SUM(deliveries_failed), 0) as total_failed,
                COALESCE(SUM(on_time_deliveries), 0) as total_on_time,
                COALESCE(SUM(total_distance_km), 0) as total_distance,
                COALESCE(SUM(total_hours_worked), 0) as total_hours,
                COALESCE(SUM(fuel_consumed), 0) as total_fuel,
                COALESCE(AVG(average_rating), 0) as avg_rating,
                COALESCE(SUM(customer_complaints), 0) as total_complaints,
                COALESCE(SUM(routes_completed), 0) as total_routes
            FROM driver_performance dp
            WHERE $whereClause
        ");
        $stmt->execute($params);
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get driver info directly
        $stmt = $this->pdo->prepare("SELECT * FROM drivers WHERE id = ?");
        $stmt->execute([$driverId]);
        $driver = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate derived metrics
        $totalDeliveries = intval($metrics['total_deliveries']);
        $totalFailed = intval($metrics['total_failed']);
        $totalAttempted = $totalDeliveries + $totalFailed;
        $totalOnTime = intval($metrics['total_on_time']);

        $completionRate = $totalAttempted > 0
            ? round(($totalDeliveries / $totalAttempted) * 100, 2)
            : 0;

        $onTimeRate = $totalDeliveries > 0
            ? round(($totalOnTime / $totalDeliveries) * 100, 2)
            : 0;

        // Get average customer rating from feedback
        $stmt = $this->pdo->prepare("
            SELECT AVG(df.rating) as avg_rating, COUNT(*) as total_ratings
            FROM delivery_feedback df
            WHERE df.driver_id = ?
        ");
        $stmt->execute([$driverId]);
        $ratingData = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'driver' => $driver,
            'period' => [
                'from' => $dateFrom ?? 'all time',
                'to' => $dateTo ?? 'now'
            ],
            'summary' => [
                'total_working_days' => intval($metrics['total_days']),
                'total_deliveries_completed' => $totalDeliveries,
                'total_deliveries_attempted' => $totalAttempted,
                'completion_rate' => $completionRate,
                'on_time_rate' => $onTimeRate,
                'total_distance_km' => floatval($metrics['total_distance']),
                'total_hours_worked' => floatval($metrics['total_hours']),
                'total_routes' => intval($metrics['total_routes'])
            ],
            'quality' => [
                'on_time_deliveries' => $totalOnTime,
                'late_deliveries' => $totalDeliveries - $totalOnTime,
                'failed_deliveries' => $totalFailed,
                'customer_complaints' => intval($metrics['total_complaints'])
            ],
            'ratings' => [
                'average_rating' => round(floatval($ratingData['avg_rating'] ?? $metrics['avg_rating'] ?? 0), 2),
                'total_ratings' => intval($ratingData['total_ratings'] ?? 0)
            ],
            'efficiency' => [
                'avg_delivery_time_minutes' => $totalDeliveries > 0 && floatval($metrics['total_hours']) > 0
                    ? round((floatval($metrics['total_hours']) * 60) / $totalDeliveries, 2)
                    : 0,
                'fuel_efficiency' => floatval($metrics['total_distance']) > 0
                    ? round(floatval($metrics['total_fuel']) / floatval($metrics['total_distance']) * 100, 2)
                    : 0,
                'deliveries_per_day' => intval($metrics['total_days']) > 0
                    ? round($totalDeliveries / intval($metrics['total_days']), 2)
                    : 0
            ]
        ];
    }

    /**
     * Get all drivers performance leaderboard
     */
    public function getDriverLeaderboard(string $companyId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $where = ['d.company_id = ?'];
        $params = [$companyId];

        $dateFilter = '';
        if ($dateFrom) {
            $dateFilter .= ' AND dp.date >= ?';
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $dateFilter .= ' AND dp.date <= ?';
            $params[] = $dateTo;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->pdo->prepare("
            SELECT
                d.id as driver_id,
                d.first_name,
                d.last_name,
                d.status,
                COUNT(dp.id) as working_days,
                COALESCE(SUM(dp.deliveries_completed), 0) as total_deliveries,
                COALESCE(SUM(dp.on_time_deliveries), 0) as on_time_deliveries,
                COALESCE(SUM(dp.deliveries_completed) + SUM(dp.deliveries_failed), 0) as attempted,
                COALESCE(AVG(dp.average_rating), 0) as avg_rating,
                CASE
                    WHEN COALESCE(SUM(dp.deliveries_completed), 0) > 0
                    THEN ROUND(COALESCE(SUM(dp.on_time_deliveries), 0)::numeric / SUM(dp.deliveries_completed) * 100, 2)
                    ELSE 0
                END as on_time_rate,
                CASE
                    WHEN COALESCE(SUM(dp.deliveries_completed) + SUM(dp.deliveries_failed), 0) > 0
                    THEN ROUND(COALESCE(SUM(dp.deliveries_completed), 0)::numeric / (SUM(dp.deliveries_completed) + SUM(dp.deliveries_failed)) * 100, 2)
                    ELSE 0
                END as completion_rate
            FROM drivers d
            LEFT JOIN driver_performance dp ON d.id = dp.driver_id $dateFilter
            WHERE $whereClause
            GROUP BY d.id, d.first_name, d.last_name, d.status
            ORDER BY total_deliveries DESC, on_time_rate DESC
        ");
        $stmt->execute($params);

        $drivers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add ranking
        $rank = 1;
        foreach ($drivers as &$driver) {
            $driver['rank'] = $rank++;
            $driver['avg_rating'] = round(floatval($driver['avg_rating']), 2);
        }

        return $drivers;
    }

    /**
     * Get company-wide delivery performance summary
     */
    public function getCompanyPerformanceSummary(string $companyId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $params = [$companyId];
        $dateFilter = '';

        if ($dateFrom) {
            $dateFilter .= ' AND dp.date >= ?';
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $dateFilter .= ' AND dp.date <= ?';
            $params[] = $dateTo;
        }

        // Get overall metrics using existing columns
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(DISTINCT dp.driver_id) as active_drivers,
                COUNT(DISTINCT dp.date) as working_days,
                COALESCE(SUM(dp.deliveries_completed), 0) as total_deliveries,
                COALESCE(SUM(dp.deliveries_failed), 0) as total_failed,
                COALESCE(SUM(dp.on_time_deliveries), 0) as on_time_deliveries,
                COALESCE(SUM(dp.total_distance_km), 0) as total_distance,
                COALESCE(SUM(dp.customer_complaints), 0) as total_complaints,
                COALESCE(SUM(dp.total_hours_worked), 0) as total_hours
            FROM driver_performance dp
            JOIN drivers d ON dp.driver_id = d.id
            WHERE d.company_id = ? $dateFilter
        ");
        $stmt->execute($params);
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get average rating from feedback
        $stmt = $this->pdo->prepare("
            SELECT AVG(df.rating) as avg_rating, COUNT(*) as total_ratings
            FROM delivery_feedback df
            JOIN drivers d ON df.driver_id = d.id
            WHERE d.company_id = ?
        ");
        $stmt->execute([$companyId]);
        $ratingData = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate rates
        $totalDeliveries = intval($metrics['total_deliveries']);
        $totalFailed = intval($metrics['total_failed']);
        $totalAttempted = $totalDeliveries + $totalFailed;
        $onTimeDeliveries = intval($metrics['on_time_deliveries']);

        $completionRate = $totalAttempted > 0
            ? round(($totalDeliveries / $totalAttempted) * 100, 2)
            : 0;

        $onTimeRate = $totalDeliveries > 0
            ? round(($onTimeDeliveries / $totalDeliveries) * 100, 2)
            : 0;

        // Get daily trends (last 7 days)
        $weekAgo = date('Y-m-d', strtotime('-7 days'));
        $stmt = $this->pdo->prepare("
            SELECT
                dp.date,
                SUM(dp.deliveries_completed) as deliveries,
                SUM(dp.on_time_deliveries) as on_time
            FROM driver_performance dp
            JOIN drivers d ON dp.driver_id = d.id
            WHERE d.company_id = ? AND dp.date >= ?
            GROUP BY dp.date
            ORDER BY dp.date
        ");
        $stmt->execute([$companyId, $weekAgo]);
        $dailyTrends = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'period' => [
                'from' => $dateFrom ?? 'all time',
                'to' => $dateTo ?? 'now'
            ],
            'overview' => [
                'active_drivers' => intval($metrics['active_drivers']),
                'working_days' => intval($metrics['working_days']),
                'total_deliveries' => $totalDeliveries,
                'total_attempted' => $totalAttempted,
                'total_distance_km' => floatval($metrics['total_distance']),
                'total_hours' => floatval($metrics['total_hours'])
            ],
            'rates' => [
                'completion_rate' => $completionRate,
                'on_time_rate' => $onTimeRate,
                'failure_rate' => $totalAttempted > 0
                    ? round(($totalFailed / $totalAttempted) * 100, 2)
                    : 0
            ],
            'quality' => [
                'on_time_deliveries' => $onTimeDeliveries,
                'late_deliveries' => $totalDeliveries - $onTimeDeliveries,
                'failed_deliveries' => $totalFailed,
                'customer_complaints' => intval($metrics['total_complaints'])
            ],
            'customer_satisfaction' => [
                'average_rating' => round(floatval($ratingData['avg_rating'] ?? 0), 2),
                'total_ratings' => intval($ratingData['total_ratings'] ?? 0)
            ],
            'daily_trends' => $dailyTrends
        ];
    }

    /**
     * Add customer feedback for a delivery
     * Uses existing table schema: delivery_feedback
     */
    public function addDeliveryFeedback(string $driverId, string $packageId, array $data): array {
        $id = $this->generateUuid();

        $stmt = $this->pdo->prepare("
            INSERT INTO delivery_feedback (
                id, package_id, driver_id, rating, feedback_text,
                feedback_type, issues
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        // Convert issues array to PostgreSQL array format
        $issues = isset($data['issues']) && is_array($data['issues'])
            ? '{' . implode(',', array_map(function($i) { return '"' . $i . '"'; }, $data['issues'])) . '}'
            : null;

        $stmt->execute([
            $id,
            $packageId,
            $driverId,
            $data['rating'],
            $data['comments'] ?? $data['feedback_text'] ?? null,
            $data['feedback_type'] ?? 'delivery',
            $issues
        ]);

        return $this->getDeliveryFeedback($id);
    }

    /**
     * Get delivery feedback by ID
     */
    public function getDeliveryFeedback(string $feedbackId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT df.*,
                   p.tracking_number,
                   d.first_name as driver_first_name, d.last_name as driver_last_name
            FROM delivery_feedback df
            LEFT JOIN packages p ON df.package_id = p.id
            LEFT JOIN drivers d ON df.driver_id = d.id
            WHERE df.id = ?
        ");
        $stmt->execute([$feedbackId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all feedback for a driver
     */
    public function getDriverFeedback(string $driverId, int $limit = 50): array {
        $stmt = $this->pdo->prepare("
            SELECT df.*,
                   p.tracking_number
            FROM delivery_feedback df
            LEFT JOIN packages p ON df.package_id = p.id
            WHERE df.driver_id = ?
            ORDER BY df.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$driverId, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Calculate and update driver performance score
     */
    public function calculateDriverScore(string $driverId): array {
        $metrics = $this->getDriverMetrics($driverId);

        // Calculate composite score (0-100)
        $weights = [
            'completion_rate' => 0.25,
            'on_time_rate' => 0.25,
            'customer_rating' => 0.30,
            'efficiency' => 0.20
        ];

        // Normalize metrics to 0-100 scale
        $completionScore = $metrics['summary']['completion_rate'];
        $onTimeScore = $metrics['summary']['on_time_rate'];
        $ratingScore = ($metrics['ratings']['average_rating'] / 5) * 100;

        // Efficiency score based on deliveries per day (assuming 20 is excellent)
        $efficiencyScore = min(100, ($metrics['efficiency']['deliveries_per_day'] / 20) * 100);

        $compositeScore = round(
            ($completionScore * $weights['completion_rate']) +
            ($onTimeScore * $weights['on_time_rate']) +
            ($ratingScore * $weights['customer_rating']) +
            ($efficiencyScore * $weights['efficiency']),
            2
        );

        // Determine performance tier
        $tier = 'needs_improvement';
        if ($compositeScore >= 90) $tier = 'exceptional';
        elseif ($compositeScore >= 80) $tier = 'excellent';
        elseif ($compositeScore >= 70) $tier = 'good';
        elseif ($compositeScore >= 60) $tier = 'satisfactory';

        return [
            'driver_id' => $driverId,
            'composite_score' => $compositeScore,
            'tier' => $tier,
            'breakdown' => [
                'completion_score' => round($completionScore, 2),
                'on_time_score' => round($onTimeScore, 2),
                'customer_rating_score' => round($ratingScore, 2),
                'efficiency_score' => round($efficiencyScore, 2)
            ],
            'weights' => $weights,
            'calculated_at' => date('Y-m-d H:i:s')
        ];
    }

    // ==================== CUSTOMER PORTAL ====================

    /**
     * Get customer delivery history by phone number or email
     */
    public function getCustomerDeliveryHistory(string $identifier, int $limit = 20): array {
        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   dr.date as route_date,
                   d.first_name as driver_first_name, d.last_name as driver_last_name,
                   d.phone as driver_phone
            FROM packages p
            LEFT JOIN delivery_routes dr ON p.route_id = dr.id
            LEFT JOIN drivers d ON dr.driver_id = d.id
            WHERE p.recipient_phone = ? OR p.recipient_email = ?
            ORDER BY p.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$identifier, $identifier, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get customer's active deliveries (in transit)
     */
    public function getCustomerActiveDeliveries(string $identifier): array {
        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   dr.date as route_date, dr.status as route_status,
                   d.first_name as driver_first_name, d.last_name as driver_last_name,
                   d.phone as driver_phone,
                   v.registration_number as vehicle_registration
            FROM packages p
            LEFT JOIN delivery_routes dr ON p.route_id = dr.id
            LEFT JOIN drivers d ON dr.driver_id = d.id
            LEFT JOIN vehicles v ON dr.vehicle_id = v.id
            WHERE (p.recipient_phone = ? OR p.recipient_email = ?)
            AND p.status IN ('pending', 'created', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery')
            ORDER BY p.delivery_date ASC
        ");
        $stmt->execute([$identifier, $identifier]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update delivery preferences for a customer
     */
    public function updateDeliveryPreferences(string $packageId, array $preferences): array {
        // Get the package (using public method without company ID)
        $package = $this->getPackageById($packageId);
        if (!$package) {
            throw new Exception('Package not found');
        }

        // Update delivery preferences
        $updates = [];
        $params = [];

        if (isset($preferences['delivery_instructions'])) {
            $updates[] = 'delivery_instructions = ?';
            $params[] = $preferences['delivery_instructions'];
        }
        if (isset($preferences['leave_at_door'])) {
            $updates[] = 'leave_at_door = ?';
            $params[] = $preferences['leave_at_door'] ? 't' : 'f';
        }
        if (isset($preferences['signature_required'])) {
            $updates[] = 'signature_required = ?';
            $params[] = $preferences['signature_required'] ? 't' : 'f';
        }
        if (isset($preferences['preferred_time_from'])) {
            $updates[] = 'preferred_time_from = ?';
            $params[] = $preferences['preferred_time_from'];
        }
        if (isset($preferences['preferred_time_to'])) {
            $updates[] = 'preferred_time_to = ?';
            $params[] = $preferences['preferred_time_to'];
        }
        if (isset($preferences['safe_place'])) {
            $updates[] = 'safe_place = ?';
            $params[] = $preferences['safe_place'];
        }

        if (empty($updates)) {
            return $package;
        }

        $params[] = $packageId;
        $updateClause = implode(', ', $updates);

        $stmt = $this->pdo->prepare("UPDATE packages SET $updateClause WHERE id = ?");
        $stmt->execute($params);

        // Log the preference update
        $this->addPackageStatusHistory($packageId, $package['status'], 'Delivery preferences updated');

        return $this->getPackageById($packageId);
    }

    /**
     * Get estimated delivery time for a package
     */
    public function getDeliveryEstimate(string $packageId): array {
        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   rs.stop_order, rs.estimated_arrival,
                   rs.status as stop_status,
                   dr.status as route_status,
                   dr.start_time,
                   dr.planned_start_time,
                   d.first_name as driver_first_name, d.last_name as driver_last_name,
                   d.phone as driver_phone,
                   (
                       SELECT COUNT(*)
                       FROM route_stops
                       WHERE route_id = dr.id AND stop_order < COALESCE(rs.stop_order, 0) AND status != 'completed'
                   ) as stops_before
            FROM packages p
            LEFT JOIN delivery_routes dr ON p.route_id = dr.id
            LEFT JOIN route_stops rs ON rs.route_id = dr.id AND rs.package_id = p.id
            LEFT JOIN drivers d ON dr.driver_id = d.id
            WHERE p.id = ?
        ");
        $stmt->execute([$packageId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            throw new Exception('Package not found');
        }

        // Calculate estimate
        $estimate = [
            'package_id' => $packageId,
            'tracking_number' => $data['tracking_number'],
            'current_status' => $data['status'],
            'route_status' => $data['route_status'] ?? 'not_assigned'
        ];

        if ($data['estimated_arrival']) {
            $estimate['estimated_arrival'] = $data['estimated_arrival'];
            $estimate['stops_remaining'] = intval($data['stops_before']);
        }

        if ($data['route_status'] === 'in_progress' && $data['driver_first_name']) {
            $estimate['driver'] = [
                'name' => $data['driver_first_name'] . ' ' . $data['driver_last_name'],
                'phone' => $data['driver_phone']
            ];
        }

        // Add status message
        $statusMessages = [
            'created' => 'Your package has been created and is being prepared',
            'pending' => 'Your package is being processed',
            'assigned' => 'Your package has been assigned for delivery',
            'picked_up' => 'Your package has been picked up by the driver',
            'in_transit' => 'Your package is on its way',
            'out_for_delivery' => 'Your package is out for delivery',
            'delivered' => 'Your package has been delivered',
            'failed' => 'Delivery attempt was unsuccessful',
            'cancelled' => 'Your package delivery has been cancelled'
        ];
        $estimate['status_message'] = $statusMessages[$data['status']] ?? 'Status unknown';

        return $estimate;
    }

    /**
     * Request delivery reschedule
     */
    public function requestReschedule(string $packageId, array $data): array {
        $package = $this->getPackageById($packageId);
        if (!$package) {
            throw new Exception('Package not found');
        }

        if ($package['status'] === 'delivered') {
            throw new Exception('Cannot reschedule a delivered package');
        }

        $id = $this->generateUuid();

        // Create reschedule request
        $stmt = $this->pdo->prepare("
            INSERT INTO delivery_reschedule_requests (
                id, package_id, requested_date, requested_time_from, requested_time_to,
                reason, contact_phone, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        ");

        $stmt->execute([
            $id,
            $packageId,
            $data['requested_date'] ?? null,
            $data['requested_time_from'] ?? null,
            $data['requested_time_to'] ?? null,
            $data['reason'] ?? null,
            $data['contact_phone'] ?? $package['recipient_phone']
        ]);

        // Log the request
        $this->addPackageStatusHistory($packageId, $package['status'], 'Reschedule requested for ' . ($data['requested_date'] ?? 'new date'));

        return [
            'request_id' => $id,
            'package_id' => $packageId,
            'status' => 'pending',
            'message' => 'Your reschedule request has been submitted. We will contact you shortly.'
        ];
    }

    /**
     * Get delivery notifications for a customer
     */
    public function getCustomerNotifications(string $identifier, int $limit = 50): array {
        $stmt = $this->pdo->prepare("
            SELECT psh.*,
                   p.tracking_number,
                   p.recipient_name
            FROM package_status_history psh
            JOIN packages p ON psh.package_id = p.id
            WHERE p.recipient_phone = ? OR p.recipient_email = ?
            ORDER BY psh.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$identifier, $identifier, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Subscribe to delivery updates
     */
    public function subscribeToUpdates(string $packageId, array $data): array {
        $package = $this->getPackageById($packageId);
        if (!$package) {
            throw new Exception('Package not found');
        }

        $id = $this->generateUuid();

        // Store subscription
        $stmt = $this->pdo->prepare("
            INSERT INTO delivery_subscriptions (
                id, package_id, notification_type, contact_value, is_active, created_at
            ) VALUES (?, ?, ?, ?, true, NOW())
            ON CONFLICT (package_id, notification_type, contact_value)
            DO UPDATE SET is_active = true
        ");

        $notificationType = $data['notification_type'] ?? 'sms';
        $contactValue = $data['contact_value'] ?? ($notificationType === 'email' ? $package['recipient_email'] : $package['recipient_phone']);

        $stmt->execute([
            $id,
            $packageId,
            $notificationType,
            $contactValue
        ]);

        return [
            'subscription_id' => $id,
            'package_id' => $packageId,
            'notification_type' => $notificationType,
            'contact' => $contactValue,
            'message' => 'You will receive ' . $notificationType . ' notifications for this delivery'
        ];
    }

    /**
     * Customer portal summary - single endpoint to get all relevant data
     */
    public function getCustomerPortalSummary(string $identifier): array {
        return [
            'active_deliveries' => $this->getCustomerActiveDeliveries($identifier),
            'recent_deliveries' => $this->getCustomerDeliveryHistory($identifier, 5),
            'notifications' => $this->getCustomerNotifications($identifier, 10)
        ];
    }
}
