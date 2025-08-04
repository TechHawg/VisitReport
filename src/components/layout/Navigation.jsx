import React from 'react';
import { 
  Home, 
  FileText, 
  Server, 
  HardDrive, 
  Recycle, 
  Package,
  AlertTriangle,
  TrendingUp,
  Database,
  Settings,
  Camera,
  Star,
  Wrench,
  CheckSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const Navigation = () => {
  const { activePage, setActivePage } = useApp();

  const pages = [
    { 
      id: 'Dashboard', 
      label: 'Dashboard', 
      icon: <Home size={18} />, 
      description: 'Overview and quick actions' 
    },
    { 
      id: 'Summary', 
      label: 'Visit Summary', 
      icon: <FileText size={18} />, 
      description: 'Basic visit information and photos' 
    },
    { 
      id: 'OfficeGrading', 
      label: 'Office Grading', 
      icon: <Star size={18} />, 
      description: 'Grade office performance in key areas' 
    },
    { 
      id: 'Infrastructure', 
      label: 'IT Infrastructure', 
      icon: <Server size={18} />, 
      description: 'Servers, workstations, and network equipment' 
    },
    { 
      id: 'Inventory', 
      label: 'Hardware Inventory', 
      icon: <Package size={18} />, 
      description: 'Track and manage hardware assets and e-waste recycling' 
    },
    { 
      id: 'Storage', 
      label: 'Data Closet', 
      icon: <HardDrive size={18} />, 
      description: 'Manage server racks and data closet infrastructure' 
    },
    {
      id: 'IssuesActions',
      label: 'Issues & Actions',
      icon: <AlertTriangle size={18} />,
      description: 'PC repairs, issues, recommendations, and follow-up items'
    },
    { 
      id: 'ImportExport', 
      label: 'Import/Export', 
      icon: <Database size={18} />, 
      description: 'Bulk data import and export tools' 
    },
    { 
      id: 'Admin', 
      label: 'Administration', 
      icon: <Settings size={18} />, 
      description: 'Manage system settings and configurations' 
    }
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`px-4 py-3 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors duration-200 whitespace-nowrap min-w-max ${
                activePage === page.id 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              title={page.description}
              aria-label={`Navigate to ${page.label}`}
            >
              {page.icon}
              <span>{page.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;