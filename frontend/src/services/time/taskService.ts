import api from '../api';

export interface Task {
  id: string;
  company_id: string;
  project_id: string | null;
  project_name?: string;
  project_color?: string;
  name: string;
  description: string | null;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  assigned_to_name?: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskBoard {
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
}

export interface CreateTaskData {
  name: string;
  project_id?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  id: string;
}

class TaskService {
  async listTasks(filters?: {
    project_id?: string;
    assigned_to?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/time/tasks.php?${params.toString()}`);
    return response.data.data.tasks;
  }

  async getTask(id: string): Promise<Task> {
    const response = await api.get(`/time/tasks.php?id=${id}`);
    return response.data.data.task;
  }

  async getTaskBoard(projectId?: string): Promise<TaskBoard> {
    const params = new URLSearchParams({ board: 'true' });
    if (projectId) params.append('project_id', projectId);

    const response = await api.get(`/time/tasks.php?${params.toString()}`);
    return response.data.data.board;
  }

  async getMyTasks(): Promise<Task[]> {
    const response = await api.get('/time/tasks.php?my_tasks=true');
    return response.data.data.tasks;
  }

  async createTask(data: CreateTaskData): Promise<string> {
    const response = await api.post('/time/tasks.php', data);
    return response.data.data.task_id;
  }

  async updateTask(data: UpdateTaskData): Promise<void> {
    await api.put('/time/tasks.php', data);
  }

  async deleteTask(id: string): Promise<void> {
    await api.delete('/time/tasks.php', { data: { id } });
  }
}

export default new TaskService();
