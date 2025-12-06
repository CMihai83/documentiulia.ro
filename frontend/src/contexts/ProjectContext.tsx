import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  color?: string;
}

interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active project from localStorage on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('active_project_id');
    const savedProjectName = localStorage.getItem('active_project_name');

    if (savedProjectId && savedProjectName) {
      setActiveProjectState({
        id: savedProjectId,
        name: savedProjectName,
      });
    }
  }, []);

  // Fetch projects list
  const refreshProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      if (!token || !companyId) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        'https://documentiulia.ro/api/v1/projects/projects.php',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        const projectList = result.data?.projects || result.data || [];
        setProjects(Array.isArray(projectList) ? projectList : []);
      } else {
        throw new Error(result.message || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects on mount (only if authenticated)
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const companyId = localStorage.getItem('company_id');

    if (token && companyId) {
      refreshProjects();
    }
  }, []);

  // Save active project to localStorage
  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);

    if (project) {
      localStorage.setItem('active_project_id', project.id);
      localStorage.setItem('active_project_name', project.name);
    } else {
      localStorage.removeItem('active_project_id');
      localStorage.removeItem('active_project_name');
    }
  };

  const value: ProjectContextType = {
    activeProject,
    setActiveProject,
    projects,
    loading,
    error,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
