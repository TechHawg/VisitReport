import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Users, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useApp } from '../../context/AppContext';

const Admin = () => {
  const { addNotification } = useApp();
  
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
  const [editingOffice, setEditingOffice] = useState(null);
  const [editingTechnician, setEditingTechnician] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('rss_offices', JSON.stringify(offices));
  }, [offices]);

  useEffect(() => {
    localStorage.setItem('rss_technicians', JSON.stringify(technicians));
  }, [technicians]);

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

  return (
    <div className="space-y-6">
      <Section 
        title="System Administration" 
        icon={<Settings className="text-purple-500" />}
        helpText="Manage office locations, technicians, and other system settings."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => {
          if (showDeleteDialog.type === 'office') {
            handleDeleteOffice(showDeleteDialog.item.id);
          } else {
            handleDeleteTechnician(showDeleteDialog.item.id);
          }
        }}
        title={`Delete ${showDeleteDialog?.type === 'office' ? 'Office' : 'Technician'}`}
        message={`Are you sure you want to delete "${showDeleteDialog?.item?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Admin;