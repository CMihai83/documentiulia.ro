/**
 * Common API Types for DocumentIulia.ro
 * Standardized TypeScript interfaces for all API responses
 */

// ================== Common Types ==================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export type Currency = 'RON' | 'EUR' | 'USD' | 'GBP' | 'CHF' | 'HUF' | 'PLN' | 'CZK' | 'BGN' | 'HRK' | 'SEK' | 'NOK' | 'DKK' | 'TRY' | 'RUB' | 'CNY';

export type VATRate = 0 | 5 | 9 | 19 | 11 | 21; // 21% and 11% for post-Aug 2025

// ================== User & Auth Types ==================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE' | 'MANAGER' | 'VIEWER';
  companyId: string;
  avatarUrl?: string;
  phone?: string;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceName: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

// ================== Company Types ==================

export interface Company {
  id: string;
  name: string;
  cui: string; // CUI/CIF number
  registrationNumber: string; // J12/1234/2020
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  bankAccount?: string;
  bankName?: string;
  vatPayer: boolean;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

// ================== Invoice Types ==================

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIALLY_PAID';
export type InvoiceType = 'STANDARD' | 'PROFORMA' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'ADVANCE';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: VATRate;
  vatAmount: number;
  totalWithoutVat: number;
  totalWithVat: number;
  unit?: string;
  productCode?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  partnerId: string;
  partnerName: string;
  partnerCui: string;
  currency: Currency;
  exchangeRate: number;
  items: InvoiceLineItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  // e-Factura fields
  efacturaStatus?: 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
  efacturaId?: string;
  efacturaDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ================== Partner/Client Types ==================

export type PartnerType = 'CLIENT' | 'SUPPLIER' | 'BOTH';

export interface Partner {
  id: string;
  name: string;
  cui?: string;
  registrationNumber?: string;
  type: PartnerType;
  address: string;
  city: string;
  county?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  bankAccount?: string;
  bankName?: string;
  vatPayer: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ================== Payment Types ==================

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHECK' | 'COMPENSATION';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type PaymentDirection = 'INCOMING' | 'OUTGOING';

export interface Payment {
  id: string;
  paymentNumber: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  invoiceId?: string;
  invoiceNumber?: string;
  partnerId: string;
  partnerName: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  bankAccount?: string;
  createdAt: string;
  updatedAt: string;
}

// ================== HR Types ==================

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'FIXED_TERM' | 'INTERNSHIP' | 'CONTRACTOR';

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  personalId: string; // CNP
  address: string;
  city: string;
  county: string;
  birthDate: string;
  hireDate: string;
  terminationDate?: string;
  department: string;
  position: string;
  managerId?: string;
  status: EmployeeStatus;
  contractType: ContractType;
  salary: number;
  currency: Currency;
  bankAccount?: string;
  bankName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  employeeId: string;
  employeeName: string;
  type: ContractType;
  startDate: string;
  endDate?: string;
  salary: number;
  currency: Currency;
  hoursPerWeek: number;
  position: string;
  department: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT';
  revisalStatus?: 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  revisalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  breakMinutes: number;
  workedHours: number;
  overtimeHours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  createdAt: string;
}

// ================== CRM Types ==================

export type DealStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';

export interface CRMContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  tags: string[];
  notes?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMDeal {
  id: string;
  title: string;
  value: number;
  currency: Currency;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  contactId: string;
  contactName: string;
  ownerId: string;
  ownerName: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CRMActivity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  contactId?: string;
  dealId?: string;
  ownerId: string;
  ownerName: string;
  dueDate?: string;
  completedAt?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

// ================== Inventory Types ==================

export type StockMovementType = 'ENTRY' | 'EXIT' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  price: number;
  currency: Currency;
  vatRate: VATRate;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  warehouseId: string;
  warehouseName: string;
  barcode?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  reference?: string;
  notes?: string;
  performedBy: string;
  performedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  county: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

// ================== Logistics Types ==================

export type ShipmentStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELLED';
export type ShipmentPriority = 'STANDARD' | 'EXPRESS' | 'URGENT' | 'SAME_DAY';

export interface Shipment {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  priority: ShipmentPriority;
  courier: string;
  sender: {
    name: string;
    address: string;
    city: string;
    county: string;
    phone: string;
  };
  recipient: {
    name: string;
    address: string;
    city: string;
    county: string;
    phone: string;
    deliveryInstructions?: string;
  };
  packages: ShipmentPackage[];
  estimatedDelivery?: string;
  actualDelivery?: string;
  cost: number;
  currency: Currency;
  codAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentPackage {
  id: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  contents: string;
  value?: number;
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: string;
  location: string;
  description: string;
  timestamp: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// ================== Fleet Types ==================

export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
export type FuelType = 'DIESEL' | 'PETROL' | 'ELECTRIC' | 'HYBRID' | 'LPG' | 'CNG';

export interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  status: VehicleStatus;
  mileage: number;
  fuelType: FuelType;
  fuelCapacity?: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  department?: string;
  insuranceExpiry: string;
  inspectionExpiry: string;
  registrationExpiry: string;
  nextServiceMileage?: number;
  nextServiceDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'SCHEDULED' | 'UNSCHEDULED' | 'REPAIR' | 'INSPECTION';
  description: string;
  mileageAtService: number;
  cost: number;
  currency: Currency;
  serviceProvider?: string;
  performedAt: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  notes?: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  driverId?: string;
  driverName?: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  currency: Currency;
  mileageAtFueling: number;
  station?: string;
  fuelType: FuelType;
  fullTank: boolean;
  date: string;
}

// ================== Quality Types ==================

export type InspectionType = 'INCOMING' | 'IN_PROCESS' | 'FINAL' | 'SUPPLIER' | 'AUDIT';
export type InspectionResult = 'PASS' | 'FAIL' | 'PENDING' | 'CONDITIONAL';
export type NCRSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type NCRStatus = 'OPEN' | 'IN_REVIEW' | 'CONTAINMENT' | 'ROOT_CAUSE' | 'CORRECTIVE_ACTION' | 'VERIFICATION' | 'CLOSED' | 'REJECTED';
export type CAPAType = 'CORRECTIVE' | 'PREVENTIVE';
export type CAPAStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  type: InspectionType;
  result: InspectionResult;
  score: number;
  product: {
    id: string;
    name: string;
    code: string;
    lotNumber?: string;
    quantity: number;
  };
  sampleSize: number;
  acceptedCount: number;
  rejectedCount: number;
  inspectorId: string;
  inspectorName: string;
  inspectedAt: string;
  checkpoints: InspectionCheckpoint[];
  findings?: string;
  linkedNCRs?: string[];
  createdAt: string;
}

export interface InspectionCheckpoint {
  id: string;
  name: string;
  specification: string;
  measurement?: string;
  result: 'PASS' | 'FAIL' | 'N/A';
  notes?: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  title: string;
  description: string;
  severity: NCRSeverity;
  status: NCRStatus;
  source: string;
  affectedProduct?: {
    id: string;
    name: string;
    lotNumber?: string;
    quantity: number;
  };
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  rootCause?: string;
  containmentActions?: string;
  correctiveActions?: string;
  verificationNotes?: string;
  closedAt?: string;
  closedBy?: string;
  linkedCAPAs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  type: CAPAType;
  status: CAPAStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  rootCauseAnalysis?: string;
  proposedActions?: string;
  implementedActions?: string;
  verificationMethod?: string;
  verificationResults?: string;
  effectivenessReview?: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  completionPercentage: number;
  linkedNCRs?: string[];
  linkedInspections?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ================== Finance Types ==================

export interface ExchangeRate {
  currency: Currency;
  rate: number;
  previousRate?: number;
  change?: number;
  changePercent?: number;
  date: string;
  source: 'BNR' | 'ECB' | 'MANUAL';
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  amountRON: number;
  description: string;
  partnerId?: string;
  partnerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  bankAccount?: string;
  reference?: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  iban: string;
  bic?: string;
  currency: Currency;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  lastSyncAt?: string;
}

// ================== Procurement Types ==================

export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: Currency;
  exchangeRate: number;
  expectedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  vatRate: VATRate;
  vatAmount: number;
  total: number;
  receivedQuantity: number;
}

// ================== E-Commerce Types ==================

export type ECommerceOrderStatus = 'NEW' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
export type ECommercePlatform = 'EMAG' | 'AMAZON' | 'ALLEGRO' | 'SHOPIFY' | 'WOOCOMMERCE' | 'CUSTOM';

export interface ECommerceOrder {
  id: string;
  externalId: string;
  platform: ECommercePlatform;
  orderNumber: string;
  status: ECommerceOrderStatus;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    county: string;
    postalCode: string;
  };
  items: ECommerceOrderItem[];
  subtotal: number;
  shippingCost: number;
  vatAmount: number;
  total: number;
  currency: Currency;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  invoiceId?: string;
  shipmentId?: string;
  orderedAt: string;
  syncedAt: string;
}

export interface ECommerceOrderItem {
  id: string;
  externalId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  vatRate: VATRate;
  total: number;
}

// ================== ANAF Types ==================

export type ANAFSubmissionStatus = 'NOT_SENT' | 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';

export interface EFacturaSubmission {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  status: ANAFSubmissionStatus;
  spvId?: string;
  submittedAt?: string;
  responseAt?: string;
  responseMessage?: string;
  xmlContent?: string;
  errors?: string[];
}

export interface SAFTD406Submission {
  id: string;
  period: string; // YYYY-MM format
  status: ANAFSubmissionStatus;
  submittedAt?: string;
  responseAt?: string;
  responseMessage?: string;
  fileSize?: number;
  recordCount?: number;
  errors?: string[];
}

export interface D112Declaration {
  id: string;
  period: string; // YYYY-MM format
  status: ANAFSubmissionStatus;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalContributions: {
    cas: number; // Contribuția asigurărilor sociale
    cass: number; // Contribuția asigurărilor sociale de sănătate
    incomeTax: number;
  };
  submittedAt?: string;
  deadline: string;
}

// ================== Notification Types ==================

export type NotificationType = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'COMPLIANCE';
export type NotificationCategory = 'SYSTEM' | 'INVOICE' | 'PAYMENT' | 'HR' | 'CRM' | 'INVENTORY' | 'COMPLIANCE' | 'QUALITY';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  userId: string;
  createdAt: string;
}

// ================== Dashboard Types ==================

export interface DashboardMetrics {
  revenue: {
    total: number;
    change: number;
    changePercent: number;
    period: string;
  };
  invoices: {
    total: number;
    pending: number;
    overdue: number;
  };
  payments: {
    received: number;
    pending: number;
  };
  inventory: {
    lowStockItems: number;
    totalValue: number;
  };
  hr: {
    totalEmployees: number;
    activeContracts: number;
  };
  crm: {
    openDeals: number;
    dealValue: number;
    newContacts: number;
  };
}

export interface DashboardAlert {
  id: string;
  type: 'DEADLINE' | 'LOW_STOCK' | 'OVERDUE' | 'COMPLIANCE' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  link?: string;
  dueDate?: string;
  createdAt: string;
}
