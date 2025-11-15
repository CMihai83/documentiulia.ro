import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  TrendingUp,
  Lightbulb,
  Brain,
  Scale,
  UserCircle,
  Settings,
  LogOut,
  X,
  GitBranch,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Panou Control', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Facturi', path: '/invoices', icon: FileText },
  { name: 'Cheltuieli', path: '/expenses', icon: Receipt },
  { name: 'Contacte', path: '/contacts', icon: Users },
  { name: 'Rapoarte', path: '/reports', icon: TrendingUp },
  { name: 'Analize AI', path: '/insights', icon: Lightbulb },
  { name: 'Consultant Business', path: '/business-consultant', icon: Brain },
  { name: 'Legislație Fiscală', path: '/fiscal-law', icon: Scale },
  { name: 'Arbori de Decizie', path: '/decision-trees', icon: GitBranch },
  { name: 'Context Personal', path: '/personal-context', icon: UserCircle },
];

const adminNavItems: NavItem[] = [
  { name: 'Actualizări Arbori', path: '/admin/decision-tree-updates', icon: Shield },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={handleLinkClick}>
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">DocumentIulia</h1>
              <p className="text-xs text-gray-500">Contabilitate AI</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-700' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Section */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Administrare
                </p>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-orange-700' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>

          <Link
            to="/settings"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm">Setări</span>
          </Link>

          <button
            onClick={() => {
              logout();
              handleLinkClick();
            }}
            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Deconectare</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
