<?php
/**
 * Comprehensive API Test Suite
 * Tests all Time Tracking module endpoints
 *
 * Usage: php tests/api_test_suite.php
 */

require_once __DIR__ . '/../api/config/database.php';

class APITestSuite {
    private $baseUrl = 'http://127.0.0.1';
    private $token = null;
    private $companyId = null;
    private $testResults = [];
    private $testData = [];

    public function __construct() {
        echo "\n🧪 API Test Suite - Time Tracking Module\n";
        echo "==========================================\n\n";
    }

    private function request($method, $endpoint, $data = null, $headers = []) {
        $url = $this->baseUrl . $endpoint;
        $ch = curl_init($url);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        $defaultHeaders = [
            'Content-Type: application/json',
            'Host: documentiulia.ro'
        ];

        if ($this->token) {
            $defaultHeaders[] = 'Authorization: Bearer ' . $this->token;
        }

        if ($this->companyId) {
            $defaultHeaders[] = 'X-Company-ID: ' . $this->companyId;
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($defaultHeaders, $headers));

        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [
            'code' => $httpCode,
            'body' => json_decode($response, true)
        ];
    }

    private function test($name, $callback) {
        echo "Testing: $name ... ";
        try {
            $result = $callback();
            if ($result) {
                echo "✅ PASS\n";
                $this->testResults[] = ['name' => $name, 'status' => 'pass'];
                return true;
            } else {
                echo "❌ FAIL\n";
                $this->testResults[] = ['name' => $name, 'status' => 'fail'];
                return false;
            }
        } catch (Exception $e) {
            echo "❌ ERROR: " . $e->getMessage() . "\n";
            $this->testResults[] = ['name' => $name, 'status' => 'error', 'message' => $e->getMessage()];
            return false;
        }
    }

