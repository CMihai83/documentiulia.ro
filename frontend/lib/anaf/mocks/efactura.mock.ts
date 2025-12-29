/**
 * e-Factura Mock Data
 * B2B and B2C invoice data for development
 */

import type {
  EfacturaB2BInvoice,
  EfacturaB2BReadiness,
  EfacturaB2BDashboard,
  B2CInvoice,
  B2CSubmissionResult,
  VatRate,
  B2CComplianceStatus,
} from '../types';

// ============================================
// e-Factura B2B Mock Data
// ============================================

export const mockEfacturaB2BInvoices: EfacturaB2BInvoice[] = [
  {
    id: 'inv_001',
    invoiceNumber: 'FAC-2025-001',
    invoiceDate: new Date('2025-01-15'),
    dueDate: new Date('2025-02-14'),
    partnerName: 'SC Client Test SRL',
    partnerCui: '87654321',
    grossAmount: 5950,
    currency: 'RON',
    efacturaStatus: 'ACCEPTED',
    efacturaId: '1234567890',
    spvSubmittedAt: new Date('2025-01-15T10:30:00Z'),
  },
  {
    id: 'inv_002',
    invoiceNumber: 'FAC-2025-002',
    invoiceDate: new Date('2025-01-18'),
    dueDate: new Date('2025-02-17'),
    partnerName: 'SC Partner Demo SRL',
    partnerCui: '11223344',
    grossAmount: 2380,
    currency: 'RON',
    efacturaStatus: 'SUBMITTED',
    efacturaId: '2345678901',
    spvSubmittedAt: new Date('2025-01-18T14:15:00Z'),
  },
  {
    id: 'inv_003',
    invoiceNumber: 'FAC-2025-003',
    invoiceDate: new Date('2025-01-20'),
    dueDate: new Date('2025-03-20'),
    partnerName: 'SC Buyer Example SRL',
    partnerCui: '55667788',
    grossAmount: 11900,
    currency: 'RON',
    efacturaStatus: 'DRAFT',
  },
  {
    id: 'inv_004',
    invoiceNumber: 'FAC-2025-004',
    invoiceDate: new Date('2025-01-22'),
    dueDate: new Date('2025-02-21'),
    partnerName: 'SC Commerce Test SRL',
    partnerCui: '99887766',
    grossAmount: 714,
    currency: 'RON',
    efacturaStatus: 'REJECTED',
    efacturaId: '3456789012',
    spvSubmittedAt: new Date('2025-01-22T09:00:00Z'),
  },
  {
    id: 'inv_005',
    invoiceNumber: 'FAC-2025-005',
    invoiceDate: new Date('2025-01-23'),
    partnerName: 'SC Enterprise Demo SRL',
    partnerCui: '22334455',
    grossAmount: 4760,
    currency: 'EUR',
    efacturaStatus: 'DRAFT',
  },
];

export const mockEfacturaB2BReadiness: EfacturaB2BReadiness = {
  ready: true,
  complianceScore: 92,
  recommendations: [
    {
      field: 'iban',
      message: 'Adăugați cont IBAN pentru plăți automate',
      priority: 'medium',
    },
    {
      field: 'regCom',
      message: 'Completați numărul de înregistrare la Registrul Comerțului',
      priority: 'low',
    },
  ],
  user: {
    name: 'SC Demo Company SRL',
    cui: '12345678',
  },
};

export const mockEfacturaB2BReadinessLow: EfacturaB2BReadiness = {
  ready: false,
  complianceScore: 45,
  recommendations: [
    {
      field: 'cui',
      message: 'CUI lipsă - completați în setările companiei',
      priority: 'high',
    },
    {
      field: 'address',
      message: 'Adresa completă lipsă',
      priority: 'high',
    },
    {
      field: 'county',
      message: 'Județul lipsă',
      priority: 'high',
    },
    {
      field: 'iban',
      message: 'Cont IBAN lipsă',
      priority: 'medium',
    },
  ],
  user: {
    name: 'Test Company',
  },
};

export const mockEfacturaB2BDashboard: EfacturaB2BDashboard = {
  user: {
    company: 'SC Demo Company SRL',
    cui: '12345678',
  },
  spvConnection: {
    connected: true,
    features: {
      efactura: true,
      saft: true,
      eTransport: true,
    },
  },
  stats: {
    monthlyInvoices: 24,
    pendingSubmissions: 2,
    currentMonth: '2025-01',
  },
  readiness: {
    ready: true,
    score: 92,
    recommendations: mockEfacturaB2BReadiness.recommendations.slice(0, 3),
  },
  compliance: {
    currentPhase: 'Voluntar',
    nextDeadline: 'e-Factura B2B obligatorie din iulie 2026',
  },
  recentSubmissions: [
    {
      id: 'sub_001',
      uploadIndex: '1234567890',
      status: 'ACCEPTED',
      submittedAt: new Date('2025-01-15T10:30:00Z'),
    },
    {
      id: 'sub_002',
      uploadIndex: '2345678901',
      status: 'SUBMITTED',
      submittedAt: new Date('2025-01-18T14:15:00Z'),
    },
  ],
  alerts: [
    {
      type: 'info',
      message: 'e-Factura B2B devine obligatorie din iulie 2026',
      details: '2 facturi în așteptare pentru transmitere',
    },
  ],
};

