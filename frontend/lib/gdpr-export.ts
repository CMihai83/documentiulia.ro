// GDPR Data Export Utility
// Enables users to export their personal data per GDPR Article 20

export interface GdprExportData {
  exportDate: string;
  user: {
    name: string;
    email: string;
    role: string;
    company?: string;
    cui?: string;
    createdAt?: string;
  };
  invoices: Array<{
    invoiceNumber: string;
    date: string;
    type: string;
    status: string;
    partnerName: string;
    grossAmount: number;
    currency: string;
  }>;
  documents: Array<{
    filename: string;
    fileType: string;
    status: string;
    uploadedAt: string;
  }>;
  employees?: Array<{
    name: string;
    department: string;
    position: string;
    hireDate: string;
  }>;
  auditLogs: Array<{
    action: string;
    timestamp: string;
    details?: string;
  }>;
}

export async function fetchUserGdprData(token: string, apiUrl: string): Promise<GdprExportData | null> {
  try {
    const response = await fetch(`${apiUrl}/gdpr/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GDPR data');
    }

    return await response.json();
  } catch (error) {
    console.error('GDPR export error:', error);
    return null;
  }
}

export function downloadGdprDataAsJson(data: GdprExportData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `gdpr-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateGdprHtmlReport(data: GdprExportData): string {
  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="UTF-8">
      <title>Export Date GDPR - ${data.user.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; line-height: 1.6; }
        h1 { color: #1f2937; margin-bottom: 10px; }
        h2 { color: #3b82f6; margin: 30px 0 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
        .header { margin-bottom: 30px; }
        .meta { color: #6b7280; font-size: 14px; }
        .section { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        tr:hover { background: #f9fafb; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .info-item { padding: 10px; background: #f9fafb; border-radius: 8px; }
        .info-item label { display: block; font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .info-item span { font-weight: 600; color: #1f2937; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Export Date Personale - GDPR</h1>
        <p class="meta">Generat la: ${new Date(data.exportDate).toLocaleString('ro-RO')}</p>
        <p class="meta">Conform Regulamentului GDPR (UE) 2016/679, Art. 20</p>
      </div>

      <div class="section">
        <h2>Informatii Utilizator</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nume</label>
            <span>${data.user.name}</span>
          </div>
          <div class="info-item">
            <label>Email</label>
            <span>${data.user.email}</span>
          </div>
          <div class="info-item">
            <label>Rol</label>
            <span>${data.user.role}</span>
          </div>
          ${data.user.company ? `
          <div class="info-item">
            <label>Companie</label>
            <span>${data.user.company}</span>
          </div>
          ` : ''}
          ${data.user.cui ? `
          <div class="info-item">
            <label>CUI</label>
            <span>${data.user.cui}</span>
          </div>
          ` : ''}
        </div>
      </div>

      ${data.invoices.length > 0 ? `
      <div class="section">
        <h2>Facturi (${data.invoices.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Numar</th>
              <th>Data</th>
              <th>Tip</th>
              <th>Partener</th>
              <th>Suma</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.invoices.map(inv => `
              <tr>
                <td>${inv.invoiceNumber}</td>
                <td>${new Date(inv.date).toLocaleDateString('ro-RO')}</td>
                <td>${inv.type === 'ISSUED' ? 'Emisa' : 'Primita'}</td>
                <td>${inv.partnerName}</td>
                <td>${inv.grossAmount.toLocaleString('ro-RO')} ${inv.currency}</td>
                <td>${inv.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${data.documents.length > 0 ? `
      <div class="section">
        <h2>Documente (${data.documents.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Fisier</th>
              <th>Tip</th>
              <th>Status</th>
              <th>Incarcat</th>
            </tr>
          </thead>
          <tbody>
            ${data.documents.map(doc => `
              <tr>
                <td>${doc.filename}</td>
                <td>${doc.fileType}</td>
                <td>${doc.status}</td>
                <td>${new Date(doc.uploadedAt).toLocaleDateString('ro-RO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${data.employees && data.employees.length > 0 ? `
      <div class="section">
        <h2>Angajati (${data.employees.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Nume</th>
              <th>Departament</th>
              <th>Pozitie</th>
              <th>Data Angajarii</th>
            </tr>
          </thead>
          <tbody>
            ${data.employees.map(emp => `
              <tr>
                <td>${emp.name}</td>
                <td>${emp.department}</td>
                <td>${emp.position}</td>
                <td>${new Date(emp.hireDate).toLocaleDateString('ro-RO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <h2>Jurnal Activitate (ultim 30 zile)</h2>
        ${data.auditLogs.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Actiune</th>
              <th>Data/Ora</th>
              <th>Detalii</th>
            </tr>
          </thead>
          <tbody>
            ${data.auditLogs.map(log => `
              <tr>
                <td>${log.action}</td>
                <td>${new Date(log.timestamp).toLocaleString('ro-RO')}</td>
                <td>${log.details || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p>Nu exista activitate inregistrata.</p>'}
      </div>

      <div class="footer">
        <p>Document generat automat de DocumentIulia.ro</p>
        <p>Pentru orice intrebari legate de datele personale, contactati-ne la: gdpr@documentiulia.ro</p>
      </div>
    </body>
    </html>
  `;
}

export function downloadGdprDataAsHtml(data: GdprExportData): void {
  const html = generateGdprHtmlReport(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `gdpr-export-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function requestDataDeletion(token: string, apiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/gdpr/deletion-request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Deletion request error:', error);
    return false;
  }
}
