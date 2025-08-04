import React, { useState } from 'react';
import { 
  Recycle, Plus, Edit, Trash2, BarChart3, Download, Upload, 
  Calendar, CheckCircle, Clock, ArrowUp, ArrowDown, Home,
  Monitor, HardDrive, Printer, Phone, Battery, Package2, Mail
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

const Recycling = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState('broughtBack');
  const [editingItem, setEditingItem] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Initialize recycling data structure from initialData
  const recyclingData = reportData.recycling || {
    broughtBack: [ 
      { item: '17" Monitors', quantity: 0, notes: '', status: 'completed' }, 
      { item: '24" Monitors', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Hard drives', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Computers', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Network devices', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Printer', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'UPS batteries', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Other', quantity: 0, notes: '', status: 'completed' } 
    ],
    pickupRequired: [ 
      { item: '17" Monitors', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
      { item: '24" Monitors', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
      { item: 'Hard drives', quantity: 0, notes: '', status: 'pending', priority: 'high' }, 
      { item: 'Computers', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
      { item: 'Network devices', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
      { item: 'Printer', quantity: 0, notes: '', status: 'pending', priority: 'low' }, 
      { item: 'UPS batteries', quantity: 0, notes: '', status: 'pending', priority: 'high' }, 
      { item: 'Other', quantity: 0, notes: '', status: 'pending', priority: 'normal' } 
    ],
    sentToHq: [ 
      { item: 'Headsets', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Direct Connects', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Webcams', quantity: 0, notes: '', status: 'completed' }, 
      { item: 'Phones', quantity: 0, notes: '', status: 'completed' } 
    ],
    scheduled: 'No', 
    scheduleDate: '',
    scheduledBy: '',
    pickupContact: '',
    lastUpdated: new Date().toISOString().split('T')[0],
    generalNotes: ''
  };

  const updateRecyclingData = (field, value) => {
    const updatedRecycling = { ...recyclingData, [field]: value, lastUpdated: new Date().toISOString().split('T')[0] };
    updateReportData('recycling', updatedRecycling);
  };

  const tabs = [
    { 
      id: 'broughtBack', 
      label: 'Brought Back', 
      icon: <ArrowDown size={18} />,
      description: 'Items brought back to headquarters'
    },
    { 
      id: 'pickupRequired', 
      label: 'Pickup Required', 
      icon: <Clock size={18} />,
      description: 'Items awaiting pickup/disposal'
    },
    { 
      id: 'sentToHq', 
      label: 'Sent to HQ', 
      icon: <ArrowUp size={18} />,
      description: 'Items sent to headquarters'
    },
    { 
      id: 'schedule', 
      label: 'Schedule', 
      icon: <Calendar size={18} />,
      description: 'Pickup scheduling and tracking'
    }
  ];

  const getItemIcon = (itemName) => {
    const iconMap = {
      'Monitors': <Monitor size={16} />,
      '17" Monitors': <Monitor size={16} />,
      '24" Monitors': <Monitor size={16} />,
      'Hard drives': <HardDrive size={16} />,
      'Computers': <Monitor size={16} />,
      'Network devices': <Package2 size={16} />,
      'Printer': <Printer size={16} />,
      'UPS batteries': <Battery size={16} />,
      'Headsets': <Phone size={16} />,
      'Direct Connects': <Phone size={16} />,
      'Webcams': <Monitor size={16} />,
      'Phones': <Phone size={16} />,
      'default': <Package2 size={16} />
    };
    return iconMap[itemName] || iconMap.default;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'scheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleItemChange = (category, index, field, value) => {
    const newItems = [...recyclingData[category]];
    if (field === 'quantity') {
      newItems[index][field] = parseInt(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    updateRecyclingData(category, newItems);
  };

  const addCustomItem = (category) => {
    setEditingItem({
      category,
      item: '',
      quantity: 0,
      notes: '',
      status: category === 'pickupRequired' ? 'pending' : 'completed',
      priority: 'normal',
      isNew: true
    });
  };

  const saveCustomItem = () => {
    if (!editingItem.item.trim()) {
      addNotification({
        type: 'error',
        message: 'Item name is required',
        duration: 3000
      });
      return;
    }

    const newItems = [...recyclingData[editingItem.category], {
      item: editingItem.item,
      quantity: editingItem.quantity,
      notes: editingItem.notes,
      status: editingItem.status,
      priority: editingItem.priority
    }];
    
    updateRecyclingData(editingItem.category, newItems);
    setEditingItem(null);
    
    addNotification({
      type: 'success',
      message: 'Custom item added successfully',
      duration: 3000
    });
  };

  const deleteItem = (category, index) => {
    const newItems = recyclingData[category].filter((_, i) => i !== index);
    updateRecyclingData(category, newItems);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Item removed successfully',
      duration: 3000
    });
  };

  const handleScheduleUpdate = () => {
    updateRecyclingData('scheduled', 'Yes');
    updateRecyclingData('scheduleDate', recyclingData.scheduleDate);
    updateRecyclingData('scheduledBy', recyclingData.scheduledBy);
    updateRecyclingData('pickupContact', recyclingData.pickupContact);
    setShowScheduleModal(false);
    
    addNotification({
      type: 'success',
      message: 'Pickup schedule updated successfully',
      duration: 3000
    });
  };

  // Calculate totals and progress
  const calculateTotals = () => {
    const categories = ['broughtBack', 'pickupRequired', 'sentToHq'];
    return categories.reduce((totals, category) => {
      const categoryTotal = recyclingData[category].reduce((sum, item) => sum + item.quantity, 0);
      return {
        ...totals,
        [category]: categoryTotal,
        total: totals.total + categoryTotal
      };
    }, { total: 0, broughtBack: 0, pickupRequired: 0, sentToHq: 0 });
  };

  const calculateProgress = () => {
    const totalItems = Object.values(recyclingData).reduce((total, items) => {
      return total + (Array.isArray(items) ? items.length : 0);
    }, 0);
    
    const completedItems = Object.values(recyclingData).reduce((total, items) => {
      if (!Array.isArray(items)) return total;
      return total + items.filter(item => item.quantity > 0 || item.status === 'completed').length;
    }, 0);
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // CSV Export functionality
  const exportToCSV = () => {
    const headers = ['Category', 'Item', 'Quantity', 'Status', 'Priority', 'Notes'];
    const rows = [];
    
    Object.entries(recyclingData).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          rows.push([
            `"${category}"`,
            `"${item.item}"`,
            item.quantity,
            `"${item.status}"`,
            `"${item.priority || 'normal'}"`,
            `"${item.notes || ''}"`
          ].join(','));
        });
      }
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `recycling_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addNotification({
        type: 'success',
        message: 'Recycling data exported successfully',
        duration: 3000
      });
    }
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Recycling Report - ${office} - ${date}`;
    
    let body = `E-Waste & Recycling Report\\n`;
    body += `Office: ${office}\\n`;
    body += `Date: ${date}\\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\\n\\n`;
    
    body += `SUMMARY:\\n`;
    body += `Items Brought Back: ${totals.broughtBack}\\n`;
    body += `Items Requiring Pickup: ${totals.pickupRequired}\\n`;
    body += `Items Sent to HQ: ${totals.sentToHq}\\n`;
    body += `Total Items Processed: ${totals.total}\\n\\n`;
    
    // High priority items
    const highPriorityItems = recyclingData.pickupRequired.filter(item => item.priority === 'high' && item.quantity > 0);
    if (highPriorityItems.length > 0) {
      body += `HIGH PRIORITY PICKUP REQUIRED:\\n`;
      highPriorityItems.forEach(item => {
        body += `• ${item.item}: ${item.quantity} items`;
        if (item.notes) body += ` - ${item.notes}`;
        body += `\\n`;
      });
      body += `\\n`;
    }
    
    // Pickup scheduling info
    if (recyclingData.scheduled === 'Yes') {
      body += `PICKUP SCHEDULING:\\n`;
      body += `Status: Scheduled\\n`;
      if (recyclingData.scheduleDate) body += `Date: ${new Date(recyclingData.scheduleDate).toLocaleDateString()}\\n`;
      if (recyclingData.scheduledBy) body += `Scheduled By: ${recyclingData.scheduledBy}\\n`;
      if (recyclingData.pickupContact) body += `Contact: ${recyclingData.pickupContact}\\n`;
      body += `\\n`;
    }
    
    // Items brought back
    const broughtBackItems = recyclingData.broughtBack.filter(item => item.quantity > 0);
    if (broughtBackItems.length > 0) {
      body += `ITEMS BROUGHT BACK TO HQ:\\n`;
      broughtBackItems.forEach(item => {
        body += `• ${item.item}: ${item.quantity} items`;
        if (item.notes) body += ` - ${item.notes}`;
        body += `\\n`;
      });
      body += `\\n`;
    }
    
    // Items sent to HQ
    const sentToHqItems = recyclingData.sentToHq.filter(item => item.quantity > 0);
    if (sentToHqItems.length > 0) {
      body += `ITEMS SENT TO HQ:\\n`;
      sentToHqItems.forEach(item => {
        body += `• ${item.item}: ${item.quantity} items`;
        if (item.notes) body += ` - ${item.notes}`;
        body += `\\n`;
      });
      body += `\\n`;
    }
    
    if (recyclingData.generalNotes) {
      body += `GENERAL NOTES:\\n${recyclingData.generalNotes}\\n`;
    }
    
    const recipients = EMAIL_RECIPIENTS.recycling || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with recycling report',
      duration: 3000
    });
  };

  const totals = calculateTotals();
  const progress = calculateProgress();

  const renderItemTable = (category, items) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {tabs.find(t => t.id === category)?.label} ({items.length})
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => addCustomItem(category)} size="sm">
            <Plus size={16} />
            Add Item
          </Button>
          {category === 'pickupRequired' && (
            <Button onClick={() => setShowScheduleModal(true)} variant="outline" size="sm">
              <Calendar size={16} />
              Schedule Pickup
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-600 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Item
              </th>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Quantity
              </th>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Status
              </th>
              {category === 'pickupRequired' && (
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                  Priority
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Notes
              </th>
              <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {items.map((item, index) => (
              <tr key={index} className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    {getItemIcon(item.item)}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.item}</span>
                  </div>
                </td>
                <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-600">
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(category, index, 'quantity', e.target.value)}
                    className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </td>
                <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-600">
                  <select
                    value={item.status}
                    onChange={(e) => handleItemChange(category, index, 'status', e.target.value)}
                    className="w-full text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                {category === 'pickupRequired' && (
                  <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-600">
                    <select
                      value={item.priority}
                      onChange={(e) => handleItemChange(category, index, 'priority', e.target.value)}
                      className="w-full text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </td>
                )}
                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleItemChange(category, index, 'notes', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="Add notes..."
                  />
                </td>
                <td className="px-3 py-3 text-center">
                  {index >= (category === 'broughtBack' ? 8 : category === 'pickupRequired' ? 8 : 4) && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setShowDeleteDialog({ category, index, name: item.item })}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Pickup Schedule Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pickup Scheduled
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduled"
                  value="Yes"
                  checked={recyclingData.scheduled === 'Yes'}
                  onChange={(e) => updateRecyclingData('scheduled', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-gray-100">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduled"
                  value="No"
                  checked={recyclingData.scheduled === 'No'}
                  onChange={(e) => updateRecyclingData('scheduled', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-gray-100">No</span>
              </label>
            </div>
          </div>

          {recyclingData.scheduled === 'Yes' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={recyclingData.scheduleDate}
                  onChange={(e) => updateRecyclingData('scheduleDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scheduled By
                </label>
                <input
                  type="text"
                  value={recyclingData.scheduledBy}
                  onChange={(e) => updateRecyclingData('scheduledBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  placeholder="Name of person who scheduled pickup"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pickup Contact
                </label>
                <input
                  type="text"
                  value={recyclingData.pickupContact}
                  onChange={(e) => updateRecyclingData('pickupContact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  placeholder="Recycling company contact info"
                />
              </div>
            </>
          )}
        </div>

        {recyclingData.scheduled === 'Yes' && (
          <Alert variant="info" className="mt-6">
            <strong>Pickup Status:</strong> {recyclingData.scheduleDate ? `Scheduled for ${new Date(recyclingData.scheduleDate).toLocaleDateString()}` : 'Date pending'}
            {recyclingData.scheduledBy && <div><strong>Scheduled by:</strong> {recyclingData.scheduledBy}</div>}
            {recyclingData.pickupContact && <div><strong>Contact:</strong> {recyclingData.pickupContact}</div>}
          </Alert>
        )}
      </div>

      {/* High Priority Items Alert */}
      {recyclingData.pickupRequired.some(item => item.priority === 'high' && item.quantity > 0) && (
        <Alert variant="warning">
          <strong>High Priority Items Require Pickup:</strong>
          <ul className="mt-2 list-disc list-inside">
            {recyclingData.pickupRequired
              .filter(item => item.priority === 'high' && item.quantity > 0)
              .map((item, index) => (
                <li key={index}>{item.item}: {item.quantity} items</li>
              ))}
          </ul>
        </Alert>
      )}

      {/* General Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          General Notes
        </label>
        <textarea
          value={recyclingData.generalNotes}
          onChange={(e) => updateRecyclingData('generalNotes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
          rows={4}
          placeholder="Add any additional notes about recycling activities..."
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Recycling Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Recycling Documentation Progress"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.broughtBack}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Brought Back</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totals.pickupRequired}</div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Pickup Required</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.sentToHq}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Sent to HQ</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totals.total}</div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Total Items</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {recyclingData.lastUpdated}
          </div>
        </div>
      </Section>

      <Section 
        title="E-Waste & Recycling Management" 
        icon={<Recycle className="text-green-600" />}
        helpText="Track equipment disposal and recycling processes. Manage pickup schedules and monitor recycling activities."
      >
        <div className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Recycling Management
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download size={16} />
                Export CSV
              </Button>
              <Button 
                onClick={() => setShowEmailModal(true)} 
                variant="outline" 
                size="sm"
                disabled={totals.total === 0}
              >
                <Mail size={16} />
                Email Report
              </Button>
              {recyclingData.scheduled === 'No' && totals.pickupRequired > 0 && (
                <Button onClick={() => setShowScheduleModal(true)} size="sm">
                  <Calendar size={16} />
                  Schedule Pickup
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {Array.isArray(recyclingData[tab.id]) && (
                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                      {recyclingData[tab.id].filter(item => item.quantity > 0).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'broughtBack' && renderItemTable('broughtBack', recyclingData.broughtBack)}
          {activeTab === 'pickupRequired' && renderItemTable('pickupRequired', recyclingData.pickupRequired)}
          {activeTab === 'sentToHq' && renderItemTable('sentToHq', recyclingData.sentToHq)}
          {activeTab === 'schedule' && renderScheduleTab()}
        </div>
      </Section>

      {/* Add Custom Item Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Add Custom Recycling Item"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Item Name *"
            value={editingItem?.item || ''}
            onChange={(e) => setEditingItem({ ...editingItem, item: e.target.value })}
            placeholder="Enter item name"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="0"
              value={editingItem?.quantity || 0}
              onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 0 })}
            />
            
            <Select
              label="Status"
              value={editingItem?.status || 'pending'}
              onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </div>

          {editingItem?.category === 'pickupRequired' && (
            <Select
              label="Priority"
              value={editingItem?.priority || 'normal'}
              onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          )}
          
          <Input
            label="Notes"
            multiline
            value={editingItem?.notes || ''}
            onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
            placeholder="Additional notes about this item..."
            rows={3}
          />
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

      {/* Schedule Pickup Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Recycling Pickup"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            Items requiring pickup: {recyclingData.pickupRequired.filter(item => item.quantity > 0).length}
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Pickup Date"
              type="date"
              value={recyclingData.scheduleDate}
              onChange={(e) => updateRecyclingData('scheduleDate', e.target.value)}
            />
            
            <Input
              label="Scheduled By"
              value={recyclingData.scheduledBy}
              onChange={(e) => updateRecyclingData('scheduledBy', e.target.value)}
              placeholder="Your name"
            />
          </div>
          
          <Input
            label="Pickup Contact Information"
            value={recyclingData.pickupContact}
            onChange={(e) => updateRecyclingData('pickupContact', e.target.value)}
            placeholder="Recycling company contact details"
          />
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleUpdate}>
              <Calendar size={16} />
              Schedule Pickup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Recycling Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.recycling || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Items Brought Back: {totals.broughtBack}</div>
              <div>Items Requiring Pickup: {totals.pickupRequired}</div>
              <div>Items Sent to HQ: {totals.sentToHq}</div>
              <div>Total Items Processed: {totals.total}</div>
              <div>Pickup Status: {recyclingData.scheduled === 'Yes' ? 'Scheduled' : 'Not Scheduled'}</div>
            </div>
          </div>
          
          {recyclingData.pickupRequired.some(item => item.priority === 'high' && item.quantity > 0) && (
            <Alert variant="warning">
              <strong>High Priority Items:</strong>
              <div className="mt-1 text-sm">
                {recyclingData.pickupRequired
                  .filter(item => item.priority === 'high' && item.quantity > 0)
                  .map(item => `${item.item}: ${item.quantity}`)
                  .join(', ')}
              </div>
            </Alert>
          )}
          
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
        onConfirm={() => deleteItem(showDeleteDialog?.category, showDeleteDialog?.index)}
        title="Delete Recycling Item"
        message={`Are you sure you want to delete "${showDeleteDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete Item"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Recycling;