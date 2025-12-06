import axios from 'axios';

const API_BASE_URL = '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  const companyId = localStorage.getItem('company_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (companyId) {
    config.headers['X-Company-ID'] = companyId;
  }

  return config;
});

export interface Employee {
  id: string;
  company_id: string;
  contact_id: string;
  display_name: string;
  email?: string;
  phone?: string;
  employee_number?: string;
  employment_type?: string;
  department?: string;
  position_title?: string;
  hire_date?: string;
  salary_amount?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  display_name: string;
  email?: string;
  phone?: string;
  employee_number?: string;
  employment_type?: string;
  department?: string;
  position_title?: string;
  hire_date?: string;
  salary_amount?: number;
  status?: string;
}

export const employeeService = {
  list: async (): Promise<Employee[]> => {
    const response = await api.get('/hr/employees.php');
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Employee> => {
    const response = await api.get(`/hr/employees.php?id=${id}`);
    return response.data.data;
  },

  create: async (data: EmployeeFormData): Promise<{ id: string }> => {
    const response = await api.post('/hr/employees.php', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<EmployeeFormData>): Promise<void> => {
    await api.put('/hr/employees.php', { id, ...data });
  },

  delete: async (id: string): Promise<void> => {
    await api.delete('/hr/employees.php', { data: { id } });
  },
};
