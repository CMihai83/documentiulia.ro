import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReportingService,
  FleetPerformanceReport,
  FuelConsumptionReport,
  VehicleUtilizationReport,
  MaintenanceCostReport,
  DriverPayoutReport,
  CourierReconciliationReport,
  ExportFormat,
} from './reporting.service';

/**
 * Fleet Reports Export Service
 * Advanced report export functionality for Munich delivery fleet.
 *
 * Features:
 * - Multi-format export (JSON, CSV, XLSX, PDF)
 * - Report templates with custom branding
 * - Scheduled report generation
 * - Email delivery
 * - Report archiving
 * - Bulk export
 */

// Extended export formats
export type ExtendedExportFormat = ExportFormat | 'xlsx' | 'html';

export interface ReportTemplate {
  id: string;
  userId: string;
  name: string;
  reportType: string;
  format: ExtendedExportFormat;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  customPeriodDays?: number;
  filters?: {
    vehicleIds?: string[];
    driverIds?: string[];
    zones?: string[];
  };
  includeCharts: boolean;
  emailRecipients?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReport {
  id: string;
  userId: string;
  templateId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM
  lastRunAt?: Date;
  nextRunAt: Date;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  lastError?: string;
  createdAt: Date;
}

export interface ExportedReport {
  id: string;
  userId: string;
  reportType: string;
  format: ExtendedExportFormat;
  periodFrom: Date;
  periodTo: Date;
  filename: string;
  fileSizeBytes: number;
  downloadUrl?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ExportResult {
  data: string | Buffer | object;
  contentType: string;
  filename: string;
  sizeBytes: number;
}

// XLSX Cell styling
interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  color?: string;
  numberFormat?: string;
}

// PDF generation options
interface PdfOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  companyLogo?: string;
  showCharts: boolean;
  pageOrientation: 'portrait' | 'landscape';
  includeFooter: boolean;
}

@Injectable()
export class FleetReportsExportService {
  private readonly logger = new Logger(FleetReportsExportService.name);

  // In-memory stores (in production, these would be persisted)
  private templates: Map<string, ReportTemplate> = new Map();
  private schedules: Map<string, ScheduledReport> = new Map();
  private exports: Map<string, ExportedReport> = new Map();

  private templateCounter = 0;
  private scheduleCounter = 0;
  private exportCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportingService: ReportingService,
  ) {}

  // =================== REPORT TEMPLATES ===================

  /**
   * Create a report template
   */
  async createTemplate(
    userId: string,
    template: Omit<ReportTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReportTemplate> {
    const newTemplate: ReportTemplate = {
      ...template,
      id: `tpl-${++this.templateCounter}-${Date.now()}`,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.logger.log(`Template created: ${newTemplate.name} (${newTemplate.id})`);

    return newTemplate;
  }

  /**
   * Get user's templates
   */
  async getTemplates(userId: string): Promise<ReportTemplate[]> {
    return Array.from(this.templates.values()).filter(t => t.userId === userId);
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<ReportTemplate | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    Object.assign(template, updates, { updatedAt: new Date() });
    return template;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    return this.templates.delete(templateId);
  }

  // =================== SCHEDULED REPORTS ===================

  /**
   * Schedule a report
   */
  async scheduleReport(
    userId: string,
    schedule: Omit<ScheduledReport, 'id' | 'userId' | 'lastRunAt' | 'status' | 'createdAt'>,
  ): Promise<ScheduledReport> {
    const template = await this.getTemplate(schedule.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const newSchedule: ScheduledReport = {
      ...schedule,
      id: `sched-${++this.scheduleCounter}-${Date.now()}`,
      userId,
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    this.schedules.set(newSchedule.id, newSchedule);
    this.logger.log(`Report scheduled: ${newSchedule.id} (${schedule.frequency})`);

    return newSchedule;
  }

  /**
   * Get user's scheduled reports
   */
  async getScheduledReports(userId: string): Promise<ScheduledReport[]> {
    return Array.from(this.schedules.values()).filter(s => s.userId === userId);
  }

  /**
   * Pause scheduled report
   */
  async pauseScheduledReport(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.status = 'PAUSED';
    }
  }

  /**
   * Resume scheduled report
   */
  async resumeScheduledReport(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.status = 'ACTIVE';
      schedule.nextRunAt = this.calculateNextRunTime(schedule);
    }
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(scheduleId: string): Promise<boolean> {
    return this.schedules.delete(scheduleId);
  }

  /**
   * Run scheduled reports (called by cron job)
   */
  async runDueScheduledReports(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const schedule of this.schedules.values()) {
      if (schedule.status !== 'ACTIVE') continue;
      if (schedule.nextRunAt > now) continue;

      try {
        const template = await this.getTemplate(schedule.templateId);
        if (!template) continue;

        const { from, to } = this.calculatePeriod(template.periodType, template.customPeriodDays);
        await this.exportReport(template.userId, {
          reportType: template.reportType,
          format: template.format,
          from,
          to,
          filters: template.filters,
          emailRecipients: template.emailRecipients,
        });

        schedule.lastRunAt = now;
        schedule.nextRunAt = this.calculateNextRunTime(schedule);
        schedule.lastError = undefined;
        count++;
      } catch (error: any) {
        schedule.status = 'ERROR';
        schedule.lastError = error.message;
        this.logger.error(`Scheduled report failed: ${schedule.id}`, error);
      }
    }

    return count;
  }

  // =================== REPORT EXPORT ===================

  /**
   * Export report in specified format
   */
  async exportReport(
    userId: string,
    options: {
      reportType: string;
      format: ExtendedExportFormat;
      from: Date;
      to: Date;
      filters?: ReportTemplate['filters'];
      emailRecipients?: string[];
    },
  ): Promise<ExportResult> {
    const { reportType, format, from, to, filters, emailRecipients } = options;

    // Generate report data
    const report = await this.generateReportData(userId, reportType, from, to);

    // Apply filters if provided
    const filteredReport = filters ? this.applyFilters(report, filters) : report;

    // Export to format
    let result: ExportResult;
    switch (format) {
      case 'json':
        result = this.exportToJson(filteredReport, reportType);
        break;
      case 'csv':
        result = this.exportToCsv(filteredReport, reportType);
        break;
      case 'xlsx':
        result = this.exportToXlsx(filteredReport, reportType, { from, to });
        break;
      case 'pdf':
        result = this.exportToPdf(filteredReport, reportType, {
          title: this.getReportTitle(reportType),
          subtitle: `${from.toLocaleDateString('de-DE')} - ${to.toLocaleDateString('de-DE')}`,
          companyName: 'Munich Delivery Fleet',
          showCharts: true,
          pageOrientation: 'landscape',
          includeFooter: true,
        });
        break;
      case 'html':
        result = this.exportToHtml(filteredReport, reportType, { from, to });
        break;
      default:
        result = this.exportToJson(filteredReport, reportType);
    }

    // Save export record
    const exportRecord: ExportedReport = {
      id: `exp-${++this.exportCounter}-${Date.now()}`,
      userId,
      reportType,
      format,
      periodFrom: from,
      periodTo: to,
      filename: result.filename,
      fileSizeBytes: result.sizeBytes,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    };
    this.exports.set(exportRecord.id, exportRecord);

    // Send email if recipients provided
    if (emailRecipients && emailRecipients.length > 0) {
      await this.sendReportEmail(emailRecipients, result, reportType, from, to);
    }

    this.logger.log(`Report exported: ${reportType} as ${format} (${result.sizeBytes} bytes)`);

    return result;
  }

  /**
   * Get export history
   */
  async getExportHistory(userId: string, limit: number = 20): Promise<ExportedReport[]> {
    return Array.from(this.exports.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Bulk export multiple reports
   */
  async bulkExport(
    userId: string,
    reportTypes: string[],
    format: ExtendedExportFormat,
    from: Date,
    to: Date,
  ): Promise<{
    exports: ExportResult[];
    totalSize: number;
  }> {
    const exports: ExportResult[] = [];
    let totalSize = 0;

    for (const reportType of reportTypes) {
      try {
        const result = await this.exportReport(userId, {
          reportType,
          format,
          from,
          to,
        });
        exports.push(result);
        totalSize += result.sizeBytes;
      } catch (error: any) {
        this.logger.error(`Bulk export failed for ${reportType}: ${error.message}`);
      }
    }

    return { exports, totalSize };
  }

  // =================== FORMAT EXPORTERS ===================

  /**
   * Export to JSON
   */
  private exportToJson(report: any, reportType: string): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 10);
    const jsonString = JSON.stringify(report, null, 2);

    return {
      data: jsonString,
      contentType: 'application/json',
      filename: `${reportType}_${timestamp}.json`,
      sizeBytes: Buffer.byteLength(jsonString, 'utf8'),
    };
  }

  /**
   * Export to CSV
   */
  private exportToCsv(report: any, reportType: string): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 10);
    const csvData = this.convertToCsv(report);

    return {
      data: csvData,
      contentType: 'text/csv;charset=utf-8',
      filename: `${reportType}_${timestamp}.csv`,
      sizeBytes: Buffer.byteLength(csvData, 'utf8'),
    };
  }

  /**
   * Export to XLSX (Excel)
   */
  private exportToXlsx(
    report: any,
    reportType: string,
    period: { from: Date; to: Date },
  ): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 10);

    // Build XLSX structure (simplified - in production would use xlsx library)
    const xlsxData = this.buildXlsxContent(report, reportType, period);

    return {
      data: xlsxData,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${reportType}_${timestamp}.xlsx`,
      sizeBytes: Buffer.byteLength(JSON.stringify(xlsxData), 'utf8'),
    };
  }

  /**
   * Export to PDF
   */
  private exportToPdf(report: any, reportType: string, options: PdfOptions): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 10);

    // Build PDF content (simplified - in production would use pdfkit or puppeteer)
    const pdfContent = this.buildPdfContent(report, reportType, options);

    return {
      data: pdfContent,
      contentType: 'application/pdf',
      filename: `${reportType}_${timestamp}.pdf`,
      sizeBytes: Buffer.byteLength(JSON.stringify(pdfContent), 'utf8'),
    };
  }

  /**
   * Export to HTML
   */
  private exportToHtml(
    report: any,
    reportType: string,
    period: { from: Date; to: Date },
  ): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 10);
    const htmlContent = this.buildHtmlContent(report, reportType, period);

    return {
      data: htmlContent,
      contentType: 'text/html;charset=utf-8',
      filename: `${reportType}_${timestamp}.html`,
      sizeBytes: Buffer.byteLength(htmlContent, 'utf8'),
    };
  }

  // =================== CONTENT BUILDERS ===================

  private convertToCsv(report: any): string {
    const rows: string[] = [];

    // Determine data arrays to export
    const dataArrays: { name: string; data: any[] }[] = [];

    if (report.byVehicle) dataArrays.push({ name: 'By Vehicle', data: report.byVehicle });
    if (report.byDriver) dataArrays.push({ name: 'By Driver', data: report.byDriver });
    if (report.byZone) dataArrays.push({ name: 'By Zone', data: report.byZone });
    if (report.byMonth) dataArrays.push({ name: 'By Month', data: report.byMonth });
    if (report.byType) dataArrays.push({ name: 'By Type', data: report.byType });
    if (report.byProvider) dataArrays.push({ name: 'By Provider', data: report.byProvider });

    for (const { name, data } of dataArrays) {
      if (data.length === 0) continue;

      rows.push(`# ${name}`);

      const headers = Object.keys(data[0]);
      rows.push(headers.join(','));

      for (const row of data) {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          if (val instanceof Date) return val.toISOString();
          return String(val);
        });
        rows.push(values.join(','));
      }

      rows.push(''); // Empty line between sections
    }

    // Add summary if present
    if (report.summary) {
      rows.push('# Summary');
      for (const [key, value] of Object.entries(report.summary)) {
        rows.push(`${key},${value}`);
      }
    }

    return rows.join('\n');
  }

  private buildXlsxContent(
    report: any,
    reportType: string,
    period: { from: Date; to: Date },
  ): object {
    // This would use xlsx library in production
    // Return structured data that represents XLSX workbook
    const workbook = {
      sheets: [] as any[],
      metadata: {
        title: this.getReportTitle(reportType),
        created: new Date().toISOString(),
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString(),
        },
      },
    };

    // Summary sheet
    if (report.summary) {
      workbook.sheets.push({
        name: 'Zusammenfassung',
        data: Object.entries(report.summary).map(([key, value]) => ({
          Kennzahl: this.formatGermanLabel(key),
          Wert: value,
        })),
        styling: {
          headerRow: { bold: true, backgroundColor: '#4472C4', color: '#FFFFFF' },
          columnWidths: [30, 20],
        },
      });
    }

    // Data sheets
    const dataSections = [
      { key: 'byVehicle', name: 'Nach Fahrzeug' },
      { key: 'byDriver', name: 'Nach Fahrer' },
      { key: 'byZone', name: 'Nach Zone' },
      { key: 'byMonth', name: 'Nach Monat' },
      { key: 'byType', name: 'Nach Typ' },
      { key: 'byProvider', name: 'Nach Anbieter' },
    ];

    for (const section of dataSections) {
      if (report[section.key] && report[section.key].length > 0) {
        workbook.sheets.push({
          name: section.name,
          data: report[section.key].map((row: any) => {
            const germanRow: any = {};
            for (const [key, value] of Object.entries(row)) {
              germanRow[this.formatGermanLabel(key)] = value;
            }
            return germanRow;
          }),
          styling: {
            headerRow: { bold: true, backgroundColor: '#4472C4', color: '#FFFFFF' },
            alternatingRows: true,
            numberColumns: this.getNumberColumns(report[section.key][0]),
          },
        });
      }
    }

    return workbook;
  }

  private buildPdfContent(report: any, reportType: string, options: PdfOptions): object {
    // This would use pdfkit or puppeteer in production
    // Return structured data that represents PDF content
    const pdf = {
      metadata: {
        title: options.title,
        created: new Date().toISOString(),
        orientation: options.pageOrientation,
      },
      pages: [] as any[],
    };

    // Title page
    pdf.pages.push({
      type: 'title',
      content: {
        title: options.title,
        subtitle: options.subtitle,
        companyName: options.companyName,
        generatedAt: new Date().toLocaleDateString('de-DE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
    });

    // Summary page
    if (report.summary) {
      pdf.pages.push({
        type: 'summary',
        title: 'Zusammenfassung',
        content: {
          table: Object.entries(report.summary).map(([key, value]) => ({
            label: this.formatGermanLabel(key),
            value: this.formatValue(value),
          })),
        },
      });
    }

    // Chart pages (if enabled)
    if (options.showCharts) {
      if (report.byVehicle) {
        pdf.pages.push({
          type: 'chart',
          title: 'Leistung nach Fahrzeug',
          chartType: 'bar',
          data: report.byVehicle.slice(0, 10).map((v: any) => ({
            label: v.licensePlate,
            value: v.deliveriesCompleted || v.totalLiters || v.utilizationPercent || 0,
          })),
        });
      }

      if (report.byDriver) {
        pdf.pages.push({
          type: 'chart',
          title: 'Leistung nach Fahrer',
          chartType: 'bar',
          data: report.byDriver.slice(0, 10).map((d: any) => ({
            label: d.driverName,
            value: d.deliveriesCompleted || d.netPayEur || 0,
          })),
        });
      }
    }

    // Data tables
    const dataSections = [
      { key: 'byVehicle', title: 'Fahrzeugdetails' },
      { key: 'byDriver', title: 'Fahrerdetails' },
      { key: 'byProvider', title: 'Anbieterdetails' },
    ];

    for (const section of dataSections) {
      if (report[section.key] && report[section.key].length > 0) {
        pdf.pages.push({
          type: 'table',
          title: section.title,
          headers: Object.keys(report[section.key][0]).map(k => this.formatGermanLabel(k)),
          rows: report[section.key].map((row: any) =>
            Object.values(row).map(v => this.formatValue(v)),
          ),
        });
      }
    }

    // Footer
    if (options.includeFooter) {
      pdf.pages.forEach((page, index) => {
        page.footer = {
          text: `Seite ${index + 1} von ${pdf.pages.length}`,
          generatedBy: 'Munich Delivery Fleet Management System',
          confidential: true,
        };
      });
    }

    return pdf;
  }

  private buildHtmlContent(
    report: any,
    reportType: string,
    period: { from: Date; to: Date },
  ): string {
    const title = this.getReportTitle(reportType);
    const periodStr = `${period.from.toLocaleDateString('de-DE')} - ${period.to.toLocaleDateString('de-DE')}`;

    let html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1a1a2e; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .summary h2 { margin-top: 0; color: #4472C4; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .summary-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #4472C4; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .summary-value { font-size: 24px; font-weight: 600; color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #4472C4; color: white; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
    tr:hover { background: #f5f5f5; }
    tr:nth-child(even) { background: #fafafa; }
    .section { margin-top: 40px; }
    .section h2 { color: #1a1a2e; border-bottom: 2px solid #4472C4; padding-bottom: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; text-align: center; }
    .number { text-align: right; }
    .percent { color: #28a745; font-weight: 600; }
    .currency { font-weight: 500; }
    @media print { body { margin: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="subtitle">Berichtszeitraum: ${periodStr}</div>
`;

    // Summary section
    if (report.summary) {
      html += `
    <div class="summary">
      <h2>Zusammenfassung</h2>
      <div class="summary-grid">
`;
      for (const [key, value] of Object.entries(report.summary)) {
        html += `
        <div class="summary-item">
          <div class="summary-label">${this.formatGermanLabel(key)}</div>
          <div class="summary-value">${this.formatValue(value)}</div>
        </div>
`;
      }
      html += `
      </div>
    </div>
`;
    }

    // Data tables
    const sections = [
      { key: 'byVehicle', title: 'Nach Fahrzeug' },
      { key: 'byDriver', title: 'Nach Fahrer' },
      { key: 'byZone', title: 'Nach Zone' },
      { key: 'byMonth', title: 'Nach Monat' },
      { key: 'byType', title: 'Nach Typ' },
      { key: 'byProvider', title: 'Nach Anbieter' },
    ];

    for (const section of sections) {
      if (report[section.key] && report[section.key].length > 0) {
        html += `
    <div class="section">
      <h2>${section.title}</h2>
      <table>
        <thead>
          <tr>
`;
        const headers = Object.keys(report[section.key][0]);
        for (const header of headers) {
          const isNumber = typeof report[section.key][0][header] === 'number';
          html += `            <th${isNumber ? ' class="number"' : ''}>${this.formatGermanLabel(header)}</th>\n`;
        }
        html += `          </tr>
        </thead>
        <tbody>
`;
        for (const row of report[section.key]) {
          html += '          <tr>\n';
          for (const header of headers) {
            const value = row[header];
            const isNumber = typeof value === 'number';
            const formatted = this.formatValue(value);
            const cssClass = isNumber ? ' class="number"' : '';
            html += `            <td${cssClass}>${formatted}</td>\n`;
          }
          html += '          </tr>\n';
        }
        html += `        </tbody>
      </table>
    </div>
`;
      }
    }

    // Footer
    html += `
    <div class="footer">
      <p>Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
      <p>Munich Delivery Fleet Management System</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }

  // =================== EMAIL DELIVERY ===================

  private async sendReportEmail(
    recipients: string[],
    report: ExportResult,
    reportType: string,
    from: Date,
    to: Date,
  ): Promise<void> {
    // In production, this would use a mail service (SendGrid, AWS SES, etc.)
    const subject = `${this.getReportTitle(reportType)} - ${from.toLocaleDateString('de-DE')} bis ${to.toLocaleDateString('de-DE')}`;

    this.logger.log(`Email sent to ${recipients.length} recipients: ${subject}`);

    // Simulate email sending
    for (const recipient of recipients) {
      this.logger.debug(`Report email sent to: ${recipient}`);
    }
  }

  // =================== HELPERS ===================

  private async generateReportData(
    userId: string,
    reportType: string,
    from: Date,
    to: Date,
  ): Promise<any> {
    switch (reportType) {
      case 'fleet_performance':
        return this.reportingService.generateFleetPerformanceReport(userId, from, to);
      case 'fuel_consumption':
        return this.reportingService.generateFuelConsumptionReport(userId, from, to);
      case 'vehicle_utilization':
        return this.reportingService.generateVehicleUtilizationReport(userId, from, to);
      case 'maintenance_cost':
        return this.reportingService.generateMaintenanceCostReport(userId, from, to);
      case 'driver_payout':
        return this.reportingService.generateDriverPayoutReport(userId, from, to);
      case 'courier_reconciliation':
        return this.reportingService.generateCourierReconciliationReport(userId, from, to);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private applyFilters(report: any, filters: ReportTemplate['filters']): any {
    if (!filters) return report;

    const filtered = { ...report };

    if (filters.vehicleIds && filtered.byVehicle) {
      filtered.byVehicle = filtered.byVehicle.filter((v: any) =>
        filters.vehicleIds!.includes(v.vehicleId),
      );
    }

    if (filters.driverIds && filtered.byDriver) {
      filtered.byDriver = filtered.byDriver.filter((d: any) =>
        filters.driverIds!.includes(d.driverId),
      );
    }

    if (filters.zones && filtered.byZone) {
      filtered.byZone = filtered.byZone.filter((z: any) =>
        filters.zones!.includes(z.zone),
      );
    }

    return filtered;
  }

  private calculatePeriod(
    periodType: ReportTemplate['periodType'],
    customDays?: number,
  ): { from: Date; to: Date } {
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    switch (periodType) {
      case 'DAILY':
        from.setDate(from.getDate() - 1);
        break;
      case 'WEEKLY':
        from.setDate(from.getDate() - 7);
        break;
      case 'MONTHLY':
        from.setMonth(from.getMonth() - 1);
        break;
      case 'CUSTOM':
        from.setDate(from.getDate() - (customDays || 30));
        break;
    }

    return { from, to };
  }

  private calculateNextRunTime(schedule: ScheduledReport): Date {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'DAILY':
        if (next <= new Date()) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'WEEKLY':
        while (next.getDay() !== schedule.dayOfWeek || next <= new Date()) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'MONTHLY':
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= new Date()) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  }

  private getReportTitle(reportType: string): string {
    const titles: Record<string, string> = {
      fleet_performance: 'Flottenleistungsbericht',
      fuel_consumption: 'Kraftstoffverbrauchsbericht',
      vehicle_utilization: 'Fahrzeugauslastungsbericht',
      maintenance_cost: 'Wartungskostenbericht',
      driver_payout: 'Fahrerabrechnungsbericht',
      courier_reconciliation: 'Kurier-Abstimmungsbericht',
    };
    return titles[reportType] || reportType;
  }

  private formatGermanLabel(key: string): string {
    const labels: Record<string, string> = {
      vehicleId: 'Fahrzeug-ID',
      licensePlate: 'Kennzeichen',
      driverId: 'Fahrer-ID',
      driverName: 'Fahrername',
      routesCompleted: 'Abgeschl. Routen',
      deliveriesCompleted: 'Abgeschl. Lieferungen',
      deliverySuccessRate: 'Erfolgsquote (%)',
      totalDistanceKm: 'Gesamtstrecke (km)',
      avgDeliveriesPerRoute: 'Ø Lief./Route',
      avgTimePerDeliveryMin: 'Ø Zeit/Lief. (Min.)',
      totalRoutes: 'Gesamte Routen',
      completedRoutes: 'Abgeschlossen',
      partialRoutes: 'Teilweise',
      cancelledRoutes: 'Storniert',
      completionRate: 'Abschlussquote (%)',
      totalDeliveries: 'Gesamte Lieferungen',
      successfulDeliveries: 'Erfolgreiche Lief.',
      failedDeliveries: 'Fehlgeschlagene Lief.',
      avgDistancePerRouteKm: 'Ø Strecke/Route (km)',
      totalLiters: 'Gesamt Liter',
      totalCostEur: 'Gesamtkosten (€)',
      avgPricePerLiter: 'Ø Preis/Liter (€)',
      avgConsumptionLitersPer100km: 'Ø Verbrauch (L/100km)',
      make: 'Marke',
      model: 'Modell',
      fuelType: 'Kraftstoffart',
      distanceKm: 'Strecke (km)',
      consumptionLitersPer100km: 'Verbrauch (L/100km)',
      fillUps: 'Tankungen',
      month: 'Monat',
      liters: 'Liter',
      costEur: 'Kosten (€)',
      avgPrice: 'Ø Preis (€)',
      zone: 'Zone',
      deliveries: 'Lieferungen',
      successRate: 'Erfolgsquote (%)',
      status: 'Status',
      activeDays: 'Aktive Tage',
      maintenanceDays: 'Wartungstage',
      idleDays: 'Ruhetage',
      utilizationPercent: 'Auslastung (%)',
      avgRoutesPerActiveDay: 'Ø Routen/Tag',
      totalVehicles: 'Fahrzeuge gesamt',
      avgUtilizationPercent: 'Ø Auslastung (%)',
      totalWorkingDays: 'Arbeitstage',
      totalActiveDays: 'Aktive Tage gesamt',
      avgDaysActivePerVehicle: 'Ø Tage aktiv/Fahrzeug',
      maintenanceCount: 'Wartungsanzahl',
      lastMaintenance: 'Letzte Wartung',
      nextScheduled: 'Nächste geplant',
      type: 'Typ',
      count: 'Anzahl',
      avgCostEur: 'Ø Kosten (€)',
      avgCostPerVehicle: 'Ø Kosten/Fahrzeug (€)',
      scheduledCount: 'Geplant',
      unscheduledCount: 'Ungeplant',
      partsCostEur: 'Teilekosten (€)',
      laborCostEur: 'Arbeitskosten (€)',
      parcels: 'Pakete',
      grossPayEur: 'Bruttovergütung (€)',
      taxWithholdingEur: 'Steuereinbehalt (€)',
      netPayEur: 'Nettovergütung (€)',
      bonusesEur: 'Boni (€)',
      totalDrivers: 'Fahrer gesamt',
      totalGrossEur: 'Brutto gesamt (€)',
      totalTaxWithholdingEur: 'Steuer gesamt (€)',
      totalNetEur: 'Netto gesamt (€)',
      avgPayoutPerDriver: 'Ø Auszahlung/Fahrer (€)',
      provider: 'Anbieter',
      standardDeliveries: 'Standardlieferungen',
      expressDeliveries: 'Expresslieferungen',
      returns: 'Retouren',
      failed: 'Fehlgeschlagen',
      calculatedAmountEur: 'Berechneter Betrag (€)',
      saturdayBonusEur: 'Samstagsbonus (€)',
      netPaymentEur: 'Nettozahlung (€)',
      totalPaymentEur: 'Zahlung gesamt (€)',
    };

    return labels[key] || key.replace(/([A-Z])/g, ' $1').trim();
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (value instanceof Date) {
      return value.toLocaleDateString('de-DE');
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toLocaleString('de-DE');
      return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }

  private getNumberColumns(sampleRow: any): string[] {
    return Object.entries(sampleRow)
      .filter(([, value]) => typeof value === 'number')
      .map(([key]) => key);
  }

  // =================== REPORT SUMMARY DASHBOARD ===================

  /**
   * Get quick summary for dashboard widget
   */
  async getQuickSummary(userId: string): Promise<{
    todayDeliveries: number;
    weeklyPerformance: number;
    activeVehicles: number;
    scheduledReports: number;
    recentExports: number;
  }> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get today's deliveries
    const todayRoutes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: today,
      },
      include: { stops: true },
    });

    let todayDeliveries = 0;
    for (const route of todayRoutes) {
      todayDeliveries += route.stops.filter(s => s.status === 'DELIVERED').length;
    }

    // Get weekly performance
    const weeklyReport = await this.reportingService.generateFleetPerformanceReport(userId, weekAgo, now);
    const weeklyPerformance = weeklyReport.summary.deliverySuccessRate;

    // Get active vehicles
    const activeVehicles = await this.prisma.vehicle.count({
      where: {
        userId,
        status: { in: ['AVAILABLE', 'IN_USE'] },
      },
    });

    // Get scheduled reports count
    const scheduledReports = Array.from(this.schedules.values())
      .filter(s => s.userId === userId && s.status === 'ACTIVE').length;

    // Get recent exports count (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentExports = Array.from(this.exports.values())
      .filter(e => e.userId === userId && e.createdAt >= sevenDaysAgo).length;

    return {
      todayDeliveries,
      weeklyPerformance,
      activeVehicles,
      scheduledReports,
      recentExports,
    };
  }
}