// ============================================
// e-Factura B2C Mock Data
// ============================================

export const mockB2CInvoices: B2CInvoice[] = [
  {
    id: 'b2c_001',
    invoiceNumber: 'FACB2C-2025-001',
    invoiceDate: new Date('2025-01-10'),
    invoiceType: 'STANDARD',
    seller: {
      cui: '12345678',
      name: 'SC Demo Company SRL',
      address: 'Str. Exemplu nr. 10',
      city: 'București',
      county: 'București',
      country: 'RO',
      postalCode: '010101',
      vatPayer: true,
      tradeRegister: 'J40/1234/2020',
      iban: 'RO49AAAA1B31007593840000',
      bank: 'Banca Demo',
      email: 'contact@democompany.ro',
      phone: '+40212345678',
    },
    buyer: {
      type: 'INDIVIDUAL',
      name: 'Popescu Ion',
      cnp: '1850101123456',
      address: 'Str. Client nr. 5',
      city: 'București',
      country: 'RO',
      email: 'ion.popescu@example.com',
      phone: '+40712345678',
    },
    items: [
      {
        lineNumber: 1,
        description: 'Servicii consultanță IT',
        quantity: 10,
        unitOfMeasure: 'oră',
        unitPrice: 250,
        vatRate: 19,
        vatCategory: 'S',
        netAmount: 2500,
        vatAmount: 475,
        grossAmount: 2975,
      },
    ],
    currency: 'RON',
    netTotal: 2500,
    vatTotal: 475,
    grossTotal: 2975,
    paymentMethod: 'Transfer bancar',
    paymentTerms: '14 zile',
    dueDate: new Date('2025-01-24'),
    isPaid: true,
    notes: 'Plată efectuată prin transfer bancar',
  },
  {
    id: 'b2c_002',
    invoiceNumber: 'FACB2C-2025-002',
    invoiceDate: new Date('2025-01-12'),
    invoiceType: 'SIMPLIFIED',
    seller: {
      cui: '12345678',
      name: 'SC Demo Company SRL',
      address: 'Str. Exemplu nr. 10',
      city: 'București',
      county: 'București',
      country: 'RO',
      vatPayer: true,
    },
    buyer: {
      type: 'INDIVIDUAL',
      name: 'Ionescu Maria',
      country: 'RO',
    },
    items: [
      {
        lineNumber: 1,
        description: 'Produse software',
        quantity: 1,
        unitOfMeasure: 'buc',
        unitPrice: 119,
        vatRate: 19,
        vatCategory: 'S',
        netAmount: 100,
        vatAmount: 19,
        grossAmount: 119,
      },
    ],
    currency: 'RON',
    netTotal: 100,
    vatTotal: 19,
    grossTotal: 119,
    isPaid: false,
  },
];

export const mockB2CSubmissionResult: B2CSubmissionResult = {
  success: true,
  invoiceId: 'b2c_001',
  uploadIndex: '9876543210',
  status: 'SUBMITTED',
  message: 'Factura B2C a fost transmisă cu succes către ANAF',
};

export const mockVatRates: VatRate[] = [
  {
    value: 19,
    label: '19% Standard',
    labelRo: '19% Cota Standard',
    category: 'S',
    validUntil: '2025-07-31',
  },
  {
    value: 21,
    label: '21% Standard (Aug 2025+)',
    labelRo: '21% Cota Standard (Aug 2025+)',
    category: 'S',
    validFrom: '2025-08-01',
  },
  {
    value: 9,
    label: '9% Reduced',
    labelRo: '9% Cota Redusă',
    category: 'AA',
    validUntil: '2025-07-31',
  },
  {
    value: 11,
    label: '11% Reduced (Aug 2025+)',
    labelRo: '11% Cota Redusă (Aug 2025+)',
    category: 'AA',
    validFrom: '2025-08-01',
  },
  {
    value: 5,
    label: '5% Special',
    labelRo: '5% Cota Specială',
    category: 'Z',
  },
  {
    value: 0,
    label: '0% Exempt',
    labelRo: '0% Scutit',
    category: 'E',
  },
];

export const mockB2CComplianceStatus: B2CComplianceStatus = {
  phase: 'MANDATORY',
  phaseRo: 'Obligatoriu',
  mandatoryFrom: '2025-01-01',
  isMandatory: true,
  daysUntilMandatory: 0,
  requirements: [
    { requirement: 'UBL 2.1 Format', fulfilled: true },
    { requirement: 'CIUS-RO Compliance', fulfilled: true },
    { requirement: '10-Year Retention', fulfilled: true },
    { requirement: 'RO Platform Integration', fulfilled: true },
  ],
  nextSteps: ['Transmiteți toate facturile B2C prin e-Factura'],
};
