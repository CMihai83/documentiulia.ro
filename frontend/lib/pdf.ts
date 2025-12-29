// Invoice PDF generation utility
// Uses browser-native approach for lightweight PDF generation

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  type: 'ISSUED' | 'RECEIVED';
  status: string;
  partnerName: string;
  partnerCui?: string;
  partnerAddress?: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
  companyName?: string;
  companyCui?: string;
  companyAddress?: string;
}

function formatAmount(amount: number, currency: string = 'RON'): string {
  return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  const isIssued = data.type === 'ISSUED';

  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="UTF-8">
      <title>Factura ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h1 {
          font-size: 28px;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .invoice-number {
          font-size: 14px;
          color: #6b7280;
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .party {
          width: 45%;
        }
        .party-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .party-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .party-details {
          color: #4b5563;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
        }
        .detail-item label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .detail-item span {
          font-weight: 600;
          color: #1f2937;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background: #3b82f6;
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .items-table tr:hover {
          background: #f9fafb;
        }
        .text-right { text-align: right; }
        .totals {
          width: 300px;
          margin-left: auto;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .totals-row.total {
          border-bottom: none;
          border-top: 2px solid #3b82f6;
          padding-top: 12px;
          margin-top: 8px;
        }
        .totals-row.total .label,
        .totals-row.total .value {
          font-size: 18px;
          font-weight: bold;
          color: #3b82f6;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 10px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-draft { background: #e5e7eb; color: #374151; }
        @media print {
          body { padding: 20px; }
          .header { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">DocumentIulia.ro</div>
        <div class="invoice-title">
          <h1>FACTURA</h1>
          <div class="invoice-number">${data.invoiceNumber}</div>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-title">${isIssued ? 'Furnizor' : 'Client'}</div>
          <div class="party-name">${data.companyName || 'DocumentIulia SRL'}</div>
          <div class="party-details">
            ${data.companyCui ? `CUI: ${data.companyCui}<br>` : ''}
            ${data.companyAddress || 'Bucuresti, Romania'}
          </div>
        </div>
        <div class="party">
          <div class="party-title">${isIssued ? 'Client' : 'Furnizor'}</div>
          <div class="party-name">${data.partnerName}</div>
          <div class="party-details">
            ${data.partnerCui ? `CUI: ${data.partnerCui}<br>` : ''}
            ${data.partnerAddress || ''}
          </div>
        </div>
      </div>

      <div class="details-grid">
        <div class="detail-item">
          <label>Data Emiterii</label>
          <span>${formatDate(data.invoiceDate)}</span>
        </div>
        <div class="detail-item">
          <label>Data Scadenta</label>
          <span>${data.dueDate ? formatDate(data.dueDate) : '-'}</span>
        </div>
        <div class="detail-item">
          <label>Status</label>
          <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Descriere</th>
            <th class="text-right">Cantitate</th>
            <th class="text-right">Pret Unitar</th>
            <th class="text-right">TVA</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items && data.items.length > 0
            ? data.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatAmount(item.unitPrice, data.currency)}</td>
                  <td class="text-right">${item.vatRate}%</td>
                  <td class="text-right">${formatAmount(item.total, data.currency)}</td>
                </tr>
              `).join('')
            : `
                <tr>
                  <td>Servicii conform contract</td>
                  <td class="text-right">1</td>
                  <td class="text-right">${formatAmount(data.netAmount, data.currency)}</td>
                  <td class="text-right">${data.vatRate}%</td>
                  <td class="text-right">${formatAmount(data.netAmount, data.currency)}</td>
                </tr>
              `
          }
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span class="label">Subtotal</span>
          <span class="value">${formatAmount(data.netAmount, data.currency)}</span>
        </div>
        <div class="totals-row">
          <span class="label">TVA (${data.vatRate}%)</span>
          <span class="value">${formatAmount(data.vatAmount, data.currency)}</span>
        </div>
        <div class="totals-row total">
          <span class="label">TOTAL</span>
          <span class="value">${formatAmount(data.grossAmount, data.currency)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Aceasta factura a fost generata electronic de DocumentIulia.ro</p>
        <p>Conform Legii 141/2025 - TVA ${data.vatRate}%</p>
      </div>
    </body>
    </html>
  `;
}

export function downloadInvoicePdf(data: InvoicePdfData): void {
  const html = generateInvoiceHtml(data);

  // Create a new window with the invoice content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Popup blocked. Please allow popups for this site.');
    throw new Error('POPUP_BLOCKED');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function downloadInvoiceAsHtml(data: InvoicePdfData): void {
  const html = generateInvoiceHtml(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `factura-${data.invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
