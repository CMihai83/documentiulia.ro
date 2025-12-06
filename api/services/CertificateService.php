<?php
/**
 * CertificateService.php
 *
 * Service for generating and managing course completion certificates
 * Uses mPDF for PDF generation
 *
 * @category Service
 * @package  DocumentIulia
 * @author   DocumentIulia Platform
 * @created  2025-11-21
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Mpdf\Mpdf;

class CertificateService
{
    private $db;
    private $certificatesDir;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
        $this->certificatesDir = __DIR__ . '/../../storage/certificates/';

        // Create certificates directory if it doesn't exist
        if (!file_exists($this->certificatesDir)) {
            mkdir($this->certificatesDir, 0755, true);
        }
    }

    /**
     * Generate certificate for course completion
     *
     * @param string $userId User ID
     * @param int $courseId Course ID
     * @return array Result with certificate data
     */
    public function generateCertificate($userId, $courseId)
    {
        try {
            // Check if certificate already exists
            $checkQuery = "SELECT cc.* FROM course_certificates cc
                          JOIN user_course_enrollments uce ON cc.user_id = uce.user_id
                          WHERE cc.user_id = :user_id
                          AND uce.course_id = :course_id";

            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $checkStmt->execute();

            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                return [
                    'success' => true,
                    'certificate' => $existing,
                    'message' => 'Certificate already exists'
                ];
            }

            // Get course completion data
            $dataQuery = "SELECT
                u.first_name,
                u.last_name,
                u.email,
                c.name as course_name,
                c.duration_hours,
                c.category,
                ucp.completed_at,
                ucp.completion_percentage,
                ucp.total_time_spent_minutes,
                COALESCE(AVG(cr.rating), 0) as course_rating
            FROM users u
            JOIN user_course_progress ucp ON u.id = ucp.user_id
            JOIN courses c ON ucp.course_id = c.id
            LEFT JOIN course_reviews cr ON c.id = cr.course_id
            WHERE u.id = :user_id AND c.id = :course_id
            AND ucp.is_completed = true
            GROUP BY u.id, u.first_name, u.last_name, u.email, c.name, c.duration_hours,
                     c.category, ucp.completed_at, ucp.completion_percentage, ucp.total_time_spent_minutes";

            $dataStmt = $this->db->prepare($dataQuery);
            $dataStmt->bindParam(':user_id', $userId);
            $dataStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $dataStmt->execute();

            $data = $dataStmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return [
                    'success' => false,
                    'message' => 'Course not completed or data not found'
                ];
            }

            // Generate unique certificate code
            $certificateCode = $this->generateCertificateCode($userId, $courseId);

            // Generate PDF
            $pdfPath = $this->generateCertificatePDF($data, $certificateCode);

            if (!$pdfPath) {
                return [
                    'success' => false,
                    'message' => 'Failed to generate certificate PDF'
                ];
            }

            // Save certificate record
            $saveQuery = "INSERT INTO course_certificates (
                user_id, course_id, certificate_code, issued_at,
                final_score, completion_time_days, certificate_url, is_valid
            ) VALUES (
                :user_id, :course_id, :certificate_code, NOW(),
                :final_score, :completion_time_days, :certificate_url, true
            ) RETURNING id";

            $saveStmt = $this->db->prepare($saveQuery);
            $saveStmt->bindParam(':user_id', $userId);
            $saveStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $saveStmt->bindParam(':certificate_code', $certificateCode);
            $saveStmt->bindParam(':final_score', $data['completion_percentage']);

            // Calculate completion time in days
            $completionDays = null;
            if ($data['completed_at']) {
                $enrollQuery = "SELECT enrolled_at FROM user_course_enrollments
                               WHERE user_id = :user_id AND course_id = :course_id";
                $enrollStmt = $this->db->prepare($enrollQuery);
                $enrollStmt->bindParam(':user_id', $userId);
                $enrollStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
                $enrollStmt->execute();
                $enrollData = $enrollStmt->fetch(PDO::FETCH_ASSOC);

                if ($enrollData) {
                    $start = new DateTime($enrollData['enrolled_at']);
                    $end = new DateTime($data['completed_at']);
                    $completionDays = $start->diff($end)->days;
                }
            }

            $saveStmt->bindParam(':completion_time_days', $completionDays, PDO::PARAM_INT);
            $saveStmt->bindParam(':certificate_url', $pdfPath);

            $saveStmt->execute();
            $certificateId = $saveStmt->fetch(PDO::FETCH_ASSOC)['id'];

            // Update enrollment with certificate timestamp
            $updateEnrollment = "UPDATE user_course_enrollments
                                SET certificate_issued_at = NOW()
                                WHERE user_id = :user_id AND course_id = :course_id";

            $updateStmt = $this->db->prepare($updateEnrollment);
            $updateStmt->bindParam(':user_id', $userId);
            $updateStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $updateStmt->execute();

            return [
                'success' => true,
                'certificate_id' => $certificateId,
                'certificate_code' => $certificateCode,
                'certificate_url' => $pdfPath,
                'message' => 'Certificate generated successfully'
            ];

        } catch (Exception $e) {
            error_log("CertificateService::generateCertificate Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to generate certificate: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate unique certificate code
     *
     * @param string $userId User ID
     * @param int $courseId Course ID
     * @return string Certificate code
     */
    private function generateCertificateCode($userId, $courseId)
    {
        $prefix = 'CERT';
        $year = date('Y');
        $hash = substr(md5($userId . $courseId . time()), 0, 8);

        return strtoupper("{$prefix}-{$year}-{$hash}");
    }

    /**
     * Generate certificate PDF
     *
     * @param array $data Certificate data
     * @param string $certificateCode Certificate code
     * @return string|null PDF file path
     */
    private function generateCertificatePDF($data, $certificateCode)
    {
        try {
            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4-L', // Landscape
                'margin_left' => 10,
                'margin_right' => 10,
                'margin_top' => 10,
                'margin_bottom' => 10
            ]);

            $studentName = $data['first_name'] . ' ' . $data['last_name'];
            $courseName = $data['course_name'];
            $completionDate = date('d F Y', strtotime($data['completed_at']));
            $duration = $data['duration_hours'] ?? 0;
            $category = $data['category'] ?? 'Business';

            // Certificate HTML template
            $html = $this->getCertificateTemplate($studentName, $courseName, $completionDate, $certificateCode, $duration, $category);

            $mpdf->WriteHTML($html);

            // Generate filename
            $filename = 'certificate_' . $certificateCode . '.pdf';
            $filepath = $this->certificatesDir . $filename;

            $mpdf->Output($filepath, 'F');

            return '/storage/certificates/' . $filename;

        } catch (Exception $e) {
            error_log("CertificateService::generateCertificatePDF Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get certificate HTML template
     *
     * @param string $studentName Student name
     * @param string $courseName Course name
     * @param string $completionDate Completion date
     * @param string $certificateCode Certificate code
     * @param float $duration Course duration
     * @param string $category Course category
     * @return string HTML template
     */
    private function getCertificateTemplate($studentName, $courseName, $completionDate, $certificateCode, $duration, $category)
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Georgia', serif;
            margin: 0;
            padding: 0;
        }
        .certificate {
            width: 100%;
            height: 100%;
            border: 20px solid #1e3a8a;
            padding: 40px;
            text-align: center;
            background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
        }
        .border-inner {
            border: 2px solid #3b82f6;
            padding: 40px;
            background: white;
        }
        .header {
            color: #1e3a8a;
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 4px;
        }
        .subheader {
            color: #3b82f6;
            font-size: 24px;
            margin-bottom: 30px;
            font-style: italic;
        }
        .presented-to {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .student-name {
            color: #1e3a8a;
            font-size: 42px;
            font-weight: bold;
            margin: 20px 0;
            border-bottom: 2px solid #3b82f6;
            display: inline-block;
            padding: 0 50px 10px 50px;
        }
        .completion-text {
            color: #4b5563;
            font-size: 18px;
            margin: 30px 0;
            line-height: 1.6;
        }
        .course-name {
            color: #1e3a8a;
            font-size: 28px;
            font-weight: bold;
            margin: 20px 0;
        }
        .details {
            color: #6b7280;
            font-size: 14px;
            margin: 20px 0;
        }
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-around;
        }
        .signature {
            text-align: center;
            width: 200px;
        }
        .signature-line {
            border-top: 2px solid #1e3a8a;
            margin-bottom: 5px;
        }
        .signature-title {
            color: #1e3a8a;
            font-size: 14px;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            color: #9ca3af;
            font-size: 12px;
        }
        .certificate-code {
            color: #3b82f6;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="border-inner">
            <div class="header">Certificat de Finalizare</div>
            <div class="subheader">Certificate of Completion</div>

            <div class="presented-to">Certifică că</div>
            <div class="student-name">{$studentName}</div>

            <div class="completion-text">
                a finalizat cu succes cursul<br/>
                <strong>has successfully completed the course</strong>
            </div>

            <div class="course-name">{$courseName}</div>

            <div class="details">
                <strong>Categorie:</strong> {$category} |
                <strong>Durată:</strong> {$duration} ore |
                <strong>Data finalizării:</strong> {$completionDate}
            </div>

            <div style="margin-top: 40px;">
                <img src="https://via.placeholder.com/80x80/3b82f6/ffffff?text=Logo" alt="Platform Logo" style="width: 80px; height: 80px;">
            </div>

            <table style="width: 100%; margin-top: 40px;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="width: 33%; text-align: center;">
                        <div class="signature">
                            <div class="signature-line"></div>
                            <div class="signature-title">Director Platform</div>
                            <div style="font-size: 12px; color: #6b7280;">Platform Director</div>
                        </div>
                    </td>
                    <td style="width: 34%; text-align: center;">
                        <div class="signature">
                            <div class="signature-line"></div>
                            <div class="signature-title">Instructor Curs</div>
                            <div style="font-size: 12px; color: #6b7280;">Course Instructor</div>
                        </div>
                    </td>
                    <td style="width: 33%; text-align: center;">
                        <div class="signature">
                            <div class="signature-line"></div>
                            <div class="signature-title">Data Emiterii</div>
                            <div style="font-size: 12px; color: #6b7280;">{$completionDate}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <div class="footer">
                <div>DocumentIulia - Platformă Educațională pentru Business</div>
                <div class="certificate-code">Cod certificat: {$certificateCode}</div>
                <div style="margin-top: 5px;">Verificare: https://documentiulia.ro/verify/{$certificateCode}</div>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Verify certificate by code
     *
     * @param string $certificateCode Certificate code
     * @return array|null Certificate data
     */
    public function verifyCertificate($certificateCode)
    {
        try {
            $query = "SELECT
                cc.*,
                u.first_name,
                u.last_name,
                u.email,
                c.name as course_name,
                c.category
            FROM course_certificates cc
            JOIN users u ON cc.user_id = u.id
            JOIN user_course_enrollments uce ON cc.user_id = uce.user_id
            JOIN courses c ON uce.course_id = c.id
            WHERE cc.certificate_code = :certificate_code
            AND cc.is_valid = true";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':certificate_code', $certificateCode);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            error_log("CertificateService::verifyCertificate Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get user's certificates
     *
     * @param string $userId User ID
     * @return array Certificates list
     */
    public function getUserCertificates($userId)
    {
        try {
            $query = "SELECT
                cc.*,
                c.name as course_name,
                c.category,
                c.thumbnail_url
            FROM course_certificates cc
            JOIN user_course_enrollments uce ON cc.user_id = uce.user_id
            JOIN courses c ON uce.course_id = c.id
            WHERE cc.user_id = :user_id
            AND cc.is_valid = true
            ORDER BY cc.issued_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            return [
                'success' => true,
                'certificates' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];

        } catch (PDOException $e) {
            error_log("CertificateService::getUserCertificates Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get certificates: ' . $e->getMessage(),
                'certificates' => []
            ];
        }
    }
}
