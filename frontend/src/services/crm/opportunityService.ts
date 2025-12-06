import api from '../api';

export interface Opportunity {
  id: string;
  company_id: string;
  contact_id: string | null;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  stage: string;
  stage_changed_at: string;
  assigned_to: string | null;
  loss_reason: string | null;
  loss_notes: string | null;
  source: string | null;
  campaign: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  assigned_to_name?: string;
  activities?: OpportunityActivity[];
}

export interface OpportunityActivity {
  id: string;
  opportunity_id: string;
  user_id: string | null;
  activity_type: string;
  subject: string | null;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  created_at: string;
  user_name?: string;
}

export interface Pipeline {
  lead: Opportunity[];
  qualified: Opportunity[];
  proposal: Opportunity[];
  negotiation: Opportunity[];
  won: Opportunity[];
  lost: Opportunity[];
}

export interface CreateOpportunityData {
  contact_id?: string;
  name: string;
  description?: string;
  amount?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  stage?: string;
  assigned_to?: string;
  source?: string;
  campaign?: string;
}

export interface UpdateOpportunityData extends Partial<CreateOpportunityData> {
  id: string;
  loss_reason?: string;
  loss_notes?: string;
}

export interface CreateActivityData {
  opportunity_id: string;
  activity_type: string;
  subject?: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  duration_minutes?: number;
  outcome?: string;
}

class OpportunityService {
  async listOpportunities(filters?: {
    stage?: string;
    contact_id?: string;
    assigned_to?: string;
    search?: string;
  }): Promise<Opportunity[]> {
    const params = new URLSearchParams();
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.contact_id) params.append('contact_id', filters.contact_id);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/crm/opportunities.php?${params.toString()}`);
    return response.data.data.opportunities;
  }

  async getOpportunity(id: string): Promise<Opportunity> {
    const response = await api.get(`/crm/opportunities.php?id=${id}`);
    return response.data.data.opportunity;
  }

  async createOpportunity(data: CreateOpportunityData): Promise<string> {
    const response = await api.post('/crm/opportunities.php', data);
    return response.data.data.opportunity_id;
  }

  async updateOpportunity(data: UpdateOpportunityData): Promise<void> {
    await api.put('/crm/opportunities.php', data);
  }

  async deleteOpportunity(id: string): Promise<void> {
    await api.delete('/crm/opportunities.php', { data: { id } });
  }

  async getPipeline(): Promise<Pipeline> {
    const response = await api.get('/crm/opportunities-pipeline.php');
    return response.data.data.pipeline;
  }

  async addActivity(data: CreateActivityData): Promise<string> {
    const response = await api.post('/crm/opportunities-activity.php', data);
    return response.data.activity_id;
  }
}

export default new OpportunityService();
