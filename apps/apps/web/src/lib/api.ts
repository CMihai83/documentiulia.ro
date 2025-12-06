import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000/api/v1";

// Dev token for testing (will be replaced with Clerk in production)
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev_test_token";

// Main API client
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${DEV_TOKEN}`,
  },
});

// ML API client
export const mlApi = axios.create({
  baseURL: ML_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Token will be added from Clerk session
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to sign-in
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in";
      }
    }
    return Promise.reject(error);
  }
);

// API types based on OpenAPI spec
export interface Company {
  id: string;
  name: string;
  cui: string;
  regCom: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string;
  vatPayer: boolean;
  vatCode: string | null;
  iban: string | null;
  bank: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  cui: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  companyId: string;
  category: string;
  description: string | null;
  amount: number;
  vatAmount: number | null;
  date: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  vatCollected: number;
  vatPaid: number;
}

// API functions
export const companyApi = {
  getAll: () => api.get<Company[]>("/companies"),
  getById: (id: string) => api.get<Company>(`/companies/${id}`),
  getStats: (id: string) => api.get<DashboardStats>(`/companies/${id}/stats`),
  create: (data: Partial<Company>) => api.post<Company>("/companies", data),
  update: (id: string, data: Partial<Company>) => api.patch<Company>(`/companies/${id}`, data),
};

export const clientApi = {
  getAll: (companyId: string) => api.get<Client[]>(`/companies/${companyId}/clients`),
  getById: (companyId: string, id: string) => api.get<Client>(`/companies/${companyId}/clients/${id}`),
  create: (companyId: string, data: Partial<Client>) => api.post<Client>(`/companies/${companyId}/clients`, data),
  update: (companyId: string, id: string, data: Partial<Client>) =>
    api.patch<Client>(`/companies/${companyId}/clients/${id}`, data),
};

export const invoiceApi = {
  getAll: (companyId: string) => api.get<Invoice[]>("/invoices", { headers: { "X-Company-ID": companyId } }),
  getById: (id: string, companyId: string) =>
    api.get<Invoice>(`/invoices/${id}`, { headers: { "X-Company-ID": companyId } }),
  getStats: (companyId: string) =>
    api.get("/invoices/stats", { headers: { "X-Company-ID": companyId } }),
  create: (companyId: string, data: Partial<Invoice>) =>
    api.post<Invoice>("/invoices", data, { headers: { "X-Company-ID": companyId } }),
};

export const expenseApi = {
  getAll: (companyId: string) => api.get<Expense[]>(`/companies/${companyId}/expenses`),
  getUnpaid: (companyId: string) => api.get<Expense[]>(`/companies/${companyId}/expenses/unpaid`),
  getByCategory: (companyId: string) => api.get(`/companies/${companyId}/expenses/by-category`),
  create: (companyId: string, data: Partial<Expense>) =>
    api.post<Expense>(`/companies/${companyId}/expenses`, data),
};

export const reportApi = {
  getDashboard: (companyId: string) => api.get(`/companies/${companyId}/reports/dashboard`),
  getRevenue: (companyId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/companies/${companyId}/reports/revenue`, { params }),
  getExpenses: (companyId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/companies/${companyId}/reports/expenses`, { params }),
};

export const forumApi = {
  getCategories: () => api.get("/forum/categories"),
  getTopics: (params?: { category?: string; page?: number; limit?: number }) =>
    api.get("/forum/topics", { params }),
  getStats: () => api.get("/forum/stats"),
};

export const courseApi = {
  getAll: (params?: { category?: string; difficulty?: string; page?: number }) =>
    api.get("/courses", { params }),
  getBySlug: (slug: string) => api.get(`/courses/${slug}`),
  getCategories: () => api.get("/courses/categories"),
  getPopular: () => api.get("/courses/popular"),
};
