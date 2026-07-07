// User types
export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  subscriptionTier: 'FREE' | 'PRO' | 'BUSINESS';
  createdAt: string;
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

// Dashboard types
export interface DashboardMetrics {
  revenue: number;
  revenueChange: number;
  expenses: number;
  expensesChange: number;
  profit: number;
  profitChange: number;
  invoicesPending: number;
  invoicesPendingAmount: number;
  vatDue: number;
  vatDueDate: string;
  healthScore: number;
}

// Invoice types
export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientCUI?: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

// OCR types
export interface OCRResult {
  success: boolean;
  confidence: number;
  extractedData: {
    vendorName?: string;
    vendorCUI?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: number;
    vatAmount?: number;
    currency?: string;
    items?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      total?: number;
    }>;
  };
  rawText?: string;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Invoices: undefined;
  Scanner: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type InvoiceStackParamList = {
  InvoiceList: undefined;
  InvoiceDetail: { id: string };
  InvoiceCreate: undefined;
  InvoiceEdit: { id: string };
};

// VAT types
export interface VATCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  currency: string;
}

// Theme types
export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
  };
}