    public function setup() {
        echo "📋 Setup Phase\n";
        echo "--------------\n";

        // Login to get token
        $this->test('Login and get auth token', function() {
            $response = $this->request('POST', '/api/v1/auth/login.php', [
                'email' => 'test_admin@accountech.com',
                'password' => 'TestPass123!'
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->token = $response['body']['data']['token'];
                return true;
            }
            return false;
        });

        // Get company ID
        $this->test('Get company context', function() {
            // Use a known test company ID
            $db = Database::getInstance();
            $company = $db->fetchOne("SELECT id FROM companies LIMIT 1");
            if ($company) {
                $this->companyId = $company['id'];
                return true;
            }
            return false;
        });

        echo "\n";
    }

    public function testTimeEntries() {
        echo "📝 Time Entries API Tests\n";
        echo "-------------------------\n";

        // Create time entry
        $this->test('Create time entry', function() {
            $db = Database::getInstance();
            $employee = $db->fetchOne("SELECT id FROM employees WHERE company_id = $1 LIMIT 1", [$this->companyId]);

            if (!$employee) {
                throw new Exception('No employees found');
            }

            $response = $this->request('POST', '/api/v1/time/entries.php', [
                'employee_id' => $employee['id'],
                'entry_date' => date('Y-m-d'),
                'hours' => 8.0,
                'description' => 'API Test Entry',
                'is_billable' => true,
                'tags' => ['test', 'api']
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['time_entry_id'] = $response['body']['data']['entry_id'];
                $this->testData['employee_id'] = $employee['id'];
                return true;
            }
            return false;
        });

        // List time entries
        $this->test('List time entries', function() {
            $response = $this->request('GET', '/api/v1/time/entries.php?limit=10');
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Get single time entry
        $this->test('Get single time entry', function() {
            if (!isset($this->testData['time_entry_id'])) {
                throw new Exception('No time entry ID available');
            }

            $response = $this->request('GET', '/api/v1/time/entries.php?id=' . $this->testData['time_entry_id']);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Update time entry
        $this->test('Update time entry', function() {
            if (!isset($this->testData['time_entry_id'])) {
                throw new Exception('No time entry ID available');
            }

            $response = $this->request('PUT', '/api/v1/time/entries.php', [
                'id' => $this->testData['time_entry_id'],
                'hours' => 7.5,
                'description' => 'Updated API Test Entry'
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Get employee summary
        $this->test('Get employee summary', function() {
            if (!isset($this->testData['employee_id'])) {
                throw new Exception('No employee ID available');
            }

            $response = $this->request('GET', '/api/v1/time/entries.php?employee_summary=true&employee_id=' . $this->testData['employee_id'] . '&start_date=2025-11-01&end_date=2025-11-30');
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testTimer() {
        echo "⏱️  Timer API Tests\n";
        echo "------------------\n";

        // Start timer
        $this->test('Start timer', function() {
            if (!isset($this->testData['employee_id'])) {
                throw new Exception('No employee ID available');
            }

            $response = $this->request('POST', '/api/v1/time/timer.php', [
                'employee_id' => $this->testData['employee_id'],
                'description' => 'Timer API Test',
                'action' => 'start'
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['timer_id'] = $response['body']['data']['timer_id'];
                return true;
            }
            return false;
        });

        // Get active timer
        $this->test('Get active timer', function() {
            if (!isset($this->testData['employee_id'])) {
                throw new Exception('No employee ID available');
            }

            $response = $this->request('GET', '/api/v1/time/timer.php?employee_id=' . $this->testData['employee_id']);
            return $response['code'] === 200 && $response['body']['success'] && $response['body']['data']['is_running'];
        });

        // Wait a moment
        sleep(2);

        // Stop timer
        $this->test('Stop timer', function() {
            if (!isset($this->testData['timer_id']) || !isset($this->testData['employee_id'])) {
                throw new Exception('No timer ID or employee ID available');
            }

            $response = $this->request('POST', '/api/v1/time/timer.php', [
                'timer_id' => $this->testData['timer_id'],
                'employee_id' => $this->testData['employee_id'],
                'action' => 'stop'
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testApprovals() {
        echo "✅ Approval API Tests\n";
        echo "--------------------\n";

        // Approve time entry
        $this->test('Approve time entry', function() {
            if (!isset($this->testData['time_entry_id'])) {
                throw new Exception('No time entry ID available');
            }

            $response = $this->request('POST', '/api/v1/time/approvals.php', [
                'time_entry_id' => $this->testData['time_entry_id'],
                'action' => 'approve',
                'comments' => 'Automated test approval'
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Get approval history
        $this->test('Get approval history', function() {
            if (!isset($this->testData['time_entry_id'])) {
                throw new Exception('No time entry ID available');
            }

            $response = $this->request('GET', '/api/v1/time/approvals.php?time_entry_id=' . $this->testData['time_entry_id']);
            return $response['code'] === 200 && $response['body']['success'] && count($response['body']['data']['history']) > 0;
        });

        echo "\n";
    }

    public function testBreaks() {
        echo "☕ Break Management API Tests\n";
        echo "----------------------------\n";

        // Add break
        $this->test('Add break to time entry', function() {
            if (!isset($this->testData['timer_id'])) {
                throw new Exception('No timer ID available');
            }

            $response = $this->request('POST', '/api/v1/time/breaks.php', [
                'time_entry_id' => $this->testData['timer_id'],
                'break_start' => date('Y-m-d H:i:s', strtotime('-2 hours')),
                'break_end' => date('Y-m-d H:i:s', strtotime('-1 hour 30 minutes')),
                'break_type' => 'lunch'
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // List breaks
        $this->test('List breaks for time entry', function() {
            if (!isset($this->testData['timer_id'])) {
                throw new Exception('No timer ID available');
            }

            $response = $this->request('GET', '/api/v1/time/breaks.php?time_entry_id=' . $this->testData['timer_id']);
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testAI() {
        echo "🤖 AI Features API Tests\n";
        echo "-----------------------\n";

        // Get activity patterns
        $this->test('Get activity patterns', function() {
            $response = $this->request('GET', '/api/v1/time/ai.php');
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Predict task
        $this->test('Predict task (AI)', function() {
            $response = $this->request('POST', '/api/v1/time/ai.php', [
                'action' => 'predict-task',
                'time_of_day' => (int)date('H'),
                'day_of_week' => (int)date('w')
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testGeofences() {
        echo "🌍 Geofence API Tests\n";
        echo "--------------------\n";

        // Create geofence
        $this->test('Create geofence', function() {
            $response = $this->request('POST', '/api/v1/time/geofences.php', [
                'name' => 'Test Office',
                'description' => 'API Test Geofence',
                'center_lat' => 44.4268,
                'center_lng' => 26.1025,
                'radius_meters' => 100
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['geofence_id'] = $response['body']['data']['geofence_id'];
                return true;
            }
            return false;
        });

        // List geofences
        $this->test('List geofences', function() {
            $response = $this->request('GET', '/api/v1/time/geofences.php');
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Update geofence
        $this->test('Update geofence', function() {
            if (!isset($this->testData['geofence_id'])) {
                throw new Exception('No geofence ID available');
            }

            $response = $this->request('PUT', '/api/v1/time/geofences.php', [
                'id' => $this->testData['geofence_id'],
                'radius_meters' => 150
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testPolicies() {
        echo "📋 Policy API Tests\n";
        echo "------------------\n";

        // Create policy
        $this->test('Create time tracking policy', function() {
            $response = $this->request('POST', '/api/v1/time/policies.php', [
                'name' => 'Test Policy',
                'description' => 'API Test Policy',
                'require_screenshots' => false,
                'require_approval' => true,
                'approval_threshold_hours' => 8.0
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['policy_id'] = $response['body']['data']['policy_id'];
                return true;
            }
            return false;
        });

        // List policies
        $this->test('List policies', function() {
            $response = $this->request('GET', '/api/v1/time/policies.php');
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function cleanup() {
        echo "🧹 Cleanup Phase\n";
        echo "---------------\n";

        // Delete test data
        $this->test('Delete test time entry', function() {
            if (!isset($this->testData['time_entry_id'])) {
                return true; // Already deleted or not created
            }

            $response = $this->request('DELETE', '/api/v1/time/entries.php', [
                'id' => $this->testData['time_entry_id']
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        $this->test('Delete test geofence', function() {
            if (!isset($this->testData['geofence_id'])) {
                return true;
            }

            $response = $this->request('DELETE', '/api/v1/time/geofences.php', [
                'id' => $this->testData['geofence_id']
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        $this->test('Delete test policy', function() {
            if (!isset($this->testData['policy_id'])) {
                return true;
            }

            $response = $this->request('DELETE', '/api/v1/time/policies.php', [
                'id' => $this->testData['policy_id']
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function printSummary() {
        echo "\n📊 Test Summary\n";
        echo "==============\n\n";

        $total = count($this->testResults);
        $passed = count(array_filter($this->testResults, fn($r) => $r['status'] === 'pass'));
        $failed = count(array_filter($this->testResults, fn($r) => $r['status'] === 'fail'));
        $errors = count(array_filter($this->testResults, fn($r) => $r['status'] === 'error'));

        echo "Total Tests: $total\n";
        echo "✅ Passed: $passed\n";
        echo "❌ Failed: $failed\n";
        echo "⚠️  Errors: $errors\n";
        echo "\nSuccess Rate: " . round(($passed / $total) * 100, 2) . "%\n\n";

        if ($failed > 0 || $errors > 0) {
            echo "Failed/Error Tests:\n";
            foreach ($this->testResults as $result) {
                if ($result['status'] !== 'pass') {
                    echo "  - {$result['name']}: {$result['status']}\n";
                    if (isset($result['message'])) {
                        echo "    Error: {$result['message']}\n";
                    }
                }
            }
        }

        echo "\n";
    }

    public function runAll() {
        $this->setup();
        $this->testTimeEntries();
        $this->testTimer();
        $this->testApprovals();
        $this->testBreaks();
        $this->testAI();
        $this->testGeofences();
        $this->testPolicies();
        $this->cleanup();
        $this->printSummary();
    }
}

// Run tests
$suite = new APITestSuite();
$suite->runAll();
