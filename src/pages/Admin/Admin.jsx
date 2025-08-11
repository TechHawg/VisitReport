import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Users, Plus, Edit, Trash2, Save, X, CheckSquare, Upload, Eye, EyeOff, Type, GripVertical, ChevronUp, ChevronDown, Maximize2, Minimize2, Copy, Shield, UserCheck, UserX, Key } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useApp } from '../../context/AppContext';

const Admin = () => {
  const { addNotification, reportData, setReportData } = useApp();
  
  // Load initial data from localStorage
  const loadData = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return defaultValue;
    }
  };

  const [offices, setOffices] = useState(() => loadData('rss_offices', []));
  const [technicians, setTechnicians] = useState(() => loadData('rss_technicians', []));
  const [checklistTemplates, setChecklistTemplates] = useState(() => loadData('rss_checklist_templates', []));
  const [users, setUsers] = useState(() => loadData('rss_users', [
    // Default demo users for reference
    {
      id: 'demo-user-1',
      username: 'demo',
      email: 'demo@rssreport.com',
      displayName: 'Demo User',
      role: 'technician',
      isActive: true,
      isDemo: true,
      createdAt: '2024-01-01T00:00:00Z',
      lastLogin: null
    },
    {
      id: 'admin-user-1', 
      username: 'admin',
      email: 'admin@rssreport.com',
      displayName: 'Admin User',
      role: 'admin',
      isActive: true,
      isDemo: true,
      createdAt: '2024-01-01T00:00:00Z',
      lastLogin: null
    }
  ]));
  const [editingOffice, setEditingOffice] = useState(null);
  const [editingTechnician, setEditingTechnician] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('rss_offices', JSON.stringify(offices));
  }, [offices]);

  useEffect(() => {
    localStorage.setItem('rss_technicians', JSON.stringify(technicians));
  }, [technicians]);

  useEffect(() => {
    localStorage.setItem('rss_checklist_templates', JSON.stringify(checklistTemplates));
  }, [checklistTemplates]);

  useEffect(() => {
    localStorage.setItem('rss_users', JSON.stringify(users));
  }, [users]);

  // Office Management
  const handleAddOffice = () => {
    setEditingOffice({ id: Date.now(), name: '', location: '', code: '' });
  };

  const handleEditOffice = (office) => {
    setEditingOffice({ ...office });
  };

  const handleSaveOffice = () => {
    if (!editingOffice.name.trim()) {
      addNotification({
        type: 'error',
        message: 'Office name is required',
        duration: 3000
      });
      return;
    }

    if (editingOffice.id && offices.find(o => o.id === editingOffice.id)) {
      setOffices(offices.map(o => o.id === editingOffice.id ? editingOffice : o));
    } else {
      setOffices([...offices, { ...editingOffice, id: Date.now() }]);
    }

    setEditingOffice(null);
    addNotification({
      type: 'success',
      message: 'Office saved successfully',
      duration: 3000
    });
  };

  const handleDeleteOffice = (id) => {
    setOffices(offices.filter(o => o.id !== id));
    setShowDeleteDialog(null);
    addNotification({
      type: 'info',
      message: 'Office deleted successfully',
      duration: 3000
    });
  };

  // Technician Management
  const handleAddTechnician = () => {
    setEditingTechnician({ id: Date.now(), name: '', email: '', phone: '', employeeId: '' });
  };

  const handleEditTechnician = (technician) => {
    setEditingTechnician({ ...technician });
  };

  const handleSaveTechnician = () => {
    if (!editingTechnician.name.trim()) {
      addNotification({
        type: 'error',
        message: 'Technician name is required',
        duration: 3000
      });
      return;
    }

    if (editingTechnician.id && technicians.find(t => t.id === editingTechnician.id)) {
      setTechnicians(technicians.map(t => t.id === editingTechnician.id ? editingTechnician : t));
    } else {
      setTechnicians([...technicians, { ...editingTechnician, id: Date.now() }]);
    }

    setEditingTechnician(null);
    addNotification({
      type: 'success',
      message: 'Technician saved successfully',
      duration: 3000
    });
  };

  const handleDeleteTechnician = (id) => {
    setTechnicians(technicians.filter(t => t.id !== id));
    setShowDeleteDialog(null);
    addNotification({
      type: 'info',
      message: 'Technician deleted successfully',
      duration: 3000
    });
  };

  // User Management
  const handleAddUser = () => {
    setEditingUser({ 
      id: Date.now(), 
      username: '', 
      email: '', 
      displayName: '', 
      role: 'technician',
      isActive: true,
      isDemo: false,
      password: '',
      confirmPassword: ''
    });
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user, password: '', confirmPassword: '' });
  };

  const handleSaveUser = () => {
    if (!editingUser.username.trim()) {
      addNotification({
        type: 'error',
        message: 'Username is required',
        duration: 3000
      });
      return;
    }

    if (!editingUser.displayName.trim()) {
      addNotification({
        type: 'error',
        message: 'Display name is required',
        duration: 3000
      });
      return;
    }

    // Check for duplicate username (except for current user being edited)
    const existingUser = users.find(u => 
      u.username.toLowerCase() === editingUser.username.toLowerCase() && 
      u.id !== editingUser.id
    );
    
    if (existingUser) {
      addNotification({
        type: 'error',
        message: 'Username already exists',
        duration: 3000
      });
      return;
    }

    // For new users, password is required
    if (!editingUser.isDemo && (!editingUser.id || !users.find(u => u.id === editingUser.id))) {
      if (!editingUser.password) {
        addNotification({
          type: 'error',
          message: 'Password is required for new users',
          duration: 3000
        });
        return;
      }

      if (editingUser.password !== editingUser.confirmPassword) {
        addNotification({
          type: 'error',
          message: 'Passwords do not match',
          duration: 3000
        });
        return;
      }

      if (editingUser.password.length < 6) {
        addNotification({
          type: 'error',
          message: 'Password must be at least 6 characters',
          duration: 3000
        });
        return;
      }
    }

    const userToSave = {
      ...editingUser,
      lastUpdated: new Date().toISOString()
    };

    // Remove password fields from saved data (in real app, hash the password)
    delete userToSave.password;
    delete userToSave.confirmPassword;

    if (editingUser.id && users.find(u => u.id === editingUser.id)) {
      setUsers(users.map(u => u.id === editingUser.id ? userToSave : u));
      addNotification({
        type: 'success',
        message: 'User updated successfully',
        duration: 3000
      });
    } else {
      userToSave.id = Date.now();
      userToSave.createdAt = new Date().toISOString();
      setUsers([...users, userToSave]);
      addNotification({
        type: 'success',
        message: 'User created successfully',
        duration: 3000
      });
    }

    setEditingUser(null);
  };

  const handleDeleteUser = (id) => {
    const userToDelete = users.find(u => u.id === id);
    
    if (userToDelete?.isDemo) {
      addNotification({
        type: 'error',
        message: 'Cannot delete demo users',
        duration: 3000
      });
      return;
    }

    setUsers(users.filter(u => u.id !== id));
    setShowDeleteDialog(null);
    addNotification({
      type: 'info',
      message: 'User deleted successfully',
      duration: 3000
    });
  };

  const handleToggleUserStatus = (id) => {
    setUsers(users.map(u => 
      u.id === id ? { ...u, isActive: !u.isActive, lastUpdated: new Date().toISOString() } : u
    ));
    
    const user = users.find(u => u.id === id);
    addNotification({
      type: 'info',
      message: `User ${user?.isActive ? 'deactivated' : 'activated'} successfully`,
      duration: 3000
    });
  };

  const handleChangeUserRole = (id, newRole) => {
    setUsers(users.map(u => 
      u.id === id ? { ...u, role: newRole, lastUpdated: new Date().toISOString() } : u
    ));
    
    addNotification({
      type: 'success',
      message: `User role updated to ${newRole}`,
      duration: 3000
    });
  };

  // Checklist Template Management
  const handleAddTemplate = () => {
    setEditingTemplate({ 
      id: Date.now(), 
      name: '', 
      description: '',
      items: [],
      visible: true
    });
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate({ ...template });
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate.name.trim()) {
      addNotification({
        type: 'error',
        message: 'Template name is required',
        duration: 3000
      });
      return;
    }

    if (editingTemplate.id && checklistTemplates.find(t => t.id === editingTemplate.id)) {
      setChecklistTemplates(checklistTemplates.map(t => 
        t.id === editingTemplate.id ? { ...editingTemplate, lastUpdated: new Date().toISOString() } : t
      ));
    } else {
      setChecklistTemplates([...checklistTemplates, { 
        ...editingTemplate, 
        id: Date.now(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }]);
    }

    setEditingTemplate(null);
    addNotification({
      type: 'success',
      message: 'Checklist template saved successfully',
      duration: 3000
    });
  };

  const handleDeleteTemplate = (id) => {
    // Remove the template
    setChecklistTemplates(checklistTemplates.filter(t => t.id !== id));
    
    // Note: We keep the active checklist even if its template is deleted
    // The user can push a new template to replace it
    addNotification({
      type: 'info',
      message: 'Template deleted successfully. Active checklist remains in Checklists tab.',
      duration: 4000
    });
    
    setShowDeleteDialog(null);
  };

  // Push template to Checklists tab (replaces any existing active checklist)
  const handlePushTemplate = (template) => {
    
    if (!template.visible) {
      addNotification({
        type: 'warning',
        message: 'Cannot push hidden template. Make it visible first.',
        duration: 3000
      });
      return;
    }

    // Check if this exact template is already the active checklist
    const existingChecklists = reportData.checklists || [];
    const existingIndex = existingChecklists.findIndex(cl => cl.templateId === template.id);
    
    if (existingIndex >= 0) {
      // Update existing checklist with template changes (preserve user progress)
      const existing = existingChecklists[existingIndex];
      
      // Preserve user's checked status for existing items
      const updatedItems = (template.items || []).map(templateItem => {
        const existingItem = existing.items.find(item => 
          item.text === templateItem.text && item.type === templateItem.type
        );
        
        return {
          ...templateItem,
          id: existingItem ? existingItem.id : `${templateItem.id}_${Date.now()}_${Math.random()}`,
          checked: existingItem ? existingItem.checked : false,
          editing: false
        };
      });
      
      // Replace all checklists with just this updated one
      const updatedChecklist = {
        ...existing,
        title: template.name,
        description: template.description,
        items: updatedItems,
        lastUpdated: new Date().toISOString(),
        isActive: true // Mark as the active checklist
      };
      
      console.log('🔧 DEBUG: Updating existing checklist:', updatedChecklist);
      
      const updatedReportData = {
        ...reportData,
        checklists: [updatedChecklist] // Only keep this one checklist
      };
      
      console.log('🔧 DEBUG: Updated report data (existing):', updatedReportData.checklists);
      
      setReportData(updatedReportData);
      
      addNotification({
        type: 'success',
        message: 'Active checklist updated',
        duration: 3000
      });
    } else {
      // Create new checklist from template and replace all existing checklists
      const newChecklist = {
        id: `${template.id}_${Date.now()}_${Math.random()}`,
        templateId: template.id,
        title: template.name,
        description: template.description,
        items: (template.items || []).map(item => ({
          ...item,
          id: `${item.id}_${Date.now()}_${Math.random()}`,
          checked: false,
          editing: false
        })),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true // Mark as the active checklist
      };
      
      // Replace all existing checklists with this new one
      console.log('🔧 DEBUG: Current reportData before push:', reportData);
      console.log('🔧 DEBUG: Pushing new checklist:', newChecklist);
      
      const updatedReportData = {
        ...reportData,
        checklists: [newChecklist] // Only keep this one checklist
      };
      
      console.log('🔧 DEBUG: Updated report data checklists:', updatedReportData.checklists);
      
      setReportData(updatedReportData);
      
      addNotification({
        type: 'success',
        message: 'New active checklist set',
        duration: 3000
      });
    }
  };

  // Toggle template visibility
  const handleToggleVisibility = (id) => {
    setChecklistTemplates(checklistTemplates.map(t => 
      t.id === id ? { ...t, visible: !t.visible, lastUpdated: new Date().toISOString() } : t
    ));
    
    addNotification({
      type: 'info',
      message: 'Template visibility updated',
      duration: 3000
    });
  };

  // Copy template
  const handleCopyTemplate = (template) => {
    const copiedTemplate = {
      ...template,
      id: Date.now(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      visible: true
    };
    
    setChecklistTemplates([...checklistTemplates, copiedTemplate]);
    
    addNotification({
      type: 'success',
      message: 'Template copied successfully',
      duration: 3000
    });
  };

  const addTemplateItem = (itemText = '', itemType = 'checkbox') => {
    if (!editingTemplate) return;
    
    const newItem = {
      id: Date.now(),
      text: itemText,
      type: itemType, // 'checkbox', 'bullet', or 'section'
      checked: itemType === 'section' ? undefined : false
    };

    setEditingTemplate({
      ...editingTemplate,
      items: [...(editingTemplate.items || []), newItem]
    });
  };

  const updateTemplateItem = (itemId, updates) => {
    if (!editingTemplate) return;

    setEditingTemplate({
      ...editingTemplate,
      items: editingTemplate.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const removeTemplateItem = (itemId) => {
    if (!editingTemplate) return;

    setEditingTemplate({
      ...editingTemplate,
      items: editingTemplate.items.filter(item => item.id !== itemId)
    });
  };

  // Drag and drop functionality for reordering items
  const [draggedItemId, setDraggedItemId] = useState(null);
  
  // Template editor expansion state
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(false);

  const handleDragStart = (e, itemId) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetItemId) => {
    e.preventDefault();
    const draggedItemId = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (draggedItemId === targetItemId || !editingTemplate) {
      setDraggedItemId(null);
      return;
    }

    const items = [...editingTemplate.items];
    const draggedIndex = items.findIndex(item => item.id === draggedItemId);
    const targetIndex = items.findIndex(item => item.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    // Remove the dragged item and insert it at the target position
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    setEditingTemplate({
      ...editingTemplate,
      items: items
    });
    
    setDraggedItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const moveItemUp = (itemId) => {
    if (!editingTemplate) return;
    
    const items = [...editingTemplate.items];
    const index = items.findIndex(item => item.id === itemId);
    
    if (index > 0) {
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      setEditingTemplate({
        ...editingTemplate,
        items: items
      });
    }
  };

  const moveItemDown = (itemId) => {
    if (!editingTemplate) return;
    
    const items = [...editingTemplate.items];
    const index = items.findIndex(item => item.id === itemId);
    
    if (index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      setEditingTemplate({
        ...editingTemplate,
        items: items
      });
    }
  };

  return (
    <div className="space-y-6">
      <Section 
        title="System Administration" 
        icon={<Settings className="text-purple-500" />}
        helpText="Manage office locations, technicians, and other system settings."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* User Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Shield size={20} className="mr-2 text-orange-500" />
                User Management
              </h3>
              <Button size="sm" onClick={handleAddUser}>
                <Plus size={16} />
                Add User
              </Button>
            </div>

            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No users configured yet. Add your first user.
                </p>
              ) : (
                users.map(user => (
                  <div 
                    key={user.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {user.displayName || user.username}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        }`}>
                          {user.role}
                        </span>
                        {!user.isActive && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-full">
                            Inactive
                          </span>
                        )}
                        {user.isDemo && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                            Demo
                          </span>
                        )}
                      </div>
                      {user.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        @{user.username}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex items-center space-x-1">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                          className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
                          disabled={user.isDemo}
                        >
                          <option value="technician">Technician</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        variant={user.isActive ? "outline" : "success"}
                        onClick={() => handleToggleUserStatus(user.id)}
                        title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        disabled={user.isDemo}
                      >
                        {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        title="Edit user"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog({ type: 'user', item: user })}
                        title="Delete user"
                        disabled={user.isDemo}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Office Locations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <MapPin size={20} className="mr-2 text-blue-500" />
                Office Locations
              </h3>
              <Button size="sm" onClick={handleAddOffice}>
                <Plus size={16} />
                Add Office
              </Button>
            </div>

            <div className="space-y-2">
              {offices.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No offices configured yet. Add your first office location.
                </p>
              ) : (
                offices.map(office => (
                  <div 
                    key={office.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {office.name}
                      </h4>
                      {office.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {office.location}
                        </p>
                      )}
                      {office.code && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Code: {office.code}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditOffice(office)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog({ type: 'office', item: office })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Technicians */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Users size={20} className="mr-2 text-green-500" />
                Technicians
              </h3>
              <Button size="sm" onClick={handleAddTechnician}>
                <Plus size={16} />
                Add Technician
              </Button>
            </div>

            <div className="space-y-2">
              {technicians.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No technicians configured yet. Add your first technician.
                </p>
              ) : (
                technicians.map(technician => (
                  <div 
                    key={technician.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {technician.name}
                      </h4>
                      {technician.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {technician.email}
                        </p>
                      )}
                      <div className="flex space-x-3 text-xs text-gray-500 dark:text-gray-500">
                        {technician.phone && <span>Phone: {technician.phone}</span>}
                        {technician.employeeId && <span>ID: {technician.employeeId}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTechnician(technician)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog({ type: 'technician', item: technician })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checklist Templates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <CheckSquare size={20} className="mr-2 text-purple-500" />
                Checklist Templates
              </h3>
              <Button size="sm" onClick={handleAddTemplate}>
                <Plus size={16} />
                Add Template
              </Button>
            </div>

            <div className="space-y-2">
              {checklistTemplates.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No checklist templates configured yet. Add your first template.
                </p>
              ) : (
                checklistTemplates.map(template => (
                  <div 
                    key={template.id}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      template.visible !== false 
                        ? 'bg-gray-50 dark:bg-gray-700' 
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {template.name}
                        </h4>
                        {template.visible === false && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 rounded-full">
                            Hidden
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {template.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePushTemplate(template)}
                        title="Push template to Checklists tab"
                        className={`${template.visible === false ? 'opacity-50' : ''}`}
                      >
                        <Upload size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyTemplate(template)}
                        title="Copy template"
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleVisibility(template.id)}
                        title={template.visible === false ? 'Show in Checklists tab' : 'Hide from Checklists tab'}
                      >
                        {template.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                        title="Edit template"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog({ type: 'template', item: template })}
                        title="Delete template"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Edit Office Modal */}
      <Modal
        isOpen={!!editingOffice}
        onClose={() => setEditingOffice(null)}
        title={editingOffice?.id && offices.find(o => o.id === editingOffice.id) ? 'Edit Office' : 'Add Office'}
        size="md"
      >
        {editingOffice && (
          <div className="space-y-4">
            <Input
              label="Office Name *"
              value={editingOffice.name}
              onChange={(e) => setEditingOffice({ ...editingOffice, name: e.target.value })}
              placeholder="Main Office"
              required
            />
            <Input
              label="Location"
              value={editingOffice.location}
              onChange={(e) => setEditingOffice({ ...editingOffice, location: e.target.value })}
              placeholder="123 Main St, City, State"
            />
            <Input
              label="Office Code"
              value={editingOffice.code}
              onChange={(e) => setEditingOffice({ ...editingOffice, code: e.target.value })}
              placeholder="NYC-01"
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setEditingOffice(null)}>
                <X size={16} />
                Cancel
              </Button>
              <Button onClick={handleSaveOffice}>
                <Save size={16} />
                Save Office
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Technician Modal */}
      <Modal
        isOpen={!!editingTechnician}
        onClose={() => setEditingTechnician(null)}
        title={editingTechnician?.id && technicians.find(t => t.id === editingTechnician.id) ? 'Edit Technician' : 'Add Technician'}
        size="md"
      >
        {editingTechnician && (
          <div className="space-y-4">
            <Input
              label="Technician Name *"
              value={editingTechnician.name}
              onChange={(e) => setEditingTechnician({ ...editingTechnician, name: e.target.value })}
              placeholder="John Doe"
              required
            />
            <Input
              label="Email"
              type="email"
              value={editingTechnician.email}
              onChange={(e) => setEditingTechnician({ ...editingTechnician, email: e.target.value })}
              placeholder="john.doe@company.com"
            />
            <Input
              label="Phone"
              value={editingTechnician.phone}
              onChange={(e) => setEditingTechnician({ ...editingTechnician, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Employee ID"
              value={editingTechnician.employeeId}
              onChange={(e) => setEditingTechnician({ ...editingTechnician, employeeId: e.target.value })}
              placeholder="EMP001"
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setEditingTechnician(null)}>
                <X size={16} />
                Cancel
              </Button>
              <Button onClick={handleSaveTechnician}>
                <Save size={16} />
                Save Technician
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser?.id && users.find(u => u.id === editingUser.id) ? 'Edit User' : 'Add User'}
        size="md"
      >
        {editingUser && (
          <div className="space-y-4">
            <Input
              label="Username *"
              value={editingUser.username}
              onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
              placeholder="username"
              required
              disabled={editingUser.isDemo}
            />
            <Input
              label="Display Name *"
              value={editingUser.displayName}
              onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
              placeholder="Full Name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={editingUser.email}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              placeholder="user@company.com"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
                disabled={editingUser.isDemo}
              >
                <option value="technician">Technician</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            {/* Password fields for new users or when changing password */}
            {(!editingUser.isDemo && (!editingUser.id || !users.find(u => u.id === editingUser.id))) && (
              <>
                <Input
                  label="Password *"
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
                <Input
                  label="Confirm Password *"
                  type="password"
                  value={editingUser.confirmPassword || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  required
                />
              </>
            )}

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  disabled={editingUser.isDemo}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active User
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Inactive users cannot log in to the system
                  </p>
                </div>
              </label>
            </div>

            {editingUser.isDemo && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Demo User:</strong> Some settings cannot be modified for demo accounts.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                <X size={16} />
                Cancel
              </Button>
              <Button onClick={handleSaveUser}>
                <Save size={16} />
                Save User
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Checklist Template Modal */}
      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={editingTemplate?.id && checklistTemplates.find(t => t.id === editingTemplate.id) ? 'Edit Checklist Template' : 'Add Checklist Template'}
        size={isTemplateExpanded ? "xl" : "lg"}
      >
        {editingTemplate && (
          <div className="space-y-4">
            <Input
              label="Template Name *"
              value={editingTemplate.name}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              placeholder="Enter template name..."
              required
            />
            <Input
              label="Description"
              value={editingTemplate.description}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
              placeholder="Optional description..."
            />

            {/* Visibility Toggle */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={editingTemplate.visible !== false}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, visible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show in Checklists tab
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When unchecked, this template will be hidden from the Checklists tab
                  </p>
                </div>
              </label>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Template Items
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Drag items to reorder, or use the up/down arrows
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsTemplateExpanded(!isTemplateExpanded)}
                    title={isTemplateExpanded ? 'Collapse editor' : 'Expand editor for full view'}
                  >
                    {isTemplateExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addTemplateItem('', 'section')}
                  >
                    <Type size={14} />
                    Add Section
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addTemplateItem('', 'checkbox')}
                  >
                    <CheckSquare size={14} />
                    Add Checkbox
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addTemplateItem('', 'bullet')}
                  >
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    Add Bullet
                  </Button>
                </div>
              </div>
              
              <div className={`space-y-1 ${isTemplateExpanded ? 'max-h-96' : 'max-h-80'} overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 ${isTemplateExpanded ? 'bg-gray-50 dark:bg-gray-900' : ''}`}>
                {(editingTemplate.items || []).length === 0 ? (
                  <p className="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
                    No items yet. Add section headers, checkboxes or bullet points above.
                  </p>
                ) : (
                  editingTemplate.items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center space-x-1 group ${item.type === 'section' ? 'border-t pt-1' : ''} rounded py-1 px-2 transition-colors ${
                        draggedItemId === item.id 
                          ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 opacity-50' 
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Drag handle */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                        <GripVertical size={10} className="text-gray-400" />
                      </div>
                      
                      {/* Item type icon */}
                      {item.type === 'section' ? (
                        <Type size={12} className="text-purple-600 flex-shrink-0" />
                      ) : item.type === 'bullet' ? (
                        <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        </div>
                      ) : (
                        <CheckSquare size={12} className="text-blue-600 flex-shrink-0" />
                      )}
                      
                      {/* Input field */}
                      <Input
                        value={item.text}
                        onChange={(e) => updateTemplateItem(item.id, { text: e.target.value })}
                        placeholder={item.type === 'section' ? 'Section title...' : 'Enter item text...'}
                        className={`flex-1 text-sm h-7 ${item.type === 'section' ? 'font-semibold' : ''}`}
                      />
                      
                      {/* Reorder buttons */}
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveItemUp(item.id)}
                          disabled={index === 0}
                          className="p-0.5 h-5 w-5 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp size={8} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveItemDown(item.id)}
                          disabled={index === editingTemplate.items.length - 1}
                          className="p-0.5 h-5 w-5 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown size={8} />
                        </Button>
                      </div>
                      
                      {/* Delete button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTemplateItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 p-0.5 h-5 w-5"
                        title="Delete item"
                      >
                        <X size={8} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                <X size={16} />
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                <Save size={16} />
                Save Template
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => {
          if (showDeleteDialog.type === 'office') {
            handleDeleteOffice(showDeleteDialog.item.id);
          } else if (showDeleteDialog.type === 'template') {
            handleDeleteTemplate(showDeleteDialog.item.id);
          } else if (showDeleteDialog.type === 'user') {
            handleDeleteUser(showDeleteDialog.item.id);
          } else {
            handleDeleteTechnician(showDeleteDialog.item.id);
          }
        }}
        title={`Delete ${
          showDeleteDialog?.type === 'office' ? 'Office' : 
          showDeleteDialog?.type === 'template' ? 'Checklist Template' : 
          showDeleteDialog?.type === 'user' ? 'User' :
          'Technician'
        }`}
        message={`Are you sure you want to delete "${
          showDeleteDialog?.item?.name || 
          showDeleteDialog?.item?.displayName || 
          showDeleteDialog?.item?.username
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Admin;