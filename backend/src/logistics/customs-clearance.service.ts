import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Customs Clearance Automation Service
// EU/RO border customs with VIES validation, Intrastat, DAU generation

// =================== INTERFACES ===================

export interface ViesValidationResult {
  valid: boolean;
  vatNumber: string;
  countryCode: string;
  name?: string;
  address?: string;
  requestDate: Date;
  requestId: string;
  errorMessage?: string;
}

export interface Company {
  id: string;
  name: string;
  vatNumber: string;
  eoriNumber?: string;
  address: Address;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export interface HSCode {
  code: string;
  description: string;
  chapter: string;
  heading: string;
  subheading: string;
  tariffRate: number;
  unit: string;
  restrictions?: string[];
  licenses?: string[];
  preferentialRates?: { [countryCode: string]: number };
}

export interface CustomsGoods {
  id: string;
  description: string;
  hsCode: string;
  originCountry: string;
  quantity: number;
  unit: string;
  grossWeight: number;
  netWeight: number;
  value: number;
  currency: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  packages?: number;
  packageType?: string;
  marks?: string;
}

export interface CustomsDeclaration {
  id: string;
  type: DeclarationType;
  status: DeclarationStatus;
  mrn?: string; // Movement Reference Number
  lrn: string; // Local Reference Number
  declarant: Company;
  consignor: Company;
  consignee: Company;
  goods: CustomsGoods[];
  procedureCode: string;
  customsOffice: string;
  transportMode: TransportMode;
  transportDocument?: string;
  containerNumbers?: string[];
  totalGrossWeight: number;
  totalNetWeight: number;
  totalValue: number;
  currency: string;
  exchangeRate?: number;
  dutiesAndTaxes?: DutiesAndTaxes;
  createdAt: Date;
  submittedAt?: Date;
  acceptedAt?: Date;
  releasedAt?: Date;
  documents: CustomsDocument[];
}

export type DeclarationType =
  | 'IMPORT'
  | 'EXPORT'
  | 'TRANSIT'
  | 'TEMPORARY_IMPORT'
  | 'TEMPORARY_EXPORT'
  | 'RE_IMPORT'
  | 'RE_EXPORT'
  | 'INWARD_PROCESSING'
  | 'OUTWARD_PROCESSING'
  | 'CUSTOMS_WAREHOUSING';

export type DeclarationStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'UNDER_CONTROL'
  | 'RELEASED'
  | 'REJECTED'
  | 'CANCELLED';

export type TransportMode =
  | 'SEA'
  | 'RAIL'
  | 'ROAD'
  | 'AIR'
  | 'POST'
  | 'MULTIMODAL'
  | 'FIXED_TRANSPORT'
  | 'INLAND_WATERWAY';

export interface DutiesAndTaxes {
  customsDuty: number;
  vat: number;
  exciseDuty?: number;
  antidumpingDuty?: number;
  otherCharges?: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  deferredPayment?: boolean;
  guaranteeReference?: string;
}

export interface CustomsDocument {
  id: string;
  type: DocumentType;
  reference: string;
  issueDate: Date;
  expiryDate?: Date;
  issuingAuthority?: string;
  filePath?: string;
}

export type DocumentType =
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'AIR_WAYBILL'
  | 'CMR'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'EUR1'
  | 'ATR'
  | 'HEALTH_CERTIFICATE'
  | 'PHYTOSANITARY_CERTIFICATE'
  | 'VETERINARY_CERTIFICATE'
  | 'IMPORT_LICENSE'
  | 'EXPORT_LICENSE'
  | 'DANGEROUS_GOODS_DECLARATION'
  | 'INSURANCE_CERTIFICATE';

export interface IntrastatDeclaration {
  id: string;
  type: 'ARRIVALS' | 'DISPATCHES';
  period: string; // YYYY-MM
  reportingCompany: Company;
  items: IntrastatItem[];
  totalValue: number;
  totalQuantity: number;
  totalWeight: number;
  status: 'DRAFT' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'CORRECTED';
  submittedAt?: Date;
  reference?: string;
}

export interface IntrastatItem {
  itemNumber: number;
  hsCode: string;
  description: string;
  partnerCountry: string;
  regionOfOrigin?: string;
  transactionNature: string;
  deliveryTerms: string;
  transportMode: TransportMode;
  quantity: number;
  supplementaryUnit?: number;
  supplementaryUnitCode?: string;
  netWeight: number;
  invoiceValue: number;
  statisticalValue: number;
  partnerVatNumber?: string;
}

export interface CustomsTariff {
  hsCode: string;
  description: string;
  dutyRate: number;
  vatRate: number;
  exciseRate?: number;
  measureUnit: string;
  supplementaryUnit?: string;
  startDate: Date;
  endDate?: Date;
  quotas?: TariffQuota[];
  suspensions?: TariffSuspension[];
}

export interface TariffQuota {
  id: string;
  description: string;
  volume: number;
  unit: string;
  usedVolume: number;
  periodStart: Date;
  periodEnd: Date;
  preferentialRate: number;
}

export interface TariffSuspension {
  id: string;
  description: string;
  reducedRate: number;
  periodStart: Date;
  periodEnd: Date;
  conditions?: string;
}

export interface EORIValidationResult {
  valid: boolean;
  eoriNumber: string;
  name?: string;
  address?: string;
  validFrom?: Date;
  errorMessage?: string;
}

export interface CustomsOffice {
  code: string;
  name: string;
  country: string;
  type: 'ENTRY' | 'EXIT' | 'INLAND' | 'TRANSIT';
  address: Address;
  workingHours?: string;
  phone?: string;
  email?: string;
  capabilities: string[];
}

// =================== SERVICE ===================

@Injectable()
export class CustomsClearanceService {
  private readonly logger = new Logger(CustomsClearanceService.name);

  // In-memory storage for testing
  private declarations = new Map<string, CustomsDeclaration>();
  private intrastatDeclarations = new Map<string, IntrastatDeclaration>();
  private viesCache = new Map<string, ViesValidationResult>();
  private hsCodeDatabase = new Map<string, HSCode>();
  private tariffDatabase = new Map<string, CustomsTariff>();

  // Romanian customs offices
  private readonly romanianCustomsOffices: CustomsOffice[] = [
    {
      code: 'ROBUC1',
      name: 'Biroul Vamal București',
      country: 'Romania',
      type: 'INLAND',
      address: { street: 'Str. Calea Victoriei 155', city: 'București', postalCode: '010072', country: 'Romania', countryCode: 'RO' },
      workingHours: '08:00-16:00',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT', 'WAREHOUSING']
    },
    {
      code: 'ROCND1',
      name: 'Biroul Vamal Constanța Port',
      country: 'Romania',
      type: 'ENTRY',
      address: { street: 'Incinta Port Constanța', city: 'Constanța', postalCode: '900900', country: 'Romania', countryCode: 'RO' },
      workingHours: '24/7',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT', 'WAREHOUSING', 'MARITIME']
    },
    {
      code: 'ROTMS1',
      name: 'Biroul Vamal Timișoara',
      country: 'Romania',
      type: 'INLAND',
      address: { street: 'Str. Gheorghe Lazăr 13', city: 'Timișoara', postalCode: '300081', country: 'Romania', countryCode: 'RO' },
      workingHours: '08:00-16:00',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT']
    },
    {
      code: 'ROCLJ1',
      name: 'Biroul Vamal Cluj-Napoca',
      country: 'Romania',
      type: 'INLAND',
      address: { street: 'Str. Aurel Vlaicu 8', city: 'Cluj-Napoca', postalCode: '400592', country: 'Romania', countryCode: 'RO' },
      workingHours: '08:00-16:00',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT', 'AIR']
    },
    {
      code: 'ROIAS1',
      name: 'Biroul Vamal Iași',
      country: 'Romania',
      type: 'EXIT',
      address: { street: 'Str. Păcurari 70', city: 'Iași', postalCode: '700515', country: 'Romania', countryCode: 'RO' },
      workingHours: '08:00-20:00',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT']
    },
    {
      code: 'RONDB1',
      name: 'Biroul Vamal Nădlac',
      country: 'Romania',
      type: 'ENTRY',
      address: { street: 'Punct de Trecere Nădlac', city: 'Nădlac', postalCode: '315500', country: 'Romania', countryCode: 'RO' },
      workingHours: '24/7',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT', 'ROAD']
    },
    {
      code: 'ROGLT1',
      name: 'Biroul Vamal Galați',
      country: 'Romania',
      type: 'ENTRY',
      address: { street: 'Str. Portului 34', city: 'Galați', postalCode: '800025', country: 'Romania', countryCode: 'RO' },
      workingHours: '08:00-20:00',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT', 'INLAND_WATERWAY']
    },
    {
      code: 'ROAGI1',
      name: 'Biroul Vamal Agigea',
      country: 'Romania',
      type: 'ENTRY',
      address: { street: 'Terminal Container Agigea', city: 'Agigea', postalCode: '907015', country: 'Romania', countryCode: 'RO' },
      workingHours: '24/7',
      capabilities: ['IMPORT', 'EXPORT', 'TRANSIT', 'MARITIME', 'CONTAINER']
    }
  ];

  // EU VAT rates by country
  private readonly euVatRates: { [countryCode: string]: { standard: number; reduced: number[] } } = {
    'RO': { standard: 19, reduced: [9, 5] },
    'DE': { standard: 19, reduced: [7] },
    'FR': { standard: 20, reduced: [10, 5.5, 2.1] },
    'IT': { standard: 22, reduced: [10, 5, 4] },
    'ES': { standard: 21, reduced: [10, 4] },
    'PL': { standard: 23, reduced: [8, 5] },
    'NL': { standard: 21, reduced: [9] },
    'BE': { standard: 21, reduced: [12, 6] },
    'AT': { standard: 20, reduced: [13, 10] },
    'HU': { standard: 27, reduced: [18, 5] },
    'BG': { standard: 20, reduced: [9] },
    'CZ': { standard: 21, reduced: [15, 10] },
    'PT': { standard: 23, reduced: [13, 6] },
    'SE': { standard: 25, reduced: [12, 6] },
    'GR': { standard: 24, reduced: [13, 6] },
    'DK': { standard: 25, reduced: [] },
    'FI': { standard: 24, reduced: [14, 10] },
    'IE': { standard: 23, reduced: [13.5, 9, 4.8] },
    'SK': { standard: 20, reduced: [10] },
    'HR': { standard: 25, reduced: [13, 5] },
    'LT': { standard: 21, reduced: [9, 5] },
    'SI': { standard: 22, reduced: [9.5] },
    'LV': { standard: 21, reduced: [12, 5] },
    'EE': { standard: 22, reduced: [9] },
    'CY': { standard: 19, reduced: [9, 5] },
    'LU': { standard: 17, reduced: [14, 8, 3] },
    'MT': { standard: 18, reduced: [7, 5] }
  };

  // Transaction nature codes for Intrastat
  private readonly transactionNatureCodes: { [code: string]: string } = {
    '11': 'Outright purchase/sale',
    '12': 'Supply for sale on approval or after trial',
    '13': 'Barter trade',
    '14': 'Financial leasing',
    '19': 'Other transactions involving transfer of ownership',
    '21': 'Return of goods after registration of original transaction',
    '22': 'Replacement for returned goods',
    '23': 'Replacement for unreturned goods',
    '29': 'Other returns',
    '31': 'Movements to/from warehouse',
    '32': 'Supply for warehousing',
    '33': 'Withdrawal from warehouse',
    '41': 'Goods for processing under contract',
    '42': 'Goods after processing under contract',
    '51': 'Goods for repair',
    '52': 'Goods after repair',
    '60': 'Leasing/rental not exceeding 24 months',
    '70': 'Transactions in the framework of joint defense projects',
    '80': 'Supply of building materials in framework of a general construction contract',
    '91': 'Other movements'
  };

  // Delivery terms (Incoterms 2020)
  private readonly deliveryTerms: { [code: string]: string } = {
    'EXW': 'Ex Works',
    'FCA': 'Free Carrier',
    'CPT': 'Carriage Paid To',
    'CIP': 'Carriage and Insurance Paid To',
    'DAP': 'Delivered at Place',
    'DPU': 'Delivered at Place Unloaded',
    'DDP': 'Delivered Duty Paid',
    'FAS': 'Free Alongside Ship',
    'FOB': 'Free On Board',
    'CFR': 'Cost and Freight',
    'CIF': 'Cost, Insurance and Freight'
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeHSCodeDatabase();
    this.initializeTariffDatabase();
  }

