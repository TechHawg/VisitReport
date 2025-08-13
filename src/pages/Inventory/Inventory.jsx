import React, { useState, useRef } from 'react';
import { 
  Package, Plus, Edit, Trash2, BarChart3, Download, Upload, 
  FileSpreadsheet, Mail, Calculator, Monitor, Phone, Users,
  Headphones, HardDrive, Printer, Recycle
} from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useApp } from '../../context/AppContext';
import { EMAIL_RECIPIENTS } from '../../constants/emailConfig';
import Recycling from '../Recycling/Recycling';
import OfficeInventoryTable from '../../features/inventory/OfficeInventoryTable.tsx';

const Inventory = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const [editingItem, setEditingItem] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [importData, setImportData] = useState('');
  const fileInputRef = useRef(null);

  // Initialize inventory data structure from initialData
  const inventoryData = reportData.inventory || {
    items: [
      { description: 'PCs', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Laptops', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Monitors', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Webcams', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Phones', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Headsets', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Direct Connect', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Workstations', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Desk Chairs', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Wireless Headsets', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'VPN Phone', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
    ],
    lastUpdated: new Date().toISOString().split('T')[0],
    notes: ''
  };

  const updateInventoryData = (field, value) => {
    const updatedInventory = { ...inventoryData, [field]: value, lastUpdated: new Date().toISOString().split('T')[0] };
    updateReportData('inventory', updatedInventory);
  };

  const tabs = [
    { 
      id: 'general', 
      label: 'General Inventory', 
      icon: <Package size={18} />,
      description: 'Track standard hardware items and equipment'
    },
    { 
      id: 'recycling', 
      label: 'E-Waste & Recycling', 
      icon: <Recycle size={18} />,
      description: 'Equipment disposal and recycling tracking'
    }
  ];

  const getItemIcon = (description) => {
    const iconMap = {
      'PCs': <Monitor size={16} />,
      'Laptops': <HardDrive size={16} />,
      'Monitors': <Monitor size={16} />,
      'Phones': <Phone size={16} />,
      'Headsets': <Headphones size={16} />,
      'Wireless Headsets': <Headphones size={16} />,
      'Printers': <Printer size={16} />,
      'Workstations': <Building2 size={16} />,
      'default': <Package size={16} />
    };
    return iconMap[description] || iconMap.default;
  };

  const handleItemChange = (index, field, subField, value) => {
    const newItems = [...inventoryData.items];
    if (subField) {
      newItems[index][field][subField] = parseInt(value) || 0;
    } else {
      newItems[index][field] = parseInt(value) || 0;
    }
    updateInventoryData('items', newItems);
  };


  const addCustomItem = () => {
    setEditingItem({
      description: '',
      inUse: 0,
      otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 },
      spares: { onFloor: 0, inStorage: 0 },
      broken: 0,
      isNew: true
    });
  };

  const saveCustomItem = () => {
    if (!editingItem.description.trim()) {
      addNotification({
        type: 'error',
        message: 'Item description is required',
        duration: 3000
      });
      return;
    }

    const newItems = [...inventoryData.items, editingItem];
    updateInventoryData('items', newItems);
    setEditingItem(null);
    
    addNotification({
      type: 'success',
      message: 'Custom item added successfully',
      duration: 3000
    });
  };

  const deleteItem = (index) => {
    const newItems = inventoryData.items.filter((_, i) => i !== index);
    updateInventoryData('items', newItems);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Item removed successfully',
      duration: 3000
    });
  };

  // Calculate totals and progress
  const calculateTotals = () => {
    if (!inventoryData?.items || !Array.isArray(inventoryData.items)) {
      return { total: 0, inUse: 0, spare: 0, broken: 0 };
    }
    
    return inventoryData.items.reduce((totals, item) => {
      // Safely handle both old and new data formats
      const inUse = item.inUse || item.inUseByEmployees || 0;
      const broken = item.broken || 0;
      
      // Handle otherUse - could be an object or individual fields
      let otherUseTotal = 0;
      if (item.otherUse && typeof item.otherUse === 'object') {
        otherUseTotal = Object.values(item.otherUse).reduce((sum, val) => sum + (val || 0), 0);
      } else {
        // New format with individual fields
        otherUseTotal = (item.training || 0) + (item.conference || 0) + 
                       (item.gsm || 0) + (item.prospecting || 0) + 
                       (item.applicant || 0) + (item.visitor || 0) + 
                       (item.otherUse || 0);
      }
      
      // Handle spares - could be an object or individual fields
      let sparesTotal = 0;
      if (item.spares && typeof item.spares === 'object') {
        sparesTotal = Object.values(item.spares).reduce((sum, val) => sum + (val || 0), 0);
      } else {
        // New format with individual fields
        sparesTotal = (item.sparesOnFloor || 0) + (item.sparesInStorage || 0);
      }
      
      const itemTotal = inUse + otherUseTotal + sparesTotal + broken;
      
      return {
        total: totals.total + itemTotal,
        inUse: totals.inUse + inUse,
        spare: totals.spare + sparesTotal,
        broken: totals.broken + broken
      };
    }, { total: 0, inUse: 0, spare: 0, broken: 0 });
  };

  const calculateProgress = () => {
    if (!inventoryData?.items || !Array.isArray(inventoryData.items)) {
      return 0;
    }
    
    const totalItems = inventoryData.items.length;
    const completedItems = inventoryData.items.filter(item => {
      // Safely handle both old and new data formats
      const inUse = item.inUse || item.inUseByEmployees || 0;
      const broken = item.broken || 0;
      
      // Handle otherUse - could be an object or individual fields
      let otherUseTotal = 0;
      if (item.otherUse && typeof item.otherUse === 'object') {
        otherUseTotal = Object.values(item.otherUse).reduce((sum, val) => sum + (val || 0), 0);
      } else {
        // New format with individual fields
        otherUseTotal = (item.training || 0) + (item.conference || 0) + 
                       (item.gsm || 0) + (item.prospecting || 0) + 
                       (item.applicant || 0) + (item.visitor || 0) + 
                       (item.otherUse || 0);
      }
      
      // Handle spares - could be an object or individual fields
      let sparesTotal = 0;
      if (item.spares && typeof item.spares === 'object') {
        sparesTotal = Object.values(item.spares).reduce((sum, val) => sum + (val || 0), 0);
      } else {
        // New format with individual fields
        sparesTotal = (item.sparesOnFloor || 0) + (item.sparesInStorage || 0);
      }
      
      const itemTotal = inUse + otherUseTotal + sparesTotal + broken;
      return itemTotal > 0;
    }).length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // CSV Export functionality
  const exportToCSV = () => {
    if (!inventoryData?.items || !Array.isArray(inventoryData.items)) {
      addNotification({
        type: 'error',
        message: 'No inventory data to export',
        duration: 3000
      });
      return;
    }
    
    const headers = [
      'Description', 'In Use', 'Training', 'Conference', 'GSM', 'Prospecting', 
      'Applicant', 'Visitor', 'Other Use', 'Spares On Floor', 'Spares In Storage', 'Broken', 'Total'
    ];
    
    const rows = inventoryData.items.map(item => {
      // Safely handle both old and new data formats
      const inUse = item.inUse || item.inUseByEmployees || 0;
      const broken = item.broken || 0;
      const description = item.description || item.name || '';
      
      // Handle otherUse - could be an object or individual fields
      let training = 0, conf = 0, gsm = 0, prospecting = 0, applicant = 0, visitor = 0, other = 0;
      if (item.otherUse && typeof item.otherUse === 'object') {
        training = item.otherUse.training || 0;
        conf = item.otherUse.conf || 0;
        gsm = item.otherUse.gsm || 0;
        prospecting = item.otherUse.prospecting || 0;
        applicant = item.otherUse.applicant || 0;
        visitor = item.otherUse.visitor || 0;
        other = item.otherUse.other || 0;
      } else {
        // New format with individual fields
        training = item.training || 0;
        conf = item.conference || 0;
        gsm = item.gsm || 0;
        prospecting = item.prospecting || 0;
        applicant = item.applicant || 0;
        visitor = item.visitor || 0;
        other = item.otherUse || 0;
      }
      
      // Handle spares - could be an object or individual fields
      let onFloor = 0, inStorage = 0;
      if (item.spares && typeof item.spares === 'object') {
        onFloor = item.spares.onFloor || 0;
        inStorage = item.spares.inStorage || 0;
      } else {
        // New format with individual fields
        onFloor = item.sparesOnFloor || 0;
        inStorage = item.sparesInStorage || 0;
      }
      
      const total = inUse + training + conf + gsm + prospecting + applicant + visitor + other + onFloor + inStorage + broken;
      
      return [
        `"${description}"`,
        inUse,
        training,
        conf,
        gsm,
        prospecting,
        applicant,
        visitor,
        other,
        onFloor,
        inStorage,
        broken,
        total
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addNotification({
        type: 'success',
        message: 'Inventory data exported successfully',
        duration: 3000
      });
    }
  };

  // Email functionality
  const generateEmailReport = () => {
    const totals = calculateTotals();
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Hardware Inventory Report - ${office} - ${date}`;
    
    let body = `Hardware Inventory Report\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    body += `INVENTORY SUMMARY:\n`;
    body += `Total Items Tracked: ${totals.total}\n`;
    body += `Items in Use: ${totals.inUse}\n`;
    body += `Spare Items: ${totals.spare}\n`;
    body += `Broken Items: ${totals.broken}\n\n`;
    
    body += `DETAILED INVENTORY:\n`;
    inventoryData.items.forEach(item => {
      // Safely handle both old and new data formats
      const inUse = item.inUse || item.inUseByEmployees || 0;
      const broken = item.broken || 0;
      const description = item.description || item.name || '';
      
      // Handle otherUse safely
      let otherUseTotal = 0;
      let training = 0, conf = 0, gsm = 0;
      if (item.otherUse && typeof item.otherUse === 'object') {
        otherUseTotal = Object.values(item.otherUse).reduce((sum, val) => sum + (val || 0), 0);
        training = item.otherUse.training || 0;
        conf = item.otherUse.conf || 0;
        gsm = item.otherUse.gsm || 0;
      } else {
        // New format
        training = item.training || 0;
        conf = item.conference || 0;
        gsm = item.gsm || 0;
        otherUseTotal = training + conf + gsm + (item.prospecting || 0) + 
                       (item.applicant || 0) + (item.visitor || 0) + (item.other || 0);
      }
      
      // Handle spares safely
      let sparesTotal = 0;
      if (item.spares && typeof item.spares === 'object') {
        sparesTotal = Object.values(item.spares).reduce((sum, val) => sum + (val || 0), 0);
      } else {
        sparesTotal = (item.sparesOnFloor || 0) + (item.sparesInStorage || 0);
      }
      
      const itemTotal = inUse + otherUseTotal + sparesTotal + broken;
      
      if (itemTotal > 0) {
        body += `\n${description}:\n`;
        body += `  In Use: ${inUse}\n`;
        body += `  Training: ${training}\n`;
        body += `  Conference: ${conf}\n`;
        body += `  GSM: ${gsm}\n`;
        // Handle remaining fields safely
        const prospecting = item.otherUse?.prospecting || item.prospecting || 0;
        const applicant = item.otherUse?.applicant || item.applicant || 0;
        const visitor = item.otherUse?.visitor || item.visitor || 0;
        const other = item.otherUse?.other || item.other || 0;
        const onFloor = item.spares?.onFloor || item.sparesOnFloor || 0;
        const inStorage = item.spares?.inStorage || item.sparesInStorage || 0;
        
        body += `  Prospecting: ${prospecting}\n`;
        body += `  Applicant: ${applicant}\n`;
        body += `  Visitor: ${visitor}\n`;
        body += `  Other: ${other}\n`;
        body += `  Spares (Floor): ${onFloor}\n`;
        body += `  Spares (Storage): ${inStorage}\n`;
        body += `  Broken: ${broken}\n`;
        body += `  Total: ${itemTotal}\n`;
      }
    });
    
    
    if (inventoryData.notes) {
      body += `\nNOTES:\n${inventoryData.notes}\n`;
    }
    
    const recipients = EMAIL_RECIPIENTS.inventory || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with inventory report',
      duration: 3000
    });
  };

  const totals = calculateTotals();
  const progress = calculateProgress();

  const renderGeneralInventory = () => (
    <div className="space-y-6">
      {/* Use the new OfficeInventoryTable component */}
      <OfficeInventoryTable 
        data={inventoryData}
        onUpdate={(updatedData) => {
          updateReportData('inventory', updatedData);
        }}
      />
      
      {/* Notes Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Inventory Notes
        </label>
        <textarea
          value={inventoryData.notes}
          onChange={(e) => updateInventoryData('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
          rows={4}
          placeholder="Add any additional notes about the inventory..."
        />
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Inventory Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Inventory Documentation Progress"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {inventoryData.lastUpdated}
          </div>
        </div>
      </Section>

      <Section 
        title="Hardware Inventory Management" 
        icon={<Package className="text-orange-500" />}
        helpText="Track and manage hardware assets during your office visit. Document quantities, locations, and conditions."
      >
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'general' && renderGeneralInventory()}
          {activeTab === 'recycling' && <Recycling />}
        </div>
      </Section>

      {/* Add Custom Item Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Add Custom Inventory Item"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Item Description *"
            value={editingItem?.description || ''}
            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
            placeholder="Enter item name/description"
            required
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="In Use"
              type="number"
              min="0"
              value={editingItem?.inUse || 0}
              onChange={(e) => setEditingItem({ ...editingItem, inUse: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Spares (Floor)"
              type="number"
              min="0"
              value={editingItem?.spares?.onFloor || 0}
              onChange={(e) => setEditingItem({ ...editingItem, spares: { ...editingItem.spares, onFloor: parseInt(e.target.value) || 0 } })}
            />
            <Input
              label="Spares (Storage)"
              type="number"
              min="0"
              value={editingItem?.spares?.inStorage || 0}
              onChange={(e) => setEditingItem({ ...editingItem, spares: { ...editingItem.spares, inStorage: parseInt(e.target.value) || 0 } })}
            />
            <Input
              label="Broken"
              type="number"
              min="0"
              value={editingItem?.broken || 0}
              onChange={(e) => setEditingItem({ ...editingItem, broken: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setEditingItem(null)}>
            Cancel
          </Button>
          <Button onClick={saveCustomItem}>
            Add Item
          </Button>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Inventory Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.inventory || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Total Items: {totals.total}</div>
              <div>Items in Use: {totals.inUse}</div>
              <div>Spare Items: {totals.spare}</div>
              <div>Broken Items: {totals.broken}</div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmailReport}>
              <Mail size={16} />
              Send Email
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => deleteItem(showDeleteDialog?.index)}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${showDeleteDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete Item"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Inventory;