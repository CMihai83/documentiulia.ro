import api from '../api';

export interface Project {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  client_name?: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  budget_type: string | null;
  currency: string;
  color: string;
  is_billable: boolean;
  default_hourly_rate: number | null;
  created_by: string | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  total_hours?: number;
}

export interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  total_time_entries: number;
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  percentage_used: number;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  client_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  budget_type?: string;
  currency?: string;
  color?: string;
  is_billable?: boolean;
  default_hourly_rate?: number;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

class ProjectService {
  async listProjects(filters?: {
    status?: string;
    client_id?: string;
    search?: string;
  }): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.client_id) params.append('client_id', filters.client_id);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/time/projects.php?${params.toString()}`);
    return response.data.data.projects;
  }

  async getProject(id: string): Promise<{
    project: Project;
    stats: ProjectStats;
    budget_status: BudgetStatus | null;
  }> {
    const response = await api.get(`/time/projects.php?id=${id}`);
    return response.data.data;
  }

  async createProject(data: CreateProjectData): Promise<string> {
    const response = await api.post('/time/projects.php', data);
    return response.data.data.project_id;
  }

  async updateProject(data: UpdateProjectData): Promise<void> {
    await api.put('/time/projects.php', data);
  }

  async deleteProject(id: string): Promise<void> {
    await api.delete('/time/projects.php', { data: { id } });
  }
}

export default new ProjectService();