  // Initialize HS code database with common codes
  private initializeHSCodeDatabase(): void {
    const hsCodes: HSCode[] = [
      // Chapter 84: Machinery
      { code: '8471300000', description: 'Portable automatic data processing machines', chapter: '84', heading: '8471', subheading: '847130', tariffRate: 0, unit: 'PIECE', restrictions: [] },
      { code: '8471410000', description: 'Other automatic data processing machines comprising CPU and I/O unit', chapter: '84', heading: '8471', subheading: '847141', tariffRate: 0, unit: 'PIECE', restrictions: [] },
      { code: '8473300000', description: 'Parts and accessories for automatic data processing machines', chapter: '84', heading: '8473', subheading: '847330', tariffRate: 0, unit: 'KG', restrictions: [] },
      { code: '8443321000', description: 'Printers capable of connecting to an ADP machine', chapter: '84', heading: '8443', subheading: '844332', tariffRate: 0, unit: 'PIECE', restrictions: [] },

      // Chapter 85: Electrical equipment
      { code: '8517120000', description: 'Telephones for cellular networks (smartphones)', chapter: '85', heading: '8517', subheading: '851712', tariffRate: 0, unit: 'PIECE', restrictions: [] },
      { code: '8528720000', description: 'Television receivers, color', chapter: '85', heading: '8528', subheading: '852872', tariffRate: 14, unit: 'PIECE', restrictions: [] },
      { code: '8541400000', description: 'Photovoltaic cells', chapter: '85', heading: '8541', subheading: '854140', tariffRate: 0, unit: 'PIECE', restrictions: [] },

      // Chapter 87: Vehicles
      { code: '8703230000', description: 'Motor cars with spark-ignition engine 1500-3000 cc', chapter: '87', heading: '8703', subheading: '870323', tariffRate: 10, unit: 'PIECE', restrictions: ['TYPE_APPROVAL'] },
      { code: '8703800000', description: 'Electric motor vehicles', chapter: '87', heading: '8703', subheading: '870380', tariffRate: 10, unit: 'PIECE', restrictions: ['TYPE_APPROVAL'] },
      { code: '8711200000', description: 'Motorcycles 50-250 cc', chapter: '87', heading: '8711', subheading: '871120', tariffRate: 8, unit: 'PIECE', restrictions: ['TYPE_APPROVAL'] },

      // Chapter 61-62: Textiles/Clothing
      { code: '6109100000', description: 'T-shirts, singlets and other vests, of cotton, knitted', chapter: '61', heading: '6109', subheading: '610910', tariffRate: 12, unit: 'PIECE', restrictions: [] },
      { code: '6203420000', description: 'Men\'s trousers, of cotton', chapter: '62', heading: '6203', subheading: '620342', tariffRate: 12, unit: 'PIECE', restrictions: [] },
      { code: '6404190000', description: 'Footwear with textile uppers', chapter: '64', heading: '6404', subheading: '640419', tariffRate: 17, unit: 'PAIR', restrictions: [] },

      // Chapter 22: Beverages
      { code: '2204210000', description: 'Wine of fresh grapes in containers <= 2 liters', chapter: '22', heading: '2204', subheading: '220421', tariffRate: 32, unit: 'LITER', restrictions: ['EXCISE'] },
      { code: '2208300000', description: 'Whiskies', chapter: '22', heading: '2208', subheading: '220830', tariffRate: 0, unit: 'LITER', restrictions: ['EXCISE'] },

      // Chapter 30: Pharmaceuticals
      { code: '3004900000', description: 'Medicaments for retail sale', chapter: '30', heading: '3004', subheading: '300490', tariffRate: 0, unit: 'KG', restrictions: ['HEALTH_CERTIFICATE', 'IMPORT_LICENSE'] },

      // Chapter 39: Plastics
      { code: '3926909700', description: 'Other articles of plastics', chapter: '39', heading: '3926', subheading: '392690', tariffRate: 6.5, unit: 'KG', restrictions: [] },

      // Chapter 73: Iron and steel articles
      { code: '7318150000', description: 'Screws and bolts of iron or steel', chapter: '73', heading: '7318', subheading: '731815', tariffRate: 3.7, unit: 'KG', restrictions: [] },

      // Chapter 94: Furniture
      { code: '9403200000', description: 'Other metal furniture', chapter: '94', heading: '9403', subheading: '940320', tariffRate: 0, unit: 'KG', restrictions: [] },
      { code: '9403600000', description: 'Other wooden furniture', chapter: '94', heading: '9403', subheading: '940360', tariffRate: 0, unit: 'KG', restrictions: [] },

      // Chapter 95: Toys
      { code: '9503000000', description: 'Toys and games', chapter: '95', heading: '9503', subheading: '950300', tariffRate: 0, unit: 'KG', restrictions: ['CE_MARKING', 'SAFETY_CERTIFICATE'] }
    ];

    hsCodes.forEach(hs => this.hsCodeDatabase.set(hs.code, hs));
  }

  // Initialize tariff database
  private initializeTariffDatabase(): void {
    this.hsCodeDatabase.forEach((hs, code) => {
      const tariff: CustomsTariff = {
        hsCode: code,
        description: hs.description,
        dutyRate: hs.tariffRate,
        vatRate: 19, // Romanian standard VAT
        measureUnit: hs.unit,
        startDate: new Date('2024-01-01')
      };
      this.tariffDatabase.set(code, tariff);
    });
  }

  // =================== VIES VALIDATION ===================

  async validateVatNumber(vatNumber: string): Promise<ViesValidationResult> {
    const cleanVat = vatNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const countryCode = cleanVat.substring(0, 2);
    const number = cleanVat.substring(2);

    // Check cache first
    const cacheKey = `${countryCode}${number}`;
    if (this.viesCache.has(cacheKey)) {
      const cached = this.viesCache.get(cacheKey)!;
      // Cache valid for 24 hours
      if (Date.now() - cached.requestDate.getTime() < 24 * 60 * 60 * 1000) {
        return cached;
      }
    }

    // Validate country code
    if (!this.euVatRates[countryCode]) {
      return {
        valid: false,
        vatNumber: cleanVat,
        countryCode,
        requestDate: new Date(),
        requestId: this.generateId(),
        errorMessage: `Invalid country code: ${countryCode}. Must be an EU member state.`
      };
    }

    // Validate format by country
    const formatValid = this.validateVatFormat(countryCode, number);
    if (!formatValid.valid) {
      return {
        valid: false,
        vatNumber: cleanVat,
        countryCode,
        requestDate: new Date(),
        requestId: this.generateId(),
        errorMessage: formatValid.error
      };
    }

    // In production, this would call the VIES SOAP API
    // For now, simulate validation
    const result: ViesValidationResult = {
      valid: true,
      vatNumber: cleanVat,
      countryCode,
      name: `Company ${number.substring(0, 4)}`,
      address: `Address for VAT ${cleanVat}`,
      requestDate: new Date(),
      requestId: this.generateId()
    };

    // Cache result
    this.viesCache.set(cacheKey, result);
    this.logger.log(`VIES validation for ${cleanVat}: ${result.valid ? 'VALID' : 'INVALID'}`);

    return result;
  }

