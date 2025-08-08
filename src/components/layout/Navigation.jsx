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
  const { activePage, setActivePage, user, isAuthenticated, hasPermission, hasRole } = useApp();
  
  // Debug: Log user info when component renders
  console.log('🔍 Navigation - Current user:', user);
  console.log('🔍 Navigation - User role:', user?.role);
  console.log('🔍 Navigation - User roles array:', user?.roles);
  console.log('🔍 Navigation - User ID:', user?.id);
  console.log('🔍 Navigation - User username:', user?.username);
  console.log('🔍 Navigation - Is authenticated:', isAuthenticated);
  console.log('🔍 Navigation - hasRole function available:', typeof hasRole);
  console.log('🔍 Navigation - Testing hasRole("admin"):', typeof hasRole === 'function' ? hasRole('admin') : 'N/A');

  const pages = [
    { 
      id: 'Dashboard', 
      label: 'Dashboard', 
      icon: <Home size={18} />, 
      description: 'Overview and quick actions',
      permissions: ['*'], // Available to all authenticated users
      roles: ['admin', 'manager', 'technician', 'viewer']
    },
    { 
      id: 'Checklists', 
      label: 'Checklists', 
      icon: <CheckSquare size={18} />, 
      description: 'View and complete checklists for your visit report',
      permissions: ['reports:view:assigned', 'reports:create'],
      roles: ['admin', 'manager', 'technician']
    },
    { 
      id: 'Summary', 
      label: 'Visit Summary', 
      icon: <FileText size={18} />, 
      description: 'Basic visit information and photos',
      permissions: ['reports:view:assigned', 'reports:create'],
      roles: ['admin', 'manager', 'technician']
    },
    { 
      id: 'Infrastructure', 
      label: 'IT Infrastructure', 
      icon: <Server size={18} />, 
      description: 'Servers, workstations, and network equipment',
      permissions: ['hardware:manage', 'reports:create'],
      roles: ['admin', 'manager', 'technician']
    },
    { 
      id: 'Inventory', 
      label: 'Hardware Inventory', 
      icon: <Package size={18} />, 
      description: 'Track and manage hardware assets and e-waste recycling',
      permissions: ['reports:view:assigned', 'reports:create'],
      roles: ['admin', 'manager', 'technician']
    },
    { 
      id: 'Storage', 
      label: 'Data Closet', 
      icon: <HardDrive size={18} />, 
      description: 'Manage server racks and data closet infrastructure',
      permissions: ['hardware:manage', 'reports:create'],
      roles: ['admin', 'manager', 'technician']
    },
    {
      id: 'IssuesActions',
      label: 'Issues & Actions',
      icon: <AlertTriangle size={18} />,
      description: 'PC repairs, issues, recommendations, and follow-up items',
      permissions: ['reports:create', 'reports:edit:own'],
      roles: ['admin', 'manager', 'technician']
    },
    { 
      id: 'ImportExport', 
      label: 'Import/Export', 
      icon: <Database size={18} />, 
      description: 'Bulk data import and export tools',
      permissions: ['reports:export:own', 'reports:view:all'],
      roles: ['admin', 'manager']
    },
    { 
      id: 'Admin', 
      label: 'Administration', 
      icon: <Settings size={18} />, 
      description: 'Manage system settings and configurations',
      permissions: ['admin:*', 'system:settings'],
      roles: ['admin']
    }
  ];

  // Function to check if user has access to a page
  const hasPageAccess = (page) => {
    // If user is not authenticated, no access
    if (!isAuthenticated) {
      console.log(`🔍 Page ${page.id}: DENIED - Not authenticated`);
      return false;
    }

    const hasRoleFunc = hasRole && typeof hasRole === 'function';
    const hasPermissionFunc = hasPermission && typeof hasPermission === 'function';
    const userHasRole = user?.role;

    console.log(`🔍 Page ${page.id}: Auth functions available - hasRole: ${hasRoleFunc}, hasPermission: ${hasPermissionFunc}, user role: ${userHasRole}`);
    
    // Special debugging for Admin page
    if (page.id === 'Admin') {
      console.log('🔍 ADMIN PAGE DEBUG:', {
        pageId: page.id,
        pageRoles: page.roles,
        pagePermissions: page.permissions,
        userRole: user?.role,
        userId: user?.id,
        username: user?.username,
        hasRoleAdmin: hasRoleFunc ? hasRole('admin') : 'N/A',
        hasPermissionAdmin: hasPermissionFunc ? hasPermission('admin:*') : 'N/A',
        hasPermissionSystem: hasPermissionFunc ? hasPermission('system:settings') : 'N/A'
      });
    }
    
    // FALLBACK: If enterprise auth functions aren't available or user has no role, 
    // default to allowing access to all pages except Admin (for demo compatibility)
    // EXCEPTION: Allow admin users to access Admin page even in fallback mode
    if (!hasRoleFunc || !hasPermissionFunc || !userHasRole) {
      console.log(`🔍 Page ${page.id}: Using fallback auth - user role: ${user?.role}`);
      
      // Special case: if this is the Admin page and user has admin role, allow access
      if (page.id === 'Admin' && user?.role === 'admin') {
        console.log(`🔍 Page ${page.id}: GRANTED - Admin user in fallback mode`);
        return true;
      }
      
      const allowed = page.id !== 'Admin';
      console.log(`🔍 Page ${page.id}: Using fallback auth - allowing ${allowed ? 'YES' : 'NO'}`);
      return allowed;
    }

    console.log(`🔍 Page ${page.id}: Testing enterprise auth...`);
    
    // If user has admin role, allow access to everything
    const isAdmin = hasRole('admin');
    if (isAdmin) {
      console.log(`🔍 Page ${page.id}: GRANTED - User is admin`);
      return true;
    }

    // Check role-based access
    const hasRequiredRole = page.roles?.some(role => {
      const roleResult = hasRole(role);
      console.log(`🔍 Page ${page.id}: Role check ${role} = ${roleResult}`);
      return roleResult;
    }) ?? true;
    
    console.log(`🔍 Page ${page.id}: Has required role = ${hasRequiredRole}`);
    
    if (!hasRequiredRole) {
      console.log(`🔍 Page ${page.id}: DENIED - No required role`);
      return false;
    }

    // Check permission-based access
    if (page.permissions && page.permissions.length > 0) {
      console.log(`🔍 Page ${page.id}: Checking permissions:`, page.permissions);
      
      // If permissions include '*', allow access to authenticated users
      if (page.permissions.includes('*')) {
        console.log(`🔍 Page ${page.id}: GRANTED - Has wildcard permission`);
        return true;
      }
      
      // Check if user has any of the required permissions
      const hasAnyPermission = page.permissions.some(permission => {
        const permResult = hasPermission(permission);
        console.log(`🔍 Page ${page.id}: Permission check ${permission} = ${permResult}`);
        return permResult;
      });
      
      console.log(`🔍 Page ${page.id}: Has any required permission = ${hasAnyPermission}`);
      return hasAnyPermission;
    }

    // If no specific permissions defined, allow access based on role
    console.log(`🔍 Page ${page.id}: GRANTED - No specific permissions, has required role`);
    return hasRequiredRole;
  };

  // Filter pages based on user access
  const accessiblePages = pages.filter(hasPageAccess);

  // If current page is not accessible, redirect to first accessible page
  React.useEffect(() => {
    if (isAuthenticated && accessiblePages.length > 0) {
      const currentPageAccessible = accessiblePages.some(page => page.id === activePage);
      if (!currentPageAccessible) {
        // Redirect to first accessible page (usually Dashboard)
        setActivePage(accessiblePages[0].id);
      }
    }
  }, [isAuthenticated, user, activePage, accessiblePages, setActivePage]);

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {accessiblePages.map(page => (
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