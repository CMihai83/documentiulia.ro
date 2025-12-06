// User & Auth Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'accountant';
  company_id?: number;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
    companies: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };
  message?: string;
}

export interface Company {
  id: number;
  name: string;
  tax_id: string;
  currency: string;
  created_at: string;
}

// Invoice Types
export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  invoice_date: string;  // Changed from issue_date
  due_date: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;  // Changed from total
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  line_items?: InvoiceLineItem[];
  created_at: string;
}

export interface InvoiceLineItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

// Contact Types
export interface Contact {
  id: number;
  display_name: string;
  email: string;
  phone?: string;
  contact_type: 'customer' | 'vendor' | 'employee' | 'contractor' | 'lead' | 'partner';
  company_name?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  created_at: string;
}

// Expense Types
export interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
  vendor_name?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// AI Insights Types
export interface Insight {
  id: number;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  action_url?: string;
  created_at: string;
  dismissed: boolean;
}

// Cash Flow Forecast Types
export interface CashFlowForecast {
  month: string;
  projected_income: number;
  projected_expenses: number;
  net_cash_flow: number;
  ending_balance: number;
  confidence: number;
}

// Report Types
export interface FinancialReport {
  period_start: string;
  period_end: string;
  data: any;
}

// Dashboard Types
export interface DashboardStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  outstanding_invoices: number;
  overdue_invoices: number;
  cash_balance: number;
}
