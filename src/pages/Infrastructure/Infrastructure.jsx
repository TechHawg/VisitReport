import React, { useState, useRef, useCallback } from 'react';
import { Monitor, Plus, Edit, Trash2, Download, Upload, Clipboard, BarChart3, Package, Server } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useApp } from '../../context/AppContext';

const Infrastructure = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [editingItem, setEditingItem] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [importData, setImportData] = useState('');
  const [pasteData, setPasteData] = useState('');
  const fileInputRef = useRef(null);

  // Initialize SCCM PC data structure
  const sccmData = reportData.sccmPCs || {
    computers: [],
    lastUpdated: new Date().toISOString().split('T')[0]
  };

  const updateSccmData = (computers) => {
    const updatedData = { 
      computers, 
      lastUpdated: new Date().toISOString().split('T')[0] 
    };
    updateReportData('sccmPCs', updatedData);
  };

  const pcFields = ['name', 'model', 'serialNumber', 'os', 'processor', 'memory', 'storage', 'lastLoginUsername', 'sccmStatus', 'lastSeen', 'status'];

  const getEmptyPC = () => ({
    id: Date.now(),
    name: '',
    model: '',
    serialNumber: '',
    os: '',
    processor: '',
    memory: '',
    storage: '',
    lastLoginUsername: '',
    sccmStatus: 'active',
    lastSeen: '',
    status: 'active',
    notes: '',
    lastUpdated: new Date().toISOString().split('T')[0]
  });

  const handleAddItem = () => {
    setEditingItem(getEmptyPC());
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveItem = () => {
    if (!editingItem.name.trim()) {
      addNotification({
        type: 'error',
        message: 'PC name is required',
        duration: 3000
      });
      return;
    }

    const currentItems = sccmData.computers || [];
    let updatedItems;

    if (editingItem.id && currentItems.find(item => item.id === editingItem.id)) {
      updatedItems = currentItems.map(item => 
        item.id === editingItem.id ? editingItem : item
      );
    } else {
      updatedItems = [...currentItems, { ...editingItem, id: Date.now() }];
    }

    updateSccmData(updatedItems);
    setEditingItem(null);
    
    addNotification({
      type: 'success',
      message: 'SCCM PC data saved successfully',
      duration: 3000
    });
  };

  const handleDeleteItem = (id) => {
    const currentItems = sccmData.computers || [];
    const updatedItems = currentItems.filter(item => item.id !== id);
    updateSccmData(updatedItems);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'PC deleted successfully',
      duration: 3000
    });
  };

  // CSV Export functionality
  const exportToCSV = () => {
    const currentItems = sccmData.computers || [];
    
    if (currentItems.length === 0) {
      addNotification({
        type: 'warning',
        message: 'No PC data to export',
        duration: 3000
      });
      return;
    }

    const headers = pcFields.join(',');
    const rows = currentItems.map(item => 
      pcFields.map(field => `"${item[field] || ''}"`).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sccm_pcs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addNotification({
        type: 'success',
        message: 'SCCM PC data exported successfully',
        duration: 3000
      });
    }
  };

  // CSV Import functionality
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  const processImportData = () => {
    try {
      const lines = importData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('Invalid CSV format');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const newItems = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const item = { 
          id: Date.now() + index, 
          lastUpdated: new Date().toISOString().split('T')[0],
          status: 'active',
          sccmStatus: 'active'
        };
        
        headers.forEach((header, headerIndex) => {
          if (pcFields.includes(header)) {
            item[header] = values[headerIndex] || '';
          }
        });
        
        return item;
      }).filter(item => item.name); // Only include items with names

      const currentItems = sccmData.computers || [];
      const updatedItems = [...currentItems, ...newItems];
      
      updateSccmData(updatedItems);
      setShowImportModal(false);
      setImportData('');
      
      addNotification({
        type: 'success',
        message: `Imported ${newItems.length} PCs successfully`,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Error importing CSV data. Please check the format.',
        duration: 5000
      });
    }
  };

  // Debounce utility to prevent excessive processing
  const debounce = useCallback((func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  // Optimized paste processing for bulk data entry from SCCM
  const processPasteData = useCallback(() => {
    try {
      // Reduced logging in development
      if (import.meta.env.DEV) {
        console.log('Processing SCCM paste data, lines:', pasteData.trim().split('\n').length);
      }
      
      const lines = pasteData.trim().split('\n');
      if (lines.length === 0) {
        throw new Error('No data to process');
      }

      let newItems = [];
      const firstLine = lines[0].toLowerCase();
      const tokens = firstLine.split(/\s+/);
      
      // Optimized header detection
      const hasHeaders = tokens.some(token => 
        pcFields.some(field => token === field.toLowerCase())
      );
      
      const firstToken = tokens[0] || '';
      const looksLikeComputerName = /^[a-z0-9-]+$/i.test(firstToken) && firstToken.length > 3;
      const finalHasHeaders = hasHeaders && !looksLikeComputerName;

      if (finalHasHeaders) {
        // Process as CSV with headers
        const headers = lines[0].split(/[,\t]/).map(h => h.trim().replace(/"/g, ''));
        newItems = lines.slice(1).map((line, index) => {
          const values = line.split(/[,\t]/).map(v => v.trim().replace(/"/g, ''));
          const item = { 
            id: Date.now() + index, 
            lastUpdated: new Date().toISOString().split('T')[0],
            status: 'active',
            sccmStatus: 'active'
          };
          
          headers.forEach((header, headerIndex) => {
            const cleanHeader = header.toLowerCase().replace(/\s+/g, '');
            const matchingField = pcFields.find(field => 
              field.toLowerCase().replace(/\s+/g, '') === cleanHeader ||
              field.toLowerCase().includes(cleanHeader) ||
              cleanHeader.includes(field.toLowerCase())
            );
            
            if (matchingField) {
              item[matchingField] = values[headerIndex] || '';
            }
          });
          
          return item;
        }).filter(item => item.name);
      } else {
        // Process as simple list or space/tab-separated values
        newItems = lines.map((line, index) => {
          
          // Split by multiple spaces (2 or more) or tabs to handle SCCM format
          // Also try splitting by 4+ spaces as SCCM often uses wide spacing
          let values = line.split(/\s{4,}|\t/).map(v => v.trim());
          
          // If we don't get enough values, try different split patterns
          if (values.length < 4) {
            values = line.split(/\s{3,}|\t/).map(v => v.trim());
          }
          if (values.length < 4) {
            values = line.split(/\s{2,}|\t/).map(v => v.trim());
          }
          
          
          const item = { 
            id: Date.now() + index, 
            lastUpdated: new Date().toISOString().split('T')[0],
            status: 'active',
            sccmStatus: 'active'
          };
          
          // Map values to fields based on SCCM data format:
          // PC Name, RAM, Disk Drive, Computer Model, Last Login User, Last Logon Time, OS, OS Version
          if (values.length >= 1) {
            item.name = values[0].trim();                                    // PC Name
          }
          if (values.length >= 2) {
            // RAM (in KB, convert to GB for readability)
            const ramKB = parseInt(values[1]);
            if (!isNaN(ramKB)) {
              const ramGB = Math.round(ramKB / 1024 / 1024);
              item.memory = `${ramGB}GB`;
            } else {
              item.memory = values[1];
            }
          }
          if (values.length >= 3) item.storage = values[2].trim();         // Disk Drive
          if (values.length >= 4) item.model = values[3].trim();          // Computer Model
          if (values.length >= 5) {
            // Last Login User
            const loginUser = values[4].trim();
            if (loginUser && loginUser !== '') {
              item.lastLoginUsername = loginUser;
              // Set SCCM status to active if there's a recent login user
              item.sccmStatus = 'active';
            }
          }
          if (values.length >= 6) {
            // Last Logon Time
            const logonTime = values[5].trim();
            if (logonTime && logonTime !== '') {
              item.lastSeen = logonTime;
              
              // Try to parse date and determine if recent (within 30 days = active)
              try {
                const logonDate = new Date(logonTime);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                if (logonDate >= thirtyDaysAgo) {
                  item.sccmStatus = 'active';
                } else {
                  item.sccmStatus = 'offline';
                }
              } catch (e) {
                // If date parsing fails, keep as active if we have login info
                item.sccmStatus = 'active';
              }
            }
          }
          if (values.length >= 7) item.os = values[6].trim();             // OS
          if (values.length >= 8) {
            // OS Version - append to OS field
            const osVersion = values[7].trim();
            if (osVersion && osVersion !== '') {
              item.os = item.os ? `${item.os} (${osVersion})` : osVersion;
            }
          }
          
          return item;
        }).filter(item => item.name && item.name.trim() !== '');
      }

      
      if (newItems.length === 0) {
        throw new Error('No valid PC data found in pasted content');
      }

      const currentItems = sccmData.computers || [];
      const updatedItems = [...currentItems, ...newItems];
      
      updateSccmData(updatedItems);
      setShowPasteModal(false);
      setPasteData('');
      
      addNotification({
        type: 'success',
        message: `Added ${newItems.length} PCs from pasted SCCM data`,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Error processing pasted data. Please check the format.',
        duration: 5000
      });
    }
  }, [pasteData, pcFields, sccmData, updateReportData, setShowPasteModal, setPasteData, addNotification]);

  const calculateProgress = () => {
    const totalItems = (sccmData.computers || []).length;
    const completedItems = (sccmData.computers || []).filter(item => 
      item.name && item.model && item.os && item.sccmStatus
    ).length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const currentItems = sccmData.computers || [];
  const progress = calculateProgress();

  // Get summary statistics
  const stats = {
    total: currentItems.length,
    active: currentItems.filter(item => item.sccmStatus === 'active').length,
    offline: currentItems.filter(item => item.sccmStatus === 'offline').length,
    unknown: currentItems.filter(item => item.sccmStatus === 'unknown').length,
    windows: currentItems.filter(item => item.os?.toLowerCase().includes('windows')).length
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="SCCM PC Inventory Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="PC Documentation Completion"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Monitor className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total PCs</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-6 h-6 mx-auto mb-2 bg-green-500 rounded-full"></div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.active}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="w-6 h-6 mx-auto mb-2 bg-red-500 rounded-full"></div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.offline}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Offline</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-6 h-6 mx-auto mb-2 bg-gray-500 rounded-full"></div>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.unknown}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unknown</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-6 h-6 mx-auto mb-2 bg-blue-500 rounded-full"></div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.windows}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Windows</p>
            </div>
          </div>
        </div>
      </Section>

      <Section 
        title="SCCM PC Management" 
        icon={<Server className="text-green-500" />}
        helpText="Manage SCCM-tracked computers and workstations. Import data directly from SCCM reports or paste from spreadsheets."
      >
        <div className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Managed PCs ({currentItems.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddItem} size="sm">
                <Plus size={16} />
                Add PC
              </Button>
              <Button 
                onClick={exportToCSV} 
                variant="outline" 
                size="sm"
                disabled={currentItems.length === 0}
              >
                <Download size={16} />
                Export CSV
              </Button>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                size="sm"
              >
                <Upload size={16} />
                Import CSV
              </Button>
              <Button 
                onClick={() => setShowPasteModal(true)} 
                variant="outline" 
                size="sm"
              >
                <Clipboard size={16} />
                Paste SCCM Data
              </Button>
            </div>
          </div>

          {/* Alert for paste functionality */}
          <Alert variant="info">
            <strong>Quick Import:</strong> Copy PC data directly from SCCM reports, Excel, or Google Sheets and use "Paste SCCM Data" for bulk entry.
          </Alert>

          {/* Items List */}
          {currentItems.length > 0 ? (
            <div className="space-y-4">
              {currentItems.map(item => (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.name}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.sccmStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          item.sccmStatus === 'offline' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          item.sccmStatus === 'unknown' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {item.sccmStatus}
                        </span>
                        {item.status && item.status !== 'active' && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            item.status === 'retired' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.model || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">OS:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.os || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Memory:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.memory || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Last Login Username:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.lastLoginUsername || 'Not specified'}</span>
                        </div>
                      </div>
                      
                      {(item.processor || item.storage) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Processor:</span>
                            <span className="ml-1 text-gray-900 dark:text-gray-100">{item.processor || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Storage:</span>
                            <span className="ml-1 text-gray-900 dark:text-gray-100">{item.storage || 'Not specified'}</span>
                          </div>
                          {item.lastSeen && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Last Seen:</span>
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{item.lastSeen}</span>
                            </div>
                          )}
                          {item.serialNumber && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Serial:</span>
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{item.serialNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {item.notes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.notes}</p>
                      )}
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog(item)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Server size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No SCCM PCs added yet</p>
              <p className="text-sm mb-4">Start documenting your managed computers</p>
              <div className="flex justify-center space-x-3">
                <Button onClick={handleAddItem}>
                  <Plus size={16} />
                  Add First PC
                </Button>
                <Button onClick={() => setShowPasteModal(true)} variant="outline">
                  <Clipboard size={16} />
                  Paste SCCM Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`${editingItem?.id && currentItems.find(item => item.id === editingItem.id) ? 'Edit' : 'Add'} SCCM PC`}
        size="xl"
      >
        {editingItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Computer Name *"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="PC-001, DESKTOP-ABC123"
                required
              />
              <Input
                label="Model"
                value={editingItem.model}
                onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                placeholder="Dell OptiPlex 7090, HP EliteDesk"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Serial Number"
                value={editingItem.serialNumber}
                onChange={(e) => setEditingItem({ ...editingItem, serialNumber: e.target.value })}
                placeholder="Service tag or serial number"
              />
              <Input
                label="Operating System"
                value={editingItem.os}
                onChange={(e) => setEditingItem({ ...editingItem, os: e.target.value })}
                placeholder="Windows 11 Pro, Windows 10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Processor"
                value={editingItem.processor}
                onChange={(e) => setEditingItem({ ...editingItem, processor: e.target.value })}
                placeholder="Intel i7-11700, AMD Ryzen 5"
              />
              <Input
                label="Memory (RAM)"
                value={editingItem.memory}
                onChange={(e) => setEditingItem({ ...editingItem, memory: e.target.value })}
                placeholder="16GB, 32GB"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Storage"
                value={editingItem.storage}
                onChange={(e) => setEditingItem({ ...editingItem, storage: e.target.value })}
                placeholder="512GB SSD, 1TB HDD"
              />
              <Input
                label="Last Login Username"
                value={editingItem.lastLoginUsername}
                onChange={(e) => setEditingItem({ ...editingItem, lastLoginUsername: e.target.value })}
                placeholder="e.g., John.Doe, Administrator"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="SCCM Status"
                value={editingItem.sccmStatus}
                onChange={(e) => setEditingItem({ ...editingItem, sccmStatus: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
                <option value="unknown">Unknown</option>
                <option value="pending">Pending</option>
              </Select>
              <Select
                label="Hardware Status"
                value={editingItem.status}
                onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </Select>
              <Input
                label="Last Seen"
                type="date"
                value={editingItem.lastSeen}
                onChange={(e) => setEditingItem({ ...editingItem, lastSeen: e.target.value })}
              />
            </div>

            <Textarea
              label="Notes"
              value={editingItem.notes}
              onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
              placeholder="Additional notes about this PC..."
              rows={3}
            />
          </div>
        )}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setEditingItem(null)}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveItem}>
            Save PC
          </Button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import SCCM PC Data"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>CSV Import Format:</strong>
            <br />Expected columns: {pcFields.join(', ')}
          </Alert>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              CSV Data Preview
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-mono text-sm"
              placeholder="Paste CSV data here or select a file..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={processImportData}>
              Import Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* Paste Data Modal */}
      <Modal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        title="Paste SCCM PC Data"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>SCCM Data Format Expected:</strong>
            <br />
            <strong>Columns:</strong> PC Name, RAM (KB), Disk Drive, Computer Model, Last Login User, Last Logon Time, OS, OS Version
            <br />
            <br />
            <strong>Supported Formats:</strong>
            <br />
            • <strong>SCCM Report:</strong> Copy directly from SCCM console reports with above columns
            <br />
            • <strong>Excel/Sheets:</strong> Copy and paste from spreadsheet applications
            <br />
            • <strong>Tab/Space Separated:</strong> Values separated by tabs or multiple spaces
            <br />
            • <strong>Auto-Processing:</strong> RAM converted from KB to GB, status determined from last logon time
          </Alert>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Paste SCCM Data Here
            </label>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-mono text-sm"
              placeholder={`Paste your SCCM PC data here...

Expected format (tab or space separated):
PC Name    RAM(KB)     Disk Drive                    Computer Model    Last Login User    Last Logon Time         OS                           OS Version

Example:
AKRON-D1NCSNK3    16491588    PM991a NVMe Samsung 256GB    OptiPlex 5090    Steffany.Papp    8/2/2025 7:06:00 PM    Microsoft Windows 11 Enterprise    10.0.26100
AKRON-D2TGT1N3    16484120    CL4-3D256-Q11 NVMe SSSTC 256GB    OptiPlex 3090    Krystyn.Francis    8/1/2025 3:46:00 PM    Microsoft Windows 11 Enterprise    10.0.26100

• Copy directly from SCCM reports or Excel/Google Sheets
• RAM will be automatically converted from KB to GB
• SCCM status will be determined from last logon time (30 days)`}
            />
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Tips:</strong>
              <br />• Copy data directly from SCCM console reports
              <br />• Export from SCCM to Excel first, then copy and paste here
              <br />• Use Tab or Comma to separate values
              <br />• First line can be headers or data
              <br />• System will auto-detect the format
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPasteModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={debounce(processPasteData, 300)}
              disabled={!pasteData.trim()}
            >
              <Clipboard size={16} />
              Process SCCM Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => handleDeleteItem(showDeleteDialog?.id)}
        title="Delete PC"
        message={`Are you sure you want to delete "${showDeleteDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete PC"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Infrastructure;