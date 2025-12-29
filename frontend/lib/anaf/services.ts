/**
 * ANAF Service Layer
 *
 * Comprehensive service layer for all ANAF endpoints (100+)
 * Organized by domain: ANAF Core, SPV, SAF-T D406, e-Factura B2B/B2C, e-Transport, Deadlines
 */

import { api } from './api-client';

// ============================================
// ANAF Core Services
// ============================================

export const anafService = {
  /**
   * Validate Romanian CUI and get company info
   */
  validateCUI: (cui: string) =>
    api.get(`/anaf/validate-cui/${cui}`),

  /**
   * Generate SAF-T D406 XML per Order 1783/2021
   */
  generateSAFT: (userId: string, period: string) =>
    api.post('/anaf/saft/generate', { userId, period }),

  /**
   * Generate SAF-T D406 XML with Salaries section
   */
  generateSAFTWithPayroll: (userId: string, period: string) =>
    api.post('/anaf/saft/generate-with-payroll', { userId, period }),

  /**
   * Submit SAF-T D406 to ANAF SPV
   */
  submitSAFT: (xml: string, cui: string, period: string) =>
    api.post('/anaf/saft/submit', { xml, cui, period }),

  /**
   * Get ANAF submission deadlines
   */
  getDeadlines: (companyType?: 'small' | 'large' | 'non-resident') =>
    api.get('/anaf/deadlines', { params: { companyType } }),

  /**
   * Generate e-Factura UBL XML
   */
  generateEfactura: (invoice: any) =>
    api.post('/anaf/efactura/generate', invoice),

  /**
   * Submit e-Factura to ANAF SPV
   */
  submitEfactura: (xml: string, cui: string) =>
    api.post('/anaf/efactura/submit', { xml, cui }),

  /**
   * Check e-Factura submission status
   */
  checkEfacturaStatus: (uploadIndex: string) =>
    api.get(`/anaf/efactura/status/${uploadIndex}`),

  /**
   * Download received e-Facturi
   */
  downloadReceived: (cui: string, days: number) =>
    api.get('/anaf/efactura/received', { params: { cui, days } }),
};

// ============================================
// SPV (Spațiul Privat Virtual) Services
// ============================================

export const spvService = {
  /**
   * Get ANAF SPV OAuth2 authorization URL
   */
  getOAuthUrl: () =>
    api.get('/spv/oauth/authorize'),

  /**
   * Disconnect from ANAF SPV
   */
  disconnect: () =>
    api.post('/spv/disconnect'),

  /**
   * Get SPV connection status
   */
  getConnectionStatus: () =>
    api.get('/spv/status'),

  /**
   * Get SPV dashboard summary
   */
  getDashboard: () =>
    api.get('/spv/dashboard'),

  /**
   * Submit e-Factura to ANAF SPV
   */
  submitEfactura: (invoiceId: string) =>
    api.post('/spv/efactura/submit', { invoiceId }),

  /**
   * Check e-Factura submission status
   */
  checkEfacturaStatus: (uploadIndex: string) =>
    api.get(`/spv/efactura/status/${uploadIndex}`),

  /**
   * Download received e-Facturi from ANAF
   */
  downloadReceived: (days?: number) =>
    api.get('/spv/efactura/received', { params: { days } }),

  /**
   * Submit SAF-T D406 to ANAF SPV
   */
  submitSaft: (period: string, xml?: string) =>
    api.post('/spv/saft/submit', { period, xml }),

  /**
   * Get SPV messages/notifications
   */
  getMessages: (limit = 50, offset = 0) =>
    api.get('/spv/messages', { params: { limit, offset } }),

  /**
   * Mark message as read
   */
  markMessageRead: (messageId: string) =>
    api.post('/spv/messages/read', { messageId }),

  /**
   * Get submission history
   */
  getSubmissions: (filters?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get('/spv/submissions', { params: filters }),

  /**
   * Retry a failed submission
   */
  retrySubmission: (submissionId: string) =>
    api.post(`/spv/submissions/${submissionId}/retry`),

  /**
   * Get ANAF submission deadlines
   */
  getDeadlines: (companyType?: 'small' | 'large' | 'non-resident') =>
    api.get('/spv/deadlines', { params: { companyType } }),
};

// ============================================
// SAF-T D406 Services
// ============================================

export const saftD406Service = {
  /**
   * Generate SAF-T D406 Monthly XML
   */
  generate: (userId: string, period: string) =>
    api.post('/saft-d406/generate', { userId, period }),

  /**
   * Preview SAF-T D406 XML
   */
  preview: (userId: string, period: string) =>
    api.get(`/saft-d406/preview/${userId}/${period}`),

  /**
   * Download SAF-T D406 XML file
   */
  download: (userId: string, period: string) => {
    const filename = `SAF-T_D406_${period}_${new Date().toISOString().split('T')[0]}.xml`;
    return api.download(`/saft-d406/download/${userId}/${period}`, filename);
  },

  /**
   * Validate SAF-T D406 data
   */
  validate: (userId: string, period: string) =>
    api.post('/saft-d406/validate', { userId, period }),

  /**
   * Validate raw SAF-T D406 XML
   */
  validateXml: (xml: string) =>
    api.post('/saft-d406/validate-xml', { xml }),

  /**
   * Get pre-submission checklist
   */
  getChecklist: (userId: string, period: string) =>
    api.get(`/saft-d406/checklist/${userId}/${period}`),

  /**
   * Submit SAF-T D406 to ANAF
   */
  submit: (userId: string, period: string) =>
    api.post('/saft-d406/submit', { userId, period }),

  /**
   * Check submission status
   */
  getSubmissionStatus: (userId: string, reference: string) =>
    api.get(`/saft-d406/submission-status/${userId}/${reference}`),

  /**
   * Get compliance status
   */
  getComplianceStatus: (userId: string, period: string) =>
    api.get(`/saft-d406/compliance/${userId}/${period}`),

  /**
   * Get compliance calendar
   */
  getComplianceCalendar: (userId: string, months = 12) =>
    api.get(`/saft-d406/calendar/${userId}`, { params: { months } }),

  /**
   * Get D406 reports history
   */
  getReports: (userId: string, year?: number) =>
    api.get(`/saft-d406/reports/${userId}`, { params: { year } }),

  /**
   * Get ANAF D406 submission deadlines
   */
  getDeadlines: () =>
    api.get('/saft-d406/deadlines'),

  /**
   * Get D406 dashboard
   */
  getDashboard: (userId: string) =>
    api.get(`/saft-d406/dashboard/${userId}`),
};

// ============================================
// e-Factura B2B Services
// ============================================

export const efacturaB2BService = {
  /**
   * Generate e-Factura B2B UBL 2.1 XML
   */
  generateXML: (invoiceId: string, userId: string) =>
    api.post('/efactura-b2b/generate', { invoiceId, userId }),

  /**
   * Preview e-Factura XML
   */
  previewXML: (invoiceId: string, userId: string) =>
    api.get(`/efactura-b2b/preview/${invoiceId}`, { params: { userId } }),

  /**
   * Download e-Factura XML file
   */
  downloadXML: (invoiceId: string, userId: string, invoiceNumber?: string) => {
    const filename = `efactura_${invoiceNumber || invoiceId}_${new Date().toISOString().split('T')[0]}.xml`;
    return api.download(`/efactura-b2b/download/${invoiceId}?userId=${userId}`, filename);
  },

  /**
   * Submit e-Factura to ANAF SPV
   */
  submit: (invoiceId: string, userId: string) =>
    api.post('/efactura-b2b/submit', { invoiceId, userId }),

  /**
   * Check e-Factura submission status
   */
  checkStatus: (uploadIndex: string, userId: string) =>
    api.get(`/efactura-b2b/status/${uploadIndex}`, { params: { userId } }),

  /**
   * Validate e-Factura data
   */
  validate: (invoiceId: string, userId: string) =>
    api.post('/efactura-b2b/validate', { invoiceId, userId }),

  /**
   * Check B2B readiness
   */
  checkReadiness: (userId: string) =>
    api.get(`/efactura-b2b/readiness/${userId}`),

  /**
   * Get B2B compliance calendar
   */
  getComplianceCalendar: () =>
    api.get('/efactura-b2b/compliance-calendar'),

  /**
   * Generate credit note
   */
  generateCreditNote: (
    originalInvoiceId: string,
    creditNoteNumber: string,
    reason: string,
    userId: string,
    linesToCredit?: number[]
  ) =>
    api.post('/efactura-b2b/credit-note', {
      originalInvoiceId,
      creditNoteNumber,
      reason,
      userId,
      linesToCredit,
    }),

  /**
   * Get invoices with e-Factura status
   */
  getInvoices: (
    userId: string,
    filters?: {
      status?: string;
      period?: string;
      limit?: number;
      offset?: number;
    }
  ) =>
    api.get(`/efactura-b2b/invoices/${userId}`, { params: filters }),

  /**
   * Get e-Factura B2B dashboard
   */
  getDashboard: (userId: string) =>
    api.get(`/efactura-b2b/dashboard/${userId}`),
};

// ============================================
// e-Factura B2C Services
// ============================================

export const efacturaB2CService = {
  /**
   * Create B2C invoice
   */
  createInvoice: (invoiceData: {
    invoiceNumber: string;
    invoiceDate?: string;
    invoiceType?: string;
    seller: any;
    buyer: any;
    items: any[];
    currency: string;
    paymentMethod?: string;
    paymentTerms?: string;
    dueDate?: string;
    isPaid?: boolean;
    notes?: string;
  }) =>
    api.post('/efactura-b2c/invoice', invoiceData),

  /**
   * Generate B2C e-Factura XML
   */
  generateXML: (invoiceId: string) =>
    api.get(`/efactura-b2c/xml/${invoiceId}`),

  /**
   * Download B2C e-Factura XML
   */
  downloadXML: (invoiceId: string, invoiceNumber?: string) => {
    const filename = `efactura_b2c_${invoiceNumber || invoiceId}_${new Date().toISOString().split('T')[0]}.xml`;
    return api.download(`/efactura-b2c/download/${invoiceId}`, filename);
  },

  /**
   * Submit B2C invoice to ANAF
   */
  submit: (invoiceId: string) =>
    api.post(`/efactura-b2c/submit/${invoiceId}`),

  /**
   * Check B2C submission status
   */
  checkStatus: (invoiceId: string) =>
    api.get(`/efactura-b2c/status/${invoiceId}`),

  /**
   * Get B2C invoice by ID
   */
  getInvoice: (invoiceId: string) =>
    api.get(`/efactura-b2c/invoice/${invoiceId}`),

  /**
   * Get B2C invoices by seller CUI
   */
  getInvoicesBySeller: (cui: string) =>
    api.get('/efactura-b2c/invoices', { params: { cui } }),

  /**
   * Get submission history
   */
  getSubmissionHistory: (invoiceId: string) =>
    api.get(`/efactura-b2c/history/${invoiceId}`),

  /**
   * Validate B2C invoice
   */
  validate: (invoice: any) =>
    api.post('/efactura-b2c/validate', { invoice }),

  /**
   * Get B2C invoice types
   */
  getInvoiceTypes: () =>
    api.get('/efactura-b2c/config/invoice-types'),

  /**
   * Get consumer types
   */
  getConsumerTypes: () =>
    api.get('/efactura-b2c/config/consumer-types'),

  /**
   * Get VAT rates (Legea 141/2025)
   */
  getVatRates: () =>
    api.get('/efactura-b2c/config/vat-rates'),

  /**
   * Get retention info (10-year requirement)
   */
  getRetentionInfo: () =>
    api.get('/efactura-b2c/config/retention'),

  /**
   * Get B2C compliance status
   */
  getComplianceStatus: () =>
    api.get('/efactura-b2c/compliance/status'),
};

// ============================================
// e-Transport Services
// ============================================

export const eTransportService = {
  /**
   * Create new e-Transport declaration per OUG 41/2022
   */
  createDeclaration: (userId: string, transportData: {
    declarationType: string;
    sender: any;
    receiver: any;
    transport: any;
    route: any;
    goods: any[];
  }) =>
    api.post('/e-transport', { userId, ...transportData }),

  /**
   * Validate e-Transport declaration
   */
  validate: (id: string) =>
    api.post(`/e-transport/${id}/validate`),

  /**
   * Submit e-Transport declaration to ANAF for UIT
   */
  submit: (id: string) =>
    api.post(`/e-transport/${id}/submit`),

  /**
   * Check e-Transport declaration status with ANAF
   */
  checkStatus: (id: string) =>
    api.get(`/e-transport/${id}/status`),

  /**
   * Mark transport as started (requires UIT)
   */
  startTransport: (id: string) =>
    api.put(`/e-transport/${id}/start`),

  /**
   * Mark transport as completed
   */
  completeTransport: (id: string) =>
    api.put(`/e-transport/${id}/complete`),

  /**
   * Cancel e-Transport declaration
   */
  cancel: (id: string, reason: string) =>
    api.delete(`/e-transport/${id}`, { data: { reason } }),

  /**
   * Get e-Transport declaration by ID
   */
  getDeclaration: (id: string) =>
    api.get(`/e-transport/${id}`),

  /**
   * Get all e-Transport declarations for user
   */
  getUserDeclarations: (userId: string, status?: string) =>
    api.get('/e-transport', { params: { userId, status } }),

  /**
   * Get active transports (with UIT or in transit)
   */
  getActiveTransports: (userId: string) =>
    api.get('/e-transport/active', { params: { userId } }),

  /**
   * Get e-Transport statistics for user
   */
  getStatistics: (userId: string) =>
    api.get('/e-transport/statistics', { params: { userId } }),

  /**
   * Create e-Transport declaration from delivery route
   */
  createFromRoute: (userId: string, routeId: string) =>
    api.post(`/e-transport/from-route/${routeId}`, null, { params: { userId } }),

  /**
   * Get available goods categories
   */
  getGoodsCategories: () =>
    api.get('/e-transport/categories'),

  /**
   * Get available transport types
   */
  getTransportTypes: () =>
    api.get('/e-transport/transport-types'),
};

// ============================================
// SAF-T Core Services (Alias)
// ============================================

export const saftService = {
  /**
   * Get SAF-T submission status overview
   */
  getStatus: () =>
    api.get('/saft/status'),

  /**
   * Get ANAF SAF-T submission deadlines
   */
  getDeadlines: () =>
    api.get('/saft/deadlines'),

  /**
   * Get SAF-T compliance status for a period
   */
  getComplianceStatus: (userId: string, period: string) =>
    api.get(`/saft/compliance/${userId}/${period}`),

  /**
   * Validate SAF-T data
   */
  validate: (userId: string, period: string) =>
    api.post('/saft/validate', { userId, period }),
};

// ============================================
// Deadline Reminder Services
// ============================================

export const deadlineService = {
  /**
   * Get deadline configurations
   */
  getConfigs: () =>
    api.get('/deadlines/configs'),

  /**
   * Get upcoming deadlines
   */
  getUpcoming: (days = 30) =>
    api.get('/deadlines/upcoming', { params: { days } }),

  /**
   * Get overdue deadlines
   */
  getOverdue: () =>
    api.get('/deadlines/overdue'),

  /**
   * Get deadline summary
   */
  getSummary: () =>
    api.get('/deadlines/summary'),

  /**
   * Mark deadline as completed
   */
  markCompleted: (id: string) =>
    api.post(`/deadlines/${id}/complete`),

  /**
   * Create custom deadline reminder
   */
  createCustom: (
    userId: string,
    type: string,
    description: string,
    dueDate: string,
    reminderDays?: number[]
  ) =>
    api.post('/deadlines/custom', {
      userId,
      type,
      description,
      dueDate,
      reminderDays,
    }),
};

// ============================================
// Export All Services
// ============================================

export default {
  anaf: anafService,
  spv: spvService,
  saftD406: saftD406Service,
  efacturaB2B: efacturaB2BService,
  efacturaB2C: efacturaB2CService,
  eTransport: eTransportService,
  saft: saftService,
  deadlines: deadlineService,
};
