import api from '../api';

export interface Quotation {
  id: string;
  company_id: string;
  contact_id: string;
  opportunity_id: string | null;
  quotation_number: string;
  title: string;
  description: string | null;
  issue_date: string;
  expiry_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  converted_to_invoice_id: string | null;
  payment_terms: number;
  terms_and_conditions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  contact_tax_id?: string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure: string;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  product_id: string | null;
  created_at: string;
}

export interface CreateQuotationData {
  contact_id: string;
  opportunity_id?: string;
  title: string;
  description?: string;
  issue_date?: string;
  expiry_date: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
  currency?: string;
  status?: string;
  payment_terms?: number;
  terms_and_conditions?: string;
  notes?: string;
  items: CreateQuotationItemData[];
}

export interface CreateQuotationItemData {
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure?: string;
  tax_rate?: number;
  tax_amount?: number;
  line_total: number;
  product_id?: string;
}

export interface UpdateQuotationData extends Partial<CreateQuotationData> {
  id: string;
}

class QuotationService {
  async listQuotations(filters?: {
    status?: string;
    contact_id?: string;
    search?: string;
  }): Promise<Quotation[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.contact_id) params.append('contact_id', filters.contact_id);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/crm/quotations.php?${params.toString()}`);
    return response.data.data.quotations;
  }

  async getQuotation(id: string): Promise<Quotation> {
    const response = await api.get(`/crm/quotations.php?id=${id}`);
    return response.data.data.quotation;
  }

  async createQuotation(data: CreateQuotationData): Promise<string> {
    const response = await api.post('/crm/quotations.php', data);
    return response.data.data.quotation_id;
  }

  async updateQuotation(data: UpdateQuotationData): Promise<void> {
    await api.put('/crm/quotations.php', data);
  }

  async deleteQuotation(id: string): Promise<void> {
    await api.delete('/crm/quotations.php', { data: { id } });
  }

  async sendQuotation(quotationId: string): Promise<void> {
    await api.post('/crm/quotations-send.php', { quotation_id: quotationId });
  }

  async acceptQuotation(quotationId: string): Promise<void> {
    await api.post('/crm/quotations-accept.php', { quotation_id: quotationId });
  }

  async rejectQuotation(quotationId: string): Promise<void> {
    await api.post('/crm/quotations-reject.php', { quotation_id: quotationId });
  }
}

export default new QuotationService();
