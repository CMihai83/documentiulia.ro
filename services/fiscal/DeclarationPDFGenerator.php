<?php
/**
 * Declaration PDF Generator
 * Generates PDF declarations for fiscal reporting
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class DeclarationPDFGenerator
{
    private $dompdf;

    public function __construct()
    {
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);

        $this->dompdf = new Dompdf($options);
    }

    /**
     * Generate declaration PDF
     *
     * @param array $declaration Declaration data
     * @param array $company Company data
     * @return string PDF content
     */
    public function generateDeclaration($declaration, $company)
    {
        $html = $this->generateHTML($declaration, $company);

        $this->dompdf->loadHtml($html);
        $this->dompdf->setPaper('A4', 'portrait');
        $this->dompdf->render();

        return $this->dompdf->output();
    }

    /**
     * Generate HTML for declaration
     */
    private function generateHTML($declaration, $company)
    {
        $formName = $declaration['form_name'] ?? 'Declarație Fiscală';
        $formCode = $declaration['form_code'] ?? 'N/A';
        $periodYear = $declaration['period_year'] ?? date('Y');
        $periodMonth = $declaration['period_month'] ?? null;

        $periodText = $periodMonth
            ? date('F Y', mktime(0, 0, 0, $periodMonth, 1, $periodYear))
            : $periodYear;

        $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 15mm;
        }
        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 10pt;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
        }
        .anaf-logo {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
        }
        .form-title {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 10px;
            color: #000;
        }
        .form-code {
            font-size: 11pt;
            color: #666;
            margin-top: 5px;
        }
        .company-section {
            background-color: #f5f5f5;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #333;
        }
        .company-name {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .info-row {
            display: flex;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: bold;
            width: 150px;
            color: #555;
        }
        .info-value {
            flex: 1;
        }
        .section-title {
            background-color: #333;
            color: white;
            padding: 10px;
            margin-top: 20px;
            margin-bottom: 15px;
            font-weight: bold;
            font-size: 11pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #666;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #333;
        }
        td {
            padding: 8px;
            border: 1px solid #ddd;
        }
        .field-row {
            display: flex;
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #ddd;
            background-color: #fafafa;
        }
        .field-label {
            font-weight: bold;
            width: 300px;
            color: #555;
        }
        .field-value {
            flex: 1;
            border-bottom: 1px solid #333;
            min-height: 20px;
        }
        .checkbox-group {
            display: flex;
            gap: 30px;
            margin: 15px 0;
        }
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .checkbox {
            width: 15px;
            height: 15px;
            border: 2px solid #333;
            display: inline-block;
        }
        .checkbox.checked {
            background-color: #333;
        }
        .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            text-align: center;
        }
        .signature-line {
            margin-top: 60px;
            border-top: 2px solid #333;
            padding-top: 5px;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 8pt;
            color: #666;
            text-align: center;
        }
        .warning-box {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 9pt;
        }
        .important {
            font-weight: bold;
            color: #d9534f;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="anaf-logo">AGENȚIA NAȚIONALĂ DE ADMINISTRARE FISCALĂ</div>
        <div class="form-title">' . htmlspecialchars($formName) . '</div>
        <div class="form-code">Cod formular: ' . htmlspecialchars($formCode) . '</div>
        <div style="margin-top: 10px; font-size: 10pt;">Perioada fiscală: ' . htmlspecialchars($periodText) . '</div>
    </div>

    <div class="company-section">
        <div class="company-name">' . htmlspecialchars($company['name']) . '</div>
        <div class="info-row">
            <div class="info-label">CUI/CIF:</div>
            <div class="info-value">' . htmlspecialchars($company['cui']) . '</div>
        </div>
        <div class="info-row">
            <div class="info-label">Nr. Reg. Com.:</div>
            <div class="info-value">' . htmlspecialchars($company['registration_number'] ?? 'N/A') . '</div>
        </div>
        <div class="info-row">
            <div class="info-label">Adresă sediu social:</div>
            <div class="info-value">' . htmlspecialchars($company['address'] ?? 'N/A') . '</div>
        </div>
    </div>

    <div class="warning-box">
        <p class="important">IMPORTANT:</p>
        <p>Acest document este generat automat de platforma AccountEch și trebuie verificat de un consultant fiscal autorizat înainte de depunere la ANAF.</p>
        <p>Declarația completă și semnată trebuie depusă în conformitate cu termenele legale.</p>
    </div>

    <div class="section-title">I. TIP DECLARAȚIE</div>
    <div class="checkbox-group">
        <div class="checkbox-item">
            <span class="checkbox checked"></span>
            <span>Declarație normală</span>
        </div>
        <div class="checkbox-item">
            <span class="checkbox"></span>
            <span>Declarație rectificativă</span>
        </div>
    </div>

    <div class="section-title">II. DATE DE IDENTIFICARE</div>
    <div class="field-row">
        <div class="field-label">Denumire contribuabil:</div>
        <div class="field-value">' . htmlspecialchars($company['name']) . '</div>
    </div>
    <div class="field-row">
        <div class="field-label">Cod de identificare fiscală (CUI/CIF):</div>
        <div class="field-value">' . htmlspecialchars($company['cui']) . '</div>
    </div>
    <div class="field-row">
        <div class="field-label">Nr. înregistrare Registrul Comerțului:</div>
        <div class="field-value">' . htmlspecialchars($company['registration_number'] ?? '') . '</div>
    </div>

    <div class="section-title">III. DECLARAȚIE PE PROPRIA RĂSPUNDERE</div>
    <div style="padding: 15px; line-height: 1.8;">
        <p>Subsemnatul/a, în calitate de reprezentant legal al <strong>' . htmlspecialchars($company['name']) . '</strong>,
        declar pe propria răspundere că datele cuprinse în această declarație sunt corecte și complete.</p>
        <p style="margin-top: 15px;">Declar că sunt cunoscător/cunoscătoare de dispozițiile art. 326 din Legea
        nr. 207/2015 privind Codul de procedură fiscală, cu modificările și completările ulterioare,
        referitoare la falsul în declarații.</p>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div style="margin-bottom: 80px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Reprezentant legal</div>
                <div style="font-size: 9pt; color: #666;">Nume și prenume</div>
            </div>
            <div class="signature-line">
                Semnătura și ștampila
            </div>
        </div>
        <div class="signature-box">
            <div style="margin-bottom: 80px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Data completării</div>
                <div style="font-size: 9pt; color: #666;">' . date('d.m.Y') . '</div>
            </div>
            <div class="signature-line">
                Data și ștampila
            </div>
        </div>
    </div>

    <div class="footer">
        <div><strong>Document generat automat de platforma AccountEch</strong></div>
        <div>Data generării: ' . date('d.m.Y H:i') . '</div>
        <div style="margin-top: 10px; color: #d9534f;">
            <strong>ATENȚIE:</strong> Acest document este un șablon și trebuie completat cu datele specifice
            și verificat de un consultant fiscal înainte de depunere la ANAF.
        </div>
    </div>
</body>
</html>';

        return $html;
    }

    /**
     * Save declaration to file
     */
    public function saveDeclaration($declaration, $company, $filename)
    {
        $pdf = $this->generateDeclaration($declaration, $company);
        file_put_contents($filename, $pdf);
        return $filename;
    }
}
