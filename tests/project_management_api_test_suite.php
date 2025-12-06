<?php
/**
 * Project Management API Test Suite
 * Tests all Project Management module endpoints
 *
 * Usage: php tests/project_management_api_test_suite.php
 */

require_once __DIR__ . '/../api/config/database.php';

class ProjectManagementTestSuite {
    private $baseUrl = 'http://127.0.0.1';
    private $token = null;
    private $companyId = null;
    private $testResults = [];
    private $testData = [];

    public function __construct() {
        echo "\n🧪 Project Management API Test Suite\n";
        echo "=====================================\n\n";
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

        // Login
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

    public function testProjects() {
        echo "📁 Projects API Tests\n";
        echo "--------------------\n";

        // Create project
        $this->test('Create project', function() {
            $db = Database::getInstance();
            $customer = $db->fetchOne("SELECT id FROM customers WHERE company_id = $1 LIMIT 1", [$this->companyId]);

            $response = $this->request('POST', '/api/v1/projects/projects.php', [
                'name' => 'API Test Project',
                'description' => 'Comprehensive API testing project',
                'methodology' => 'agile',
                'status' => 'planning',
                'health_status' => 'on_track',
                'priority' => 'high',
                'customer_id' => $customer['id'] ?? null,
                'tags' => ['test', 'api', 'automation']
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['project_id'] = $response['body']['data']['project_id'];
                return true;
            }
            return false;
        });

        // List projects
        $this->test('List projects', function() {
            $response = $this->request('GET', '/api/v1/projects/projects.php?limit=10');
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Get single project
        $this->test('Get single project', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/projects.php?id=' . $this->testData['project_id']);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Update project
        $this->test('Update project', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('PUT', '/api/v1/projects/projects.php', [
                'id' => $this->testData['project_id'],
                'status' => 'in_progress',
                'health_status' => 'on_track',
                'completion_percentage' => 25.0
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Filter by methodology
        $this->test('Filter projects by methodology', function() {
            $response = $this->request('GET', '/api/v1/projects/projects.php?methodology=agile');
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Search projects
        $this->test('Search projects', function() {
            $response = $this->request('GET', '/api/v1/projects/projects.php?search=Test');
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testGantt() {
        echo "📊 Gantt Chart API Tests\n";
        echo "-----------------------\n";

        // Create test tasks
        $this->test('Create tasks for Gantt', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $db = Database::getInstance();

            // Task 1
            $task1 = $db->fetchOne(
                "INSERT INTO tasks (project_id, company_id, title, status, start_date, due_date, estimated_hours)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id",
                [
                    $this->testData['project_id'],
                    $this->companyId,
                    'Design Phase',
                    'in_progress',
                    date('Y-m-d'),
                    date('Y-m-d', strtotime('+7 days')),
                    40
                ]
            );

            // Task 2
            $task2 = $db->fetchOne(
                "INSERT INTO tasks (project_id, company_id, title, status, start_date, due_date, estimated_hours)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id",
                [
                    $this->testData['project_id'],
                    $this->companyId,
                    'Development Phase',
                    'pending',
                    date('Y-m-d', strtotime('+7 days')),
                    date('Y-m-d', strtotime('+21 days')),
                    80
                ]
            );

            $this->testData['task1_id'] = $task1['id'];
            $this->testData['task2_id'] = $task2['id'];
            return true;
        });

        // Add task dependency
        $this->test('Add task dependency', function() {
            if (!isset($this->testData['project_id']) || !isset($this->testData['task1_id']) || !isset($this->testData['task2_id'])) {
                throw new Exception('Missing required test data');
            }

            $response = $this->request('POST', '/api/v1/projects/gantt.php', [
                'project_id' => $this->testData['project_id'],
                'predecessor_task_id' => $this->testData['task1_id'],
                'successor_task_id' => $this->testData['task2_id'],
                'dependency_type' => 'FS',
                'lag_days' => 0
            ]);
            return $response['code'] === 200 && $response['body']['success'];
        });

        // Get Gantt data
        $this->test('Get Gantt chart data', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/gantt.php?project_id=' . $this->testData['project_id']);
            return $response['code'] === 200 && $response['body']['success'] && isset($response['body']['data']['critical_path']);
        });

        echo "\n";
    }

    public function testKanban() {
        echo "📋 Kanban Board API Tests\n";
        echo "-------------------------\n";

        // Get Kanban board
        $this->test('Get Kanban board', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/kanban.php?project_id=' . $this->testData['project_id']);

            if ($response['code'] === 200 && $response['body']['success']) {
                $board = $response['body']['data']['board'];
                if (isset($board['columns']) && count($board['columns']) > 0) {
                    $this->testData['board_id'] = $board['id'];
                    $this->testData['column_id'] = $board['columns'][0]['id'];
                    return true;
                }
            }
            return false;
        });

        echo "\n";
    }

    public function testResources() {
        echo "👥 Resource Allocation API Tests\n";
        echo "--------------------------------\n";

        // Allocate resource
        $this->test('Allocate resource to project', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $db = Database::getInstance();
            $user = $db->fetchOne("SELECT id FROM users WHERE company_id = $1 LIMIT 1", [$this->companyId]);

            if (!$user) {
                throw new Exception('No users found');
            }

            $response = $this->request('POST', '/api/v1/projects/resources.php', [
                'project_id' => $this->testData['project_id'],
                'user_id' => $user['id'],
                'allocated_percentage' => 50,
                'start_date' => date('Y-m-d'),
                'end_date' => date('Y-m-d', strtotime('+30 days'))
            ]);

            return $response['code'] === 200 && $response['body']['success'];
        });

        // Get resource allocations
        $this->test('Get resource allocations', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/resources.php?project_id=' . $this->testData['project_id']);
            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testMilestones() {
        echo "🎯 Milestones API Tests\n";
        echo "----------------------\n";

        // Create milestone
        $this->test('Create milestone', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('POST', '/api/v1/projects/milestones.php', [
                'project_id' => $this->testData['project_id'],
                'title' => 'Project Kickoff',
                'description' => 'Initial project kickoff meeting',
                'due_date' => date('Y-m-d', strtotime('+7 days')),
                'status' => 'pending'
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['milestone_id'] = $response['body']['data']['milestone_id'];
                return true;
            }
            return false;
        });

        // Get milestones
        $this->test('Get project milestones', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/milestones.php?project_id=' . $this->testData['project_id']);
            return $response['code'] === 200 && $response['body']['success'] && count($response['body']['data']['milestones']) > 0;
        });

        // Update milestone
        $this->test('Update milestone', function() {
            if (!isset($this->testData['milestone_id']) || !isset($this->testData['project_id'])) {
                throw new Exception('Missing required test data');
            }

            $response = $this->request('PUT', '/api/v1/projects/milestones.php', [
                'id' => $this->testData['milestone_id'],
                'project_id' => $this->testData['project_id'],
                'status' => 'completed',
                'completion_date' => date('Y-m-d')
            ]);

            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testRisks() {
        echo "⚠️  Risks API Tests\n";
        echo "------------------\n";

        // Create risk
        $this->test('Create project risk', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('POST', '/api/v1/projects/risks.php', [
                'project_id' => $this->testData['project_id'],
                'title' => 'Resource Availability',
                'description' => 'Key developer may not be available',
                'probability' => 'medium',
                'impact' => 'high',
                'mitigation_plan' => 'Cross-train team members',
                'status' => 'open'
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['risk_id'] = $response['body']['data']['risk_id'];
                return true;
            }
            return false;
        });

        // Get risks
        $this->test('Get project risks', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/risks.php?project_id=' . $this->testData['project_id']);
            return $response['code'] === 200 && $response['body']['success'] && count($response['body']['data']['risks']) > 0;
        });

        echo "\n";
    }

    public function testSprints() {
        echo "🏃 Sprints API Tests\n";
        echo "-------------------\n";

        // Create sprint
        $this->test('Create sprint', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('POST', '/api/v1/projects/sprints.php', [
                'project_id' => $this->testData['project_id'],
                'name' => 'Sprint 1',
                'goal' => 'Complete initial features',
                'start_date' => date('Y-m-d'),
                'end_date' => date('Y-m-d', strtotime('+14 days')),
                'status' => 'active',
                'velocity_target' => 50
            ]);

            if ($response['code'] === 200 && $response['body']['success']) {
                $this->testData['sprint_id'] = $response['body']['data']['sprint_id'];
                return true;
            }
            return false;
        });

        // Get sprints
        $this->test('Get project sprints', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/sprints.php?project_id=' . $this->testData['project_id']);
            return $response['code'] === 200 && $response['body']['success'] && count($response['body']['data']['sprints']) > 0;
        });

        // Add task to sprint
        $this->test('Add task to sprint', function() {
            if (!isset($this->testData['sprint_id']) || !isset($this->testData['task1_id'])) {
                throw new Exception('Missing required test data');
            }

            $response = $this->request('POST', '/api/v1/projects/sprints.php?action=add_task', [
                'sprint_id' => $this->testData['sprint_id'],
                'task_id' => $this->testData['task1_id']
            ]);

            return $response['code'] === 200 && $response['body']['success'];
        });

        echo "\n";
    }

    public function testAnalytics() {
        echo "📈 Analytics API Tests\n";
        echo "---------------------\n";

        // Get project analytics
        $this->test('Get project analytics', function() {
            if (!isset($this->testData['project_id'])) {
                throw new Exception('No project ID available');
            }

            $response = $this->request('GET', '/api/v1/projects/analytics.php?project_id=' . $this->testData['project_id']);

            if ($response['code'] === 200 && $response['body']['success']) {
                $data = $response['body']['data'];
                return isset($data['project']) && isset($data['tasks']) && isset($data['budget']) && isset($data['risks']);
            }
            return false;
        });

        echo "\n";
    }

    public function cleanup() {
        echo "🧹 Cleanup Phase\n";
        echo "---------------\n";

        // Delete test project
        $this->test('Delete test project', function() {
            if (!isset($this->testData['project_id'])) {
                return true; // Already deleted or not created
            }

            $response = $this->request('DELETE', '/api/v1/projects/projects.php', [
                'id' => $this->testData['project_id']
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
        $this->testProjects();
        $this->testGantt();
        $this->testKanban();
        $this->testResources();
        $this->testMilestones();
        $this->testRisks();
        $this->testSprints();
        $this->testAnalytics();
        $this->cleanup();
        $this->printSummary();
    }
}

// Run tests
$suite = new ProjectManagementTestSuite();
$suite->runAll();
