import React, { useState, useRef } from 'react';
import { 
  Package, Plus, Edit, Trash2, BarChart3, Download, Upload, 
  FileSpreadsheet, Mail, Calculator, Monitor, Phone, Users,
  Headphones, HardDrive, Printer, Building2, UserCheck, Recycle
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

const Inventory = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const [editingItem, setEditingItem] = useState(null);
  const [editingStation, setEditingStation] = useState(null);
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
    specialStations: {
      threeMonitorSetups: 0,
      prospectingStations: 0,
      visitorStations: 0,
      applicantStations: 0,
      eolComputers: 0
    },
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
      id: 'stations', 
      label: 'Special Stations', 
      icon: <Building2 size={18} />,
      description: 'Monitor specialized workstation setups'
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

  const handleStationChange = (field, value) => {
    const newStations = { ...inventoryData.specialStations, [field]: parseInt(value) || 0 };
    updateInventoryData('specialStations', newStations);
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
    return inventoryData.items.reduce((totals, item) => {
      const itemTotal = item.inUse + 
        Object.values(item.otherUse).reduce((sum, val) => sum + val, 0) + 
        Object.values(item.spares).reduce((sum, val) => sum + val, 0) + 
        item.broken;
      
      return {
        total: totals.total + itemTotal,
        inUse: totals.inUse + item.inUse,
        spare: totals.spare + Object.values(item.spares).reduce((sum, val) => sum + val, 0),
        broken: totals.broken + item.broken
      };
    }, { total: 0, inUse: 0, spare: 0, broken: 0 });
  };

  const calculateProgress = () => {
    const totalItems = inventoryData.items.length;
    const completedItems = inventoryData.items.filter(item => {
      const itemTotal = item.inUse + 
        Object.values(item.otherUse).reduce((sum, val) => sum + val, 0) + 
        Object.values(item.spares).reduce((sum, val) => sum + val, 0) + 
        item.broken;
      return itemTotal > 0;
    }).length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // CSV Export functionality
  const exportToCSV = () => {
    const headers = [
      'Description', 'In Use', 'Training', 'Conference', 'GSM', 'Prospecting', 
      'Applicant', 'Visitor', 'Other Use', 'Spares On Floor', 'Spares In Storage', 'Broken', 'Total'
    ];
    
    const rows = inventoryData.items.map(item => {
      const total = item.inUse + 
        Object.values(item.otherUse).reduce((sum, val) => sum + val, 0) + 
        Object.values(item.spares).reduce((sum, val) => sum + val, 0) + 
        item.broken;
      
      return [
        `"${item.description}"`,
        item.inUse,
        item.otherUse.training,
        item.otherUse.conf,
        item.otherUse.gsm,
        item.otherUse.prospecting,
        item.otherUse.applicant,
        item.otherUse.visitor,
        item.otherUse.other,
        item.spares.onFloor,
        item.spares.inStorage,
        item.broken,
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
      const itemTotal = item.inUse + 
        Object.values(item.otherUse).reduce((sum, val) => sum + val, 0) + 
        Object.values(item.spares).reduce((sum, val) => sum + val, 0) + 
        item.broken;
      
      if (itemTotal > 0) {
        body += `\n${item.description}:\n`;
        body += `  In Use: ${item.inUse}\n`;
        body += `  Training: ${item.otherUse.training}\n`;
        body += `  Conference: ${item.otherUse.conf}\n`;
        body += `  GSM: ${item.otherUse.gsm}\n`;
        body += `  Prospecting: ${item.otherUse.prospecting}\n`;
        body += `  Applicant: ${item.otherUse.applicant}\n`;
        body += `  Visitor: ${item.otherUse.visitor}\n`;
        body += `  Other: ${item.otherUse.other}\n`;
        body += `  Spares (Floor): ${item.spares.onFloor}\n`;
        body += `  Spares (Storage): ${item.spares.inStorage}\n`;
        body += `  Broken: ${item.broken}\n`;
        body += `  Total: ${itemTotal}\n`;
      }
    });
    
    body += `\nSPECIAL STATIONS:\n`;
    body += `3-Monitor Setups: ${inventoryData.specialStations.threeMonitorSetups}\n`;
    body += `Prospecting Stations: ${inventoryData.specialStations.prospectingStations}\n`;
    body += `Visitor Stations: ${inventoryData.specialStations.visitorStations}\n`;
    body += `Applicant Stations: ${inventoryData.specialStations.applicantStations}\n`;
    body += `EOL Computers: ${inventoryData.specialStations.eolComputers}\n`;
    
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.total}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Total Items</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.inUse}</div>
          <div className="text-sm text-green-600 dark:text-green-400">In Use</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totals.spare}</div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">Spare Items</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.broken}</div>
          <div className="text-sm text-red-600 dark:text-red-400">Broken Items</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Inventory Items ({inventoryData.items.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={addCustomItem} size="sm">
            <Plus size={16} />
            Add Custom Item
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download size={16} />
            Export CSV
          </Button>
          <Button onClick={() => setShowEmailModal(true)} variant="outline" size="sm">
            <Mail size={16} />
            Email Report
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-600 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Item
              </th>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                In Use
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Training
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Conf
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                GSM
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Prospect
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Applicant
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Visitor
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Other
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Floor
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Storage
              </th>
              <th className="px-2 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Broken
              </th>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Total
              </th>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {inventoryData.items.map((item, index) => {
              const itemTotal = item.inUse + 
                Object.values(item.otherUse).reduce((sum, val) => sum + val, 0) + 
                Object.values(item.spares).reduce((sum, val) => sum + val, 0) + 
                item.broken;
              
              return (
                <tr key={index} className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-2">
                      {getItemIcon(item.description)}
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.description}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.inUse}
                      onChange={(e) => handleItemChange(index, 'inUse', null, e.target.value)}
                      className="w-16 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.training}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'training', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.conf}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'conf', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.gsm}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'gsm', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.prospecting}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'prospecting', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.applicant}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'applicant', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.visitor}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'visitor', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.otherUse.other}
                      onChange={(e) => handleItemChange(index, 'otherUse', 'other', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.spares.onFloor}
                      onChange={(e) => handleItemChange(index, 'spares', 'onFloor', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.spares.inStorage}
                      onChange={(e) => handleItemChange(index, 'spares', 'inStorage', e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-2 py-3 border-r border-gray-200 dark:border-gray-600">
                    <input
                      type="number"
                      min="0"
                      value={item.broken}
                      onChange={(e) => handleItemChange(index, 'broken', null, e.target.value)}
                      className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                    {itemTotal}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {index >= 11 && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog({ index, name: item.description })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

  const renderSpecialStations = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Monitor className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">3-Monitor Setups</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Multi-display workstations</p>
            </div>
          </div>
          <input
            type="number"
            min="0"
            value={inventoryData.specialStations.threeMonitorSetups}
            onChange={(e) => handleStationChange('threeMonitorSetups', e.target.value)}
            className="w-full text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Phone className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Prospecting Stations</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dedicated prospecting setups</p>
            </div>
          </div>
          <input
            type="number"
            min="0"
            value={inventoryData.specialStations.prospectingStations}
            onChange={(e) => handleStationChange('prospectingStations', e.target.value)}
            className="w-full text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Visitor Stations</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Guest workstations</p>
            </div>
          </div>
          <input
            type="number"
            min="0"
            value={inventoryData.specialStations.visitorStations}
            onChange={(e) => handleStationChange('visitorStations', e.target.value)}
            className="w-full text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <UserCheck className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Applicant Stations</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Job applicant workstations</p>
            </div>
          </div>
          <input
            type="number"
            min="0"
            value={inventoryData.specialStations.applicantStations}
            onChange={(e) => handleStationChange('applicantStations', e.target.value)}
            className="w-full text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <HardDrive className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">EOL Computers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">End-of-life systems</p>
            </div>
          </div>
          <input
            type="number"
            min="0"
            value={inventoryData.specialStations.eolComputers}
            onChange={(e) => handleStationChange('eolComputers', e.target.value)}
            className="w-full text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
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
          {activeTab === 'stations' && renderSpecialStations()}
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