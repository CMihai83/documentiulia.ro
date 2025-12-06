import { useState } from 'react';
import { Briefcase, ChevronDown } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from './ProjectSelector';

export default function ProjectSwitcher() {
  const { activeProject, projects } = useProject();
  const [showSelector, setShowSelector] = useState(false);

  return (
    <>
      <div className="px-4 pb-4 border-b border-gray-200">
        <button
          onClick={() => setShowSelector(true)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: activeProject?.color || '#6366f1',
              }}
            >
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Active Project</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {activeProject?.name || 'No project selected'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
        </button>

        {projects.length === 0 && !activeProject && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            No projects yet. Create one to get started.
          </p>
        )}
      </div>

      <ProjectSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        title="Switch Project"
        description="Select a project to work on"
      />
    </>
  );
}
