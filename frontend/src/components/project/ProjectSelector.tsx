import { useState, useEffect } from 'react';
import { X, Search, Briefcase, CheckCircle, Plus } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

interface ProjectSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (projectId: string) => void;
  title?: string;
  description?: string;
}

export default function ProjectSelector({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Project',
  description = 'Choose a project to continue',
}: ProjectSelectorProps) {
  const { projects, activeProject, setActiveProject, loading, refreshProjects } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && projects.length === 0 && !loading) {
      refreshProjects();
    }
  }, [isOpen]);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProject = (project: any) => {
    setActiveProject(project);

    if (onSelect) {
      onSelect(project.id);
    }

    onClose();
  };

  const handleCreateProject = () => {
    navigate('/projects');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Projects List */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading projects...</p>
                </div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create your first project to get started'}
                </p>
                <button
                  onClick={handleCreateProject}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project) => {
                  const isActive = activeProject?.id === project.id;

                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: project.color || '#6366f1',
                            }}
                          >
                            <Briefcase className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-gray-600 truncate mt-0.5">
                                {project.description}
                              </p>
                            )}
                            {project.status && (
                              <span
                                className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${
                                  project.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {project.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={handleCreateProject}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Create New Project
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