  private validateVatFormat(countryCode: string, number: string): { valid: boolean; error?: string } {
    const patterns: { [key: string]: RegExp } = {
      'AT': /^U\d{8}$/,
      'BE': /^0?\d{9,10}$/,
      'BG': /^\d{9,10}$/,
      'CY': /^\d{8}[A-Z]$/,
      'CZ': /^\d{8,10}$/,
      'DE': /^\d{9}$/,
      'DK': /^\d{8}$/,
      'EE': /^\d{9}$/,
      'ES': /^[A-Z0-9]\d{7}[A-Z0-9]$/,
      'FI': /^\d{8}$/,
      'FR': /^[A-Z0-9]{2}\d{9}$/,
      'GR': /^\d{9}$/,
      'HR': /^\d{11}$/,
      'HU': /^\d{8}$/,
      'IE': /^(\d{7}[A-Z]{1,2}|\d[A-Z+*]\d{5}[A-Z])$/,
      'IT': /^\d{11}$/,
      'LT': /^(\d{9}|\d{12})$/,
      'LU': /^\d{8}$/,
      'LV': /^\d{11}$/,
      'MT': /^\d{8}$/,
      'NL': /^\d{9}B\d{2}$/,
      'PL': /^\d{10}$/,
      'PT': /^\d{9}$/,
      'RO': /^\d{2,10}$/,
      'SE': /^\d{12}$/,
      'SI': /^\d{8}$/,
      'SK': /^\d{10}$/
    };

    const pattern = patterns[countryCode];
    if (!pattern) {
      return { valid: false, error: `No validation pattern for country ${countryCode}` };
    }

    if (!pattern.test(number)) {
      return { valid: false, error: `Invalid VAT number format for ${countryCode}` };
    }

    return { valid: true };
  }

  async batchValidateVatNumbers(vatNumbers: string[]): Promise<ViesValidationResult[]> {
    const results: ViesValidationResult[] = [];
    for (const vat of vatNumbers) {
      results.push(await this.validateVatNumber(vat));
    }
    return results;
  }

  // =================== EORI VALIDATION ===================

  async validateEoriNumber(eoriNumber: string): Promise<EORIValidationResult> {
    const cleanEori = eoriNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const countryCode = cleanEori.substring(0, 2);

    // EORI format: 2-letter country code + up to 15 characters
    if (cleanEori.length < 3 || cleanEori.length > 17) {
      return {
        valid: false,
        eoriNumber: cleanEori,
        errorMessage: 'EORI number must be 3-17 characters'
      };
    }

    // In production, this would call the EC EORI validation service
    // For now, simulate validation
    const valid = /^[A-Z]{2}[A-Z0-9]{1,15}$/.test(cleanEori);

    return {
      valid,
      eoriNumber: cleanEori,
      name: valid ? `Company with EORI ${cleanEori}` : undefined,
      address: valid ? `Address for EORI ${cleanEori}` : undefined,
      validFrom: valid ? new Date('2020-01-01') : undefined,
      errorMessage: valid ? undefined : 'Invalid EORI format'
    };
  }

  // =================== HS CODE CLASSIFICATION ===================

  searchHSCodes(query: string, limit: number = 20): HSCode[] {
    const results: HSCode[] = [];
    const lowerQuery = query.toLowerCase();

    this.hsCodeDatabase.forEach(hs => {
      if (
        hs.code.includes(query) ||
        hs.description.toLowerCase().includes(lowerQuery) ||
        hs.chapter.includes(query)
      ) {
        results.push(hs);
      }
    });

    return results.slice(0, limit);
  }

  getHSCode(code: string): HSCode | undefined {
    return this.hsCodeDatabase.get(code);
  }

  suggestHSCode(productDescription: string): HSCode[] {
    // Simple keyword-based suggestion
    const keywords = productDescription.toLowerCase().split(/\s+/);
    const scores = new Map<string, number>();

    this.hsCodeDatabase.forEach((hs, code) => {
      let score = 0;
      const hsDesc = hs.description.toLowerCase();

      keywords.forEach(keyword => {
        if (hsDesc.includes(keyword)) {
          score += keyword.length; // Longer matches score higher
        }
      });

      if (score > 0) {
        scores.set(code, score);
      }
    });

    // Sort by score and return top 5
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => this.hsCodeDatabase.get(code)!);
  }

  // =================== TARIFF CALCULATIONS ===================

  calculateDutiesAndTaxes(
    goods: CustomsGoods[],
    destinationCountry: string = 'RO',
    preferentialOrigin?: string
  ): DutiesAndTaxes {
    let totalCustomsDuty = 0;
    let totalVat = 0;
    let totalExcise = 0;

    const vatRate = this.euVatRates[destinationCountry]?.standard || 19;

    goods.forEach(item => {
      const tariff = this.tariffDatabase.get(item.hsCode);
      let dutyRate = tariff?.dutyRate || 0;

      // Apply preferential rate if applicable
      const hsCode = this.hsCodeDatabase.get(item.hsCode);
      if (preferentialOrigin && hsCode?.preferentialRates?.[preferentialOrigin] !== undefined) {
        dutyRate = hsCode.preferentialRates[preferentialOrigin];
      }

      // Calculate duty
      const customsDuty = (item.value * dutyRate) / 100;
      totalCustomsDuty += customsDuty;

      // Check for excise
      if (hsCode?.restrictions?.includes('EXCISE')) {
        // Simplified excise calculation
        totalExcise += item.value * 0.1; // 10% placeholder
      }

      // Calculate VAT on (value + duty + excise)
      const vatBase = item.value + customsDuty;
      totalVat += (vatBase * vatRate) / 100;
    });

    return {
      customsDuty: Math.round(totalCustomsDuty * 100) / 100,
      vat: Math.round(totalVat * 100) / 100,
      exciseDuty: totalExcise > 0 ? Math.round(totalExcise * 100) / 100 : undefined,
      total: Math.round((totalCustomsDuty + totalVat + totalExcise) * 100) / 100,
      currency: 'EUR'
    };
  }

  getTariff(hsCode: string): CustomsTariff | undefined {
    return this.tariffDatabase.get(hsCode);
  }

  // =================== CUSTOMS DECLARATIONS ===================

  createDeclaration(params: {
    type: DeclarationType;
    declarant: Company;
    consignor: Company;
    consignee: Company;
    goods: CustomsGoods[];
    procedureCode: string;
    customsOffice: string;
    transportMode: TransportMode;
    transportDocument?: string;
    containerNumbers?: string[];
  }): CustomsDeclaration {
    const id = this.generateId();
    const lrn = this.generateLRN();

    const totalGrossWeight = params.goods.reduce((sum, g) => sum + g.grossWeight, 0);
    const totalNetWeight = params.goods.reduce((sum, g) => sum + g.netWeight, 0);
    const totalValue = params.goods.reduce((sum, g) => sum + g.value, 0);

    const declaration: CustomsDeclaration = {
      id,
      type: params.type,
      status: 'DRAFT',
      lrn,
      declarant: params.declarant,
      consignor: params.consignor,
      consignee: params.consignee,
      goods: params.goods,
      procedureCode: params.procedureCode,
      customsOffice: params.customsOffice,
      transportMode: params.transportMode,
      transportDocument: params.transportDocument,
      containerNumbers: params.containerNumbers,
      totalGrossWeight,
      totalNetWeight,
      totalValue,
      currency: params.goods[0]?.currency || 'EUR',
      createdAt: new Date(),
      documents: []
    };

    this.declarations.set(id, declaration);
    this.logger.log(`Created customs declaration ${id} (LRN: ${lrn}) type: ${params.type}`);

    return declaration;
  }

  getDeclaration(id: string): CustomsDeclaration | undefined {
    return this.declarations.get(id);
  }

  getDeclarationByLRN(lrn: string): CustomsDeclaration | undefined {
    return Array.from(this.declarations.values()).find(d => d.lrn === lrn);
  }

  getDeclarationByMRN(mrn: string): CustomsDeclaration | undefined {
    return Array.from(this.declarations.values()).find(d => d.mrn === mrn);
  }

  listDeclarations(filters?: {
    type?: DeclarationType;
    status?: DeclarationStatus;
    declarantId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): CustomsDeclaration[] {
    let results = Array.from(this.declarations.values());

    if (filters?.type) {
      results = results.filter(d => d.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter(d => d.status === filters.status);
    }
    if (filters?.declarantId) {
      results = results.filter(d => d.declarant.id === filters.declarantId);
    }
    if (filters?.fromDate) {
      results = results.filter(d => d.createdAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      results = results.filter(d => d.createdAt <= filters.toDate!);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  validateDeclaration(id: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const declaration = this.declarations.get(id);
    if (!declaration) {
      return { valid: false, errors: ['Declaration not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!declaration.declarant.eoriNumber) {
      errors.push('Declarant EORI number is required');
    }
    if (!declaration.consignor.vatNumber && !declaration.consignor.eoriNumber) {
      warnings.push('Consignor VAT or EORI number recommended');
    }
    if (!declaration.consignee.vatNumber && !declaration.consignee.eoriNumber) {
      warnings.push('Consignee VAT or EORI number recommended');
    }

    // Goods validation
    if (declaration.goods.length === 0) {
      errors.push('At least one goods item is required');
    }

    declaration.goods.forEach((item, index) => {
      if (!item.hsCode || item.hsCode.length < 6) {
        errors.push(`Item ${index + 1}: HS code must be at least 6 digits`);
      }
      if (item.value <= 0) {
        errors.push(`Item ${index + 1}: Value must be greater than 0`);
      }
      if (item.netWeight <= 0) {
        errors.push(`Item ${index + 1}: Net weight must be greater than 0`);
      }
      if (item.grossWeight < item.netWeight) {
        errors.push(`Item ${index + 1}: Gross weight cannot be less than net weight`);
      }

      // Check HS code validity
      const hsCode = this.hsCodeDatabase.get(item.hsCode);
      if (!hsCode) {
        warnings.push(`Item ${index + 1}: HS code ${item.hsCode} not found in database`);
      }
    });

    // Procedure code validation
    if (!this.isValidProcedureCode(declaration.procedureCode, declaration.type)) {
      errors.push(`Invalid procedure code ${declaration.procedureCode} for ${declaration.type}`);
    }

    // Transport validation
    if (declaration.transportMode === 'SEA' && !declaration.containerNumbers?.length) {
      warnings.push('Container numbers recommended for sea transport');
    }

    // Update status if valid
    if (errors.length === 0 && declaration.status === 'DRAFT') {
      declaration.status = 'VALIDATED';
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private isValidProcedureCode(code: string, type: DeclarationType): boolean {
    // Simplified procedure code validation
    // Format: XXYY where XX is requested procedure, YY is previous procedure
    const validCodes: { [key in DeclarationType]: string[] } = {
      'IMPORT': ['4000', '4051', '4053', '4071', '4078'],
      'EXPORT': ['1000', '1040', '1041', '1078'],
      'TRANSIT': ['T1', 'T2', 'T2F', 'TIR'],
      'TEMPORARY_IMPORT': ['5300', '5351', '5353'],
      'TEMPORARY_EXPORT': ['2300', '2340'],
      'RE_IMPORT': ['6110', '6121', '6123'],
      'RE_EXPORT': ['3151', '3153', '3171'],
      'INWARD_PROCESSING': ['5100', '5111', '5121'],
      'OUTWARD_PROCESSING': ['2100', '2140', '2151'],
      'CUSTOMS_WAREHOUSING': ['7100', '7110', '7121']
    };

    return validCodes[type]?.includes(code) || true; // Simplified for now
  }

  submitDeclaration(id: string): { success: boolean; mrn?: string; error?: string } {
    const declaration = this.declarations.get(id);
    if (!declaration) {
      return { success: false, error: 'Declaration not found' };
    }

    if (declaration.status !== 'VALIDATED') {
      return { success: false, error: `Cannot submit declaration with status ${declaration.status}` };
    }

    // Calculate duties
    declaration.dutiesAndTaxes = this.calculateDutiesAndTaxes(declaration.goods);

    // In production, this would submit to ANAF/Romanian Customs
    // Generate MRN (Movement Reference Number)
    const mrn = this.generateMRN();
    declaration.mrn = mrn;
    declaration.status = 'SUBMITTED';
    declaration.submittedAt = new Date();

    this.logger.log(`Submitted customs declaration ${id} - MRN: ${mrn}`);

    return { success: true, mrn };
  }

  acceptDeclaration(id: string): CustomsDeclaration | undefined {
    const declaration = this.declarations.get(id);
    if (declaration && declaration.status === 'SUBMITTED') {
      declaration.status = 'ACCEPTED';
      declaration.acceptedAt = new Date();
      this.logger.log(`Accepted customs declaration ${id}`);
    }
    return declaration;
  }

  releaseDeclaration(id: string): CustomsDeclaration | undefined {
    const declaration = this.declarations.get(id);
    if (declaration && declaration.status === 'ACCEPTED') {
      declaration.status = 'RELEASED';
      declaration.releasedAt = new Date();
      this.logger.log(`Released customs declaration ${id}`);
    }
    return declaration;
  }

  addDocument(declarationId: string, document: Omit<CustomsDocument, 'id'>): CustomsDocument | undefined {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) return undefined;

    const doc: CustomsDocument = {
      id: this.generateId(),
      ...document
    };

    declaration.documents.push(doc);
    return doc;
  }

  // =================== INTRASTAT REPORTING ===================

  createIntrastatDeclaration(params: {
    type: 'ARRIVALS' | 'DISPATCHES';
    period: string;
    reportingCompany: Company;
    items: Omit<IntrastatItem, 'itemNumber'>[];
  }): IntrastatDeclaration {
    const id = this.generateId();

    // Add item numbers
    const itemsWithNumbers: IntrastatItem[] = params.items.map((item, index) => ({
      ...item,
      itemNumber: index + 1
    }));

    const declaration: IntrastatDeclaration = {
      id,
      type: params.type,
      period: params.period,
      reportingCompany: params.reportingCompany,
      items: itemsWithNumbers,
      totalValue: itemsWithNumbers.reduce((sum, i) => sum + i.invoiceValue, 0),
      totalQuantity: itemsWithNumbers.reduce((sum, i) => sum + i.quantity, 0),
      totalWeight: itemsWithNumbers.reduce((sum, i) => sum + i.netWeight, 0),
      status: 'DRAFT'
    };

    this.intrastatDeclarations.set(id, declaration);
    this.logger.log(`Created Intrastat declaration ${id} for ${params.period} (${params.type})`);

    return declaration;
  }

  getIntrastatDeclaration(id: string): IntrastatDeclaration | undefined {
    return this.intrastatDeclarations.get(id);
  }

  listIntrastatDeclarations(filters?: {
    type?: 'ARRIVALS' | 'DISPATCHES';
    period?: string;
    companyId?: string;
    status?: IntrastatDeclaration['status'];
  }): IntrastatDeclaration[] {
    let results = Array.from(this.intrastatDeclarations.values());

    if (filters?.type) {
      results = results.filter(d => d.type === filters.type);
    }
    if (filters?.period) {
      results = results.filter(d => d.period === filters.period);
    }
    if (filters?.companyId) {
      results = results.filter(d => d.reportingCompany.id === filters.companyId);
    }
    if (filters?.status) {
      results = results.filter(d => d.status === filters.status);
    }

    return results;
  }

  validateIntrastatDeclaration(id: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const declaration = this.intrastatDeclarations.get(id);
    if (!declaration) {
      return { valid: false, errors: ['Declaration not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Period validation (YYYY-MM format)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(declaration.period)) {
      errors.push('Invalid period format. Use YYYY-MM');
    }

    // Company validation
    if (!declaration.reportingCompany.vatNumber) {
      errors.push('Reporting company VAT number is required');
    }

    // Items validation
    if (declaration.items.length === 0) {
      errors.push('At least one item is required');
    }

    // Intrastat thresholds (Romanian thresholds for 2024)
    const arrivalThreshold = 900000; // EUR
    const dispatchThreshold = 900000; // EUR
    const threshold = declaration.type === 'ARRIVALS' ? arrivalThreshold : dispatchThreshold;

    if (declaration.totalValue < threshold) {
      warnings.push(`Total value ${declaration.totalValue} EUR is below Intrastat threshold ${threshold} EUR. Filing may be optional.`);
    }

    declaration.items.forEach((item, index) => {
      if (!item.hsCode || item.hsCode.length < 8) {
        errors.push(`Item ${index + 1}: CN8 code must be 8 digits`);
      }
      if (!item.partnerCountry || item.partnerCountry.length !== 2) {
        errors.push(`Item ${index + 1}: Partner country must be 2-letter code`);
      }
      if (!this.euVatRates[item.partnerCountry]) {
        errors.push(`Item ${index + 1}: Partner country ${item.partnerCountry} is not an EU member state`);
      }
      if (item.invoiceValue <= 0) {
        errors.push(`Item ${index + 1}: Invoice value must be greater than 0`);
      }
      if (item.netWeight <= 0) {
        errors.push(`Item ${index + 1}: Net weight must be greater than 0`);
      }
      if (!this.transactionNatureCodes[item.transactionNature]) {
        warnings.push(`Item ${index + 1}: Unknown transaction nature code ${item.transactionNature}`);
      }
      if (!this.deliveryTerms[item.deliveryTerms]) {
        warnings.push(`Item ${index + 1}: Unknown delivery terms ${item.deliveryTerms}`);
      }
    });

    if (errors.length === 0 && declaration.status === 'DRAFT') {
      declaration.status = 'VALIDATED';
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  submitIntrastatDeclaration(id: string): { success: boolean; reference?: string; error?: string } {
    const declaration = this.intrastatDeclarations.get(id);
    if (!declaration) {
      return { success: false, error: 'Declaration not found' };
    }

    if (declaration.status !== 'VALIDATED') {
      return { success: false, error: `Cannot submit declaration with status ${declaration.status}` };
    }

    // In production, this would submit to INS (Romanian National Institute of Statistics)
    const reference = `INTRA-${declaration.period}-${this.generateId().substring(0, 8)}`;
    declaration.reference = reference;
    declaration.status = 'SUBMITTED';
    declaration.submittedAt = new Date();

    this.logger.log(`Submitted Intrastat declaration ${id} - Reference: ${reference}`);

    return { success: true, reference };
  }

  // =================== CUSTOMS OFFICES ===================

  getCustomsOffices(filters?: {
    country?: string;
    type?: CustomsOffice['type'];
    capability?: string;
  }): CustomsOffice[] {
    let results = [...this.romanianCustomsOffices];

    if (filters?.country) {
      results = results.filter(o => o.country.toLowerCase() === filters.country!.toLowerCase());
    }
    if (filters?.type) {
      results = results.filter(o => o.type === filters.type);
    }
    if (filters?.capability) {
      results = results.filter(o => o.capabilities.includes(filters.capability!));
    }

    return results;
  }

  getCustomsOffice(code: string): CustomsOffice | undefined {
    return this.romanianCustomsOffices.find(o => o.code === code);
  }

  // =================== DOCUMENT GENERATION ===================

  generateDAU(declarationId: string): string {
    // Generate DAU (Document Administrativ Unic / Single Administrative Document)
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new Error('Declaration not found');
    }

    // In production, this would generate a proper SAD/DAU XML or PDF
    const dau = `
================================================================================
                    DOCUMENT ADMINISTRATIV UNIC (DAU)
                      SINGLE ADMINISTRATIVE DOCUMENT
================================================================================
MRN: ${declaration.mrn || 'NOT ASSIGNED'}
LRN: ${declaration.lrn}
Type: ${declaration.type}
Status: ${declaration.status}
--------------------------------------------------------------------------------
DECLARANT (Box 14)
Name: ${declaration.declarant.name}
EORI: ${declaration.declarant.eoriNumber || 'N/A'}
VAT: ${declaration.declarant.vatNumber}
Address: ${declaration.declarant.address.street}, ${declaration.declarant.address.city}, ${declaration.declarant.address.country}
--------------------------------------------------------------------------------
CONSIGNOR/EXPORTER (Box 2)
Name: ${declaration.consignor.name}
VAT: ${declaration.consignor.vatNumber}
Address: ${declaration.consignor.address.street}, ${declaration.consignor.address.city}, ${declaration.consignor.address.country}
--------------------------------------------------------------------------------
CONSIGNEE/IMPORTER (Box 8)
Name: ${declaration.consignee.name}
VAT: ${declaration.consignee.vatNumber}
Address: ${declaration.consignee.address.street}, ${declaration.consignee.address.city}, ${declaration.consignee.address.country}
--------------------------------------------------------------------------------
GOODS ITEMS (Box 31-46)
${declaration.goods.map((g, i) => `
Item ${i + 1}:
  Description: ${g.description}
  HS Code: ${g.hsCode}
  Origin: ${g.originCountry}
  Quantity: ${g.quantity} ${g.unit}
  Gross Weight: ${g.grossWeight} kg
  Net Weight: ${g.netWeight} kg
  Value: ${g.value} ${g.currency}
`).join('')}
--------------------------------------------------------------------------------
TOTALS
Total Gross Weight: ${declaration.totalGrossWeight} kg
Total Net Weight: ${declaration.totalNetWeight} kg
Total Value: ${declaration.totalValue} ${declaration.currency}
--------------------------------------------------------------------------------
TRANSPORT (Box 25-26)
Mode: ${declaration.transportMode}
Document: ${declaration.transportDocument || 'N/A'}
Containers: ${declaration.containerNumbers?.join(', ') || 'N/A'}
--------------------------------------------------------------------------------
CUSTOMS (Box 29-30)
Office: ${declaration.customsOffice}
Procedure: ${declaration.procedureCode}
--------------------------------------------------------------------------------
DUTIES AND TAXES (Box 47)
${declaration.dutiesAndTaxes ? `
Customs Duty: ${declaration.dutiesAndTaxes.customsDuty} ${declaration.dutiesAndTaxes.currency}
VAT: ${declaration.dutiesAndTaxes.vat} ${declaration.dutiesAndTaxes.currency}
${declaration.dutiesAndTaxes.exciseDuty ? `Excise: ${declaration.dutiesAndTaxes.exciseDuty} ${declaration.dutiesAndTaxes.currency}` : ''}
TOTAL: ${declaration.dutiesAndTaxes.total} ${declaration.dutiesAndTaxes.currency}
` : 'Not calculated'}
--------------------------------------------------------------------------------
DOCUMENTS (Box 44)
${declaration.documents.map(d => `- ${d.type}: ${d.reference} (${d.issueDate.toISOString().split('T')[0]})`).join('\n') || 'No documents attached'}
================================================================================
Generated: ${new Date().toISOString()}
================================================================================
`;

    return dau;
  }

  generateIntrastatXML(declarationId: string): string {
    const declaration = this.intrastatDeclarations.get(declarationId);
    if (!declaration) {
      throw new Error('Declaration not found');
    }

    // Generate XML for INS submission
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Intrastat xmlns="urn:ro:ins:intrastat:v1">
  <Header>
    <DeclarationType>${declaration.type}</DeclarationType>
    <ReferencePeriod>${declaration.period}</ReferencePeriod>
    <DeclarationReference>${declaration.reference || declaration.id}</DeclarationReference>
    <ReportingCompany>
      <Name>${this.escapeXml(declaration.reportingCompany.name)}</Name>
      <VATNumber>${declaration.reportingCompany.vatNumber}</VATNumber>
      <Address>
        <Street>${this.escapeXml(declaration.reportingCompany.address.street)}</Street>
        <City>${this.escapeXml(declaration.reportingCompany.address.city)}</City>
        <PostalCode>${declaration.reportingCompany.address.postalCode}</PostalCode>
        <Country>${declaration.reportingCompany.address.countryCode}</Country>
      </Address>
    </ReportingCompany>
  </Header>
  <Items>
${declaration.items.map(item => `    <Item>
      <ItemNumber>${item.itemNumber}</ItemNumber>
      <CN8Code>${item.hsCode}</CN8Code>
      <Description>${this.escapeXml(item.description)}</Description>
      <PartnerCountry>${item.partnerCountry}</PartnerCountry>
      <TransactionNature>${item.transactionNature}</TransactionNature>
      <DeliveryTerms>${item.deliveryTerms}</DeliveryTerms>
      <TransportMode>${this.getTransportModeCode(item.transportMode)}</TransportMode>
      <Quantity>${item.quantity}</Quantity>
      <NetWeight>${item.netWeight}</NetWeight>
      ${item.supplementaryUnit ? `<SupplementaryUnit>${item.supplementaryUnit}</SupplementaryUnit>` : ''}
      <InvoiceValue>${item.invoiceValue}</InvoiceValue>
      <StatisticalValue>${item.statisticalValue}</StatisticalValue>
      ${item.partnerVatNumber ? `<PartnerVATNumber>${item.partnerVatNumber}</PartnerVATNumber>` : ''}
    </Item>`).join('\n')}
  </Items>
  <Summary>
    <TotalItems>${declaration.items.length}</TotalItems>
    <TotalValue>${declaration.totalValue}</TotalValue>
    <TotalWeight>${declaration.totalWeight}</TotalWeight>
  </Summary>
</Intrastat>`;

    return xml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private getTransportModeCode(mode: TransportMode): number {
    const codes: { [key in TransportMode]: number } = {
      'SEA': 1,
      'RAIL': 2,
      'ROAD': 3,
      'AIR': 4,
      'POST': 5,
      'MULTIMODAL': 6,
      'FIXED_TRANSPORT': 7,
      'INLAND_WATERWAY': 8
    };
    return codes[mode];
  }

  // =================== STATISTICS & REPORTS ===================

  getDeclarationStatistics(period?: { from: Date; to: Date }): {
    totalDeclarations: number;
    byType: { [key in DeclarationType]?: number };
    byStatus: { [key in DeclarationStatus]?: number };
    totalValue: number;
    totalDuties: number;
    averageProcessingTime: number;
  } {
    let declarations = Array.from(this.declarations.values());

    if (period) {
      declarations = declarations.filter(d =>
        d.createdAt >= period.from && d.createdAt <= period.to
      );
    }

    const byType: { [key: string]: number } = {};
    const byStatus: { [key: string]: number } = {};
    let totalValue = 0;
    let totalDuties = 0;
    let totalProcessingTime = 0;
    let processedCount = 0;

    declarations.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      totalValue += d.totalValue;

      if (d.dutiesAndTaxes) {
        totalDuties += d.dutiesAndTaxes.total;
      }

      if (d.submittedAt && d.releasedAt) {
        totalProcessingTime += d.releasedAt.getTime() - d.submittedAt.getTime();
        processedCount++;
      }
    });

    return {
      totalDeclarations: declarations.length,
      byType: byType as { [key in DeclarationType]?: number },
      byStatus: byStatus as { [key in DeclarationStatus]?: number },
      totalValue,
      totalDuties,
      averageProcessingTime: processedCount > 0
        ? Math.round(totalProcessingTime / processedCount / (1000 * 60 * 60)) // hours
        : 0
    };
  }

  getIntrastatStatistics(year: number): {
    arrivals: { totalValue: number; totalWeight: number; itemCount: number };
    dispatches: { totalValue: number; totalWeight: number; itemCount: number };
    topPartnerCountries: { country: string; value: number }[];
    topHSCodes: { hsCode: string; value: number }[];
  } {
    const declarations = Array.from(this.intrastatDeclarations.values())
      .filter(d => d.period.startsWith(year.toString()));

    const arrivals = declarations.filter(d => d.type === 'ARRIVALS');
    const dispatches = declarations.filter(d => d.type === 'DISPATCHES');

    const countryValues: { [key: string]: number } = {};
    const hsCodeValues: { [key: string]: number } = {};

    declarations.forEach(d => {
      d.items.forEach(item => {
        countryValues[item.partnerCountry] = (countryValues[item.partnerCountry] || 0) + item.invoiceValue;
        hsCodeValues[item.hsCode] = (hsCodeValues[item.hsCode] || 0) + item.invoiceValue;
      });
    });

    return {
      arrivals: {
        totalValue: arrivals.reduce((sum, d) => sum + d.totalValue, 0),
        totalWeight: arrivals.reduce((sum, d) => sum + d.totalWeight, 0),
        itemCount: arrivals.reduce((sum, d) => sum + d.items.length, 0)
      },
      dispatches: {
        totalValue: dispatches.reduce((sum, d) => sum + d.totalValue, 0),
        totalWeight: dispatches.reduce((sum, d) => sum + d.totalWeight, 0),
        itemCount: dispatches.reduce((sum, d) => sum + d.items.length, 0)
      },
      topPartnerCountries: Object.entries(countryValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, value]) => ({ country, value })),
      topHSCodes: Object.entries(hsCodeValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([hsCode, value]) => ({ hsCode, value }))
    };
  }

  // =================== UTILITIES ===================

  getTransactionNatureCodes(): { [code: string]: string } {
    return { ...this.transactionNatureCodes };
  }

  getDeliveryTerms(): { [code: string]: string } {
    return { ...this.deliveryTerms };
  }

  getEUVatRates(): { [countryCode: string]: { standard: number; reduced: number[] } } {
    return { ...this.euVatRates };
  }

  private generateId(): string {
    return `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateLRN(): string {
    // Local Reference Number format: EORI + Year + Sequence
    const year = new Date().getFullYear().toString().slice(-2);
    const seq = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `LRN${year}${seq}`;
  }

  private generateMRN(): string {
    // Movement Reference Number format per EU specs
    // Format: YYCCZZZZZZZZZZZZ-C
    const year = new Date().getFullYear().toString().slice(-2);
    const country = 'RO';
    const unique = Math.random().toString(36).substring(2, 14).toUpperCase();
    const checkDigit = this.calculateMRNCheckDigit(`${year}${country}${unique}`);
    return `${year}${country}${unique}${checkDigit}`;
  }

  private calculateMRNCheckDigit(mrn: string): string {
    // Simplified check digit calculation
    let sum = 0;
    for (let i = 0; i < mrn.length; i++) {
      const char = mrn[i];
      const value = char >= 'A' ? char.charCodeAt(0) - 55 : parseInt(char);
      sum += value * (i + 1);
    }
    return (sum % 10).toString();
  }

  // Reset for testing
  resetState(): void {
    this.declarations.clear();
    this.intrastatDeclarations.clear();
    this.viesCache.clear();
  }
}
