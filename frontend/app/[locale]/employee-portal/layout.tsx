import { ReactNode } from 'react';

interface EmployeePortalLayoutProps {
  children: ReactNode;
}

export default function EmployeePortalLayout({ children }: EmployeePortalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                DocumentIulia.ro - Employee Portal
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Time Off
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Payslips
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Documents
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Profile
              </a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}