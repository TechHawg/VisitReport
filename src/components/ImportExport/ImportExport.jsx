import React, { useState, useRef, useCallback } from 'react';
import { 
  Download, Upload, FileSpreadsheet, Copy, Trash2, 
  Database, Server, Package, HardDrive, Monitor, 
  BarChart3, FileText, CheckCircle, AlertCircle,
  RefreshCw, Eye, Settings, Import, FileDown
} from 'lucide-react';
import Section from '../ui/Section';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';
import ProgressBar from '../ui/ProgressBar';
import { useApp } from '../../context/AppContext';
import DataTemplatesModal from './DataTemplatesModal';

const ImportExport = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [activeMode, setActiveMode] = useState('import');
  const [selectedDataType, setSelectedDataType] = useState('complete');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [importFormat, setImportFormat] = useState('json');
  const [exportFormat, setExportFormat] = useState('json');
  const [importData, setImportData] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const dataTypes = [
    {
      id: 'complete',
      label: 'Complete Report Data',
      icon: <Database size={18} />,
      description: 'Full report including all sections and data',
      includes: ['Basic Info', 'Hardware', 'Data Closet', 'Inventory', 'Recycling', 'Issues', 'Recommendations']
    },
    {
      id: 'hardware',
      label: 'Hardware Infrastructure',
      icon: <HardDrive size={18} />,
      description: 'All hardware inventory data',
      includes: ['Computers', 'Monitors', 'Printers', 'Phones', 'Tablets', 'Network Equipment']
    },
    {
      id: 'datacloset',
      label: 'Data Closet & Racks',
      icon: <Server size={18} />,
      description: 'Rack layouts and device placement',
      includes: ['Locations', 'Racks', 'Devices', 'Environmental Data', 'Photos']
    },
    {
      id: 'inventory',
      label: 'General Inventory',
      icon: <Package size={18} />,
      description: 'Inventory counts and special stations',
      includes: ['Item Counts', 'Special Stations', 'Usage Categories']
    },
    {
      id: 'recycling',
      label: 'Recycling Data',
      icon: <RefreshCw size={18} />,
      description: 'Equipment recycling and disposal',
      includes: ['Brought Back', 'Pickup Required', 'Sent to HQ', 'Scheduling']
    }
  ];

  const formats = [
    {
      id: 'json',
      label: 'JSON',
      description: 'Structured data format (recommended)',
      extension: '.json',
      mimeType: 'application/json'
    },
    {
      id: 'csv',
      label: 'CSV',
      description: 'Comma-separated values (spreadsheet compatible)',
      extension: '.csv',
      mimeType: 'text/csv'
    },
    {
      id: 'yaml',
      label: 'YAML',
      description: 'Human-readable data format',
      extension: '.yaml',
      mimeType: 'text/yaml'
    }
  ];

  // Data extraction functions
  const extractDataByType = useCallback((type) => {
    const timestamp = new Date().toISOString();
    const baseInfo = {
      exportTimestamp: timestamp,
      office: reportData.office,
      date: reportData.date,
      rss: reportData.rss
    };

    switch (type) {
      case 'complete':
        return {
          ...baseInfo,
          dataType: 'complete',
          data: {
            ...reportData,
            exportInfo: {
              timestamp,
              version: '1.0',
              source: 'RSS Visit Report System'
            }
          }
        };

      case 'hardware':
        return {
          ...baseInfo,
          dataType: 'hardware',
          data: {
            hardware: reportData.hardware || {},
            officeHardware: reportData.officeHardware || [],
            lastUpdated: reportData.hardware?.lastUpdated || timestamp
          }
        };

      case 'datacloset':
        return {
          ...baseInfo,
          dataType: 'datacloset',
          data: {
            dataCloset: reportData.dataCloset || {},
            locations: reportData.dataCloset?.locations || [],
            environmental: reportData.dataCloset?.environmental || {},
            photos: reportData.dataCloset?.photos || [],
            lastUpdated: reportData.dataCloset?.lastUpdated || timestamp
          }
        };

      case 'inventory':
        return {
          ...baseInfo,
          dataType: 'inventory',
          data: {
            inventory: reportData.inventory || {},
            items: reportData.inventory?.items || [],
            specialStations: reportData.inventory?.specialStations || {},
            lastUpdated: reportData.inventory?.lastUpdated || timestamp
          }
        };

      case 'recycling':
        return {
          ...baseInfo,
          dataType: 'recycling',
          data: {
            recycling: reportData.recycling || {},
            broughtBack: reportData.recycling?.broughtBack || [],
            pickupRequired: reportData.recycling?.pickupRequired || [],
            sentToHq: reportData.recycling?.sentToHq || [],
            lastUpdated: reportData.recycling?.lastUpdated || timestamp
          }
        };

      default:
        return { ...baseInfo, dataType: 'unknown', data: {} };
    }
  }, [reportData]);

  // Format conversion functions
  const convertToFormat = useCallback((data, format) => {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        return convertToCSV(data);

      case 'yaml':
        return convertToYAML(data);

      default:
        return JSON.stringify(data, null, 2);
    }
  }, []);

  const convertToCSV = (data) => {
    if (data.dataType === 'hardware' && data.data.hardware) {
      let csv = 'Category,Name,Model,Serial,Status,Type,OS,Processor,Memory,Storage,Size,Resolution,IP,Extension,Department\n';
      
      Object.entries(data.data.hardware).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            const row = [
              category,
              item.name || '',
              item.model || '',
              item.serialNumber || '',
              item.status || '',
              item.type || '',
              item.os || '',
              item.processor || '',
              item.memory || '',
              item.storage || '',
              item.size || '',
              item.resolution || '',
              item.ipAddress || '',
              item.extension || '',
              item.department || ''
            ].map(field => `"${field}"`).join(',');
            csv += row + '\n';
          });
        }
      });
      return csv;
    }

    if (data.dataType === 'inventory' && data.data.inventory) {
      let csv = 'Description,In Use,Training,Conference,GSM,Prospecting,Applicant,Visitor,Other,Spares Floor,Spares Storage,Broken,Total\n';
      
      (data.data.inventory.items || []).forEach(item => {
        const total = item.inUse + 
          Object.values(item.otherUse || {}).reduce((sum, val) => sum + (val || 0), 0) + 
          Object.values(item.spares || {}).reduce((sum, val) => sum + (val || 0), 0) + 
          (item.broken || 0);
        
        const row = [
          item.description || '',
          item.inUse || 0,
          item.otherUse?.training || 0,
          item.otherUse?.conf || 0,
          item.otherUse?.gsm || 0,
          item.otherUse?.prospecting || 0,
          item.otherUse?.applicant || 0,
          item.otherUse?.visitor || 0,
          item.otherUse?.other || 0,
          item.spares?.onFloor || 0,
          item.spares?.inStorage || 0,
          item.broken || 0,
          total
        ].map(field => `"${field}"`).join(',');
        csv += row + '\n';
      });
      return csv;
    }

    if (data.dataType === 'datacloset' && data.data.dataCloset) {
      let csv = 'Type,Location,Rack,Device Name,Device Type,Model,Serial,Start Unit,Unit Span,Status,Notes\n';
      
      (data.data.locations || []).forEach(location => {
        (location.racks || []).forEach(rack => {
          (rack.devices || []).forEach(device => {
            const row = [
              'device',
              location.name || '',
              rack.name || '',
              device.name || '',
              device.type || '',
              device.model || '',
              device.serialNumber || '',
              device.startUnit || '',
              device.unitSpan || 1,
              device.status || 'active',
              device.notes || ''
            ].map(field => `"${field}"`).join(',');
            csv += row + '\n';
          });
        });
      });
      return csv;
    }

    // Fallback to JSON for complex data
    return JSON.stringify(data, null, 2);
  };

  const convertToYAML = (data) => {
    // Simple YAML conversion (for basic structures)
    const yamlify = (obj, indent = 0) => {
      const spaces = '  '.repeat(indent);
      let yaml = '';
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          yaml += `${spaces}${key}: null\n`;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          yaml += yamlify(value, indent + 1);
        } else if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          value.forEach(item => {
            if (typeof item === 'object') {
              yaml += `${spaces}  -\n`;
              yaml += yamlify(item, indent + 2);
            } else {
              yaml += `${spaces}  - ${item}\n`;
            }
          });
        } else {
          yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
        }
      }
      return yaml;
    };

    return yamlify(data);
  };

  // Validation functions
  const validateImportData = useCallback((data, type) => {
    const results = {
      isValid: true,
      warnings: [],
      errors: [],
      stats: {}
    };

    try {
      let parsedData;
      
      if (importFormat === 'json') {
        parsedData = JSON.parse(data);
      } else if (importFormat === 'csv') {
        parsedData = parseCSV(data, type);
      } else if (importFormat === 'yaml') {
        parsedData = parseYAML(data);
      }

      // Validate structure based on type
      switch (type) {
        case 'complete':
          validateCompleteData(parsedData, results);
          break;
        case 'hardware':
          validateHardwareData(parsedData, results);
          break;
        case 'datacloset':
          validateDataClosetData(parsedData, results);
          break;
        case 'inventory':
          validateInventoryData(parsedData, results);
          break;
        case 'recycling':
          validateRecyclingData(parsedData, results);
          break;
      }

      setPreviewData(parsedData);
    } catch (error) {
      results.isValid = false;
      results.errors.push(`Parse error: ${error.message}`);
    }

    return results;
  }, [importFormat]);

  const parseCSV = (csvData, type) => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have header and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/\s+/g, '')] = values[index] || '';
      });
      return row;
    });

    return { dataType: type, data: data };
  };

  const parseYAML = (yamlData) => {
    // Simple YAML parser (handles basic structures)
    const lines = yamlData.split('\n');
    const result = {};
    let current = result;
    const stack = [result];
    
    lines.forEach(line => {
      const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
      if (match) {
        const [, indent, key, value] = match;
        const level = indent.length / 2;
        
        // Adjust stack to current level
        while (stack.length > level + 1) {
          stack.pop();
        }
        current = stack[stack.length - 1];
        
        if (value) {
          // Try to parse value
          try {
            current[key.trim()] = JSON.parse(value);
          } catch {
            current[key.trim()] = value;
          }
        } else {
          // Object
          current[key.trim()] = {};
          stack.push(current[key.trim()]);
        }
      }
    });
    
    return result;
  };

  const validateCompleteData = (data, results) => {
    results.stats.dataType = 'Complete Report';
    results.stats.sections = 0;
    
    if (data.data) {
      const sections = ['hardware', 'dataCloset', 'inventory', 'recycling'];
      sections.forEach(section => {
        if (data.data[section]) {
          results.stats.sections++;
        }
      });
    }
    
    if (results.stats.sections === 0) {
      results.warnings.push('No recognizable data sections found');
    }
  };

  const validateHardwareData = (data, results) => {
    results.stats.dataType = 'Hardware Infrastructure';
    results.stats.totalItems = 0;
    results.stats.categories = 0;

    if (data.data && data.data.hardware) {
      Object.keys(data.data.hardware).forEach(category => {
        if (Array.isArray(data.data.hardware[category])) {
          results.stats.categories++;
          results.stats.totalItems += data.data.hardware[category].length;
        }
      });
    }

    if (results.stats.totalItems === 0) {
      results.warnings.push('No hardware items found');
    }
  };

  const validateDataClosetData = (data, results) => {
    results.stats.dataType = 'Data Closet & Racks';
    results.stats.locations = 0;
    results.stats.racks = 0;
    results.stats.devices = 0;

    if (data.data && data.data.locations) {
      results.stats.locations = data.data.locations.length;
      data.data.locations.forEach(location => {
        if (location.racks) {
          results.stats.racks += location.racks.length;
          location.racks.forEach(rack => {
            if (rack.devices) {
              results.stats.devices += rack.devices.length;
            }
          });
        }
      });
    }

    if (results.stats.locations === 0) {
      results.warnings.push('No data closet locations found');
    }
  };

  const validateInventoryData = (data, results) => {
    results.stats.dataType = 'General Inventory';
    results.stats.items = 0;
    results.stats.totalCount = 0;

    if (data.data && data.data.inventory && data.data.inventory.items) {
      results.stats.items = data.data.inventory.items.length;
      data.data.inventory.items.forEach(item => {
        const itemTotal = (item.inUse || 0) + 
          Object.values(item.otherUse || {}).reduce((sum, val) => sum + (val || 0), 0) + 
          Object.values(item.spares || {}).reduce((sum, val) => sum + (val || 0), 0) + 
          (item.broken || 0);
        results.stats.totalCount += itemTotal;
      });
    }

    if (results.stats.items === 0) {
      results.warnings.push('No inventory items found');
    }
  };

  const validateRecyclingData = (data, results) => {
    results.stats.dataType = 'Recycling Data';
    results.stats.broughtBack = 0;
    results.stats.pickupRequired = 0;
    results.stats.sentToHq = 0;

    if (data.data && data.data.recycling) {
      const recycling = data.data.recycling;
      if (recycling.broughtBack) {
        results.stats.broughtBack = recycling.broughtBack.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
      if (recycling.pickupRequired) {
        results.stats.pickupRequired = recycling.pickupRequired.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
      if (recycling.sentToHq) {
        results.stats.sentToHq = recycling.sentToHq.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    }

    if (results.stats.broughtBack + results.stats.pickupRequired + results.stats.sentToHq === 0) {
      results.warnings.push('No recycling data found');
    }
  };

  // Import/Export handlers
  const handleExport = () => {
    setIsProcessing(true);
    try {
      const extractedData = extractDataByType(selectedDataType);
      const formattedData = convertToFormat(extractedData, exportFormat);
      
      const formatInfo = formats.find(f => f.id === exportFormat);
      const filename = `rss-report-${selectedDataType}-${reportData.office || 'office'}-${new Date().toISOString().split('T')[0]}${formatInfo.extension}`;
      
      const blob = new Blob([formattedData], { type: formatInfo.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        message: `Data exported successfully as ${formatInfo.label}`,
        duration: 3000
      });
      
      setShowExportModal(false);
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Export failed: ${error.message}`,
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportValidation = () => {
    if (!importData.trim()) {
      addNotification({
        type: 'error',
        message: 'Please enter data to import',
        duration: 3000
      });
      return;
    }

    setIsProcessing(true);
    try {
      const results = validateImportData(importData, selectedDataType);
      setValidationResults(results);
      
      if (results.isValid || results.warnings.length > 0) {
        setShowPreviewModal(true);
      } else {
        addNotification({
          type: 'error',
          message: `Validation failed: ${results.errors.join(', ')}`,
          duration: 5000
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Validation error: ${error.message}`,
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportConfirm = () => {
    if (!previewData) return;

    setIsProcessing(true);
    try {
      // Apply the imported data
      switch (selectedDataType) {
        case 'complete':
          if (previewData.data) {
            updateReportData('reportData', previewData.data);
            addNotification({
              type: 'success',
              message: 'Complete report data imported successfully',
              duration: 3000
            });
          }
          break;

        case 'hardware':
          if (previewData.data && previewData.data.hardware) {
            updateReportData('hardware', previewData.data.hardware);
            addNotification({
              type: 'success',
              message: `Hardware data imported: ${validationResults.stats.totalItems} items in ${validationResults.stats.categories} categories`,
              duration: 3000
            });
          }
          break;

        case 'datacloset':
          if (previewData.data) {
            const dataClosetData = reportData.dataCloset || {};
            const updatedDataCloset = {
              ...dataClosetData,
              ...previewData.data.dataCloset,
              locations: previewData.data.locations || dataClosetData.locations || [],
              environmental: previewData.data.environmental || dataClosetData.environmental || {},
              photos: previewData.data.photos || dataClosetData.photos || []
            };
            updateReportData('dataCloset', updatedDataCloset);
            addNotification({
              type: 'success',
              message: `Data closet imported: ${validationResults.stats.locations} locations, ${validationResults.stats.racks} racks, ${validationResults.stats.devices} devices`,
              duration: 3000
            });
          }
          break;

        case 'inventory':
          if (previewData.data && previewData.data.inventory) {
            updateReportData('inventory', previewData.data.inventory);
            addNotification({
              type: 'success',
              message: `Inventory imported: ${validationResults.stats.items} items, ${validationResults.stats.totalCount} total count`,
              duration: 3000
            });
          }
          break;

        case 'recycling':
          if (previewData.data && previewData.data.recycling) {
            updateReportData('recycling', previewData.data.recycling);
            addNotification({
              type: 'success',
              message: 'Recycling data imported successfully',
              duration: 3000
            });
          }
          break;
      }

      setShowImportModal(false);
      setShowPreviewModal(false);
      setImportData('');
      setPreviewData(null);
      setValidationResults(null);
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Import failed: ${error.message}`,
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
      
      // Auto-detect format from file extension
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'json') setImportFormat('json');
      else if (extension === 'csv') setImportFormat('csv');
      else if (extension === 'yaml' || extension === 'yml') setImportFormat('yaml');
    };
    reader.readAsText(file);
  };

  const generateExampleData = () => {
    const exampleData = extractDataByType(selectedDataType);
    
    // Add some example values
    if (selectedDataType === 'hardware' && exampleData.data.hardware) {
      exampleData.data.hardware.computers = [
        {
          id: 1,
          name: 'Desktop-001',
          model: 'Dell OptiPlex 7090',
          serialNumber: 'ABC123DEF',
          os: 'Windows 11',
          processor: 'Intel i7-11700',
          memory: '16GB',
          storage: '512GB SSD',
          status: 'active'
        }
      ];
    }

    setImportData(convertToFormat(exampleData, importFormat));
  };

  return (
    <div className="space-y-6">
      <Section 
        title="Import/Export Data Management" 
        icon={<Database className="text-purple-500" />}
        helpText="Comprehensive data import and export system for all RSS Visit Report data. Export your current data or import bulk infrastructure information."
      >
        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex justify-center">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
              <button
                onClick={() => setActiveMode('import')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeMode === 'import'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Import size={16} />
                <span>Import Data</span>
              </button>
              <button
                onClick={() => setActiveMode('export')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeMode === 'export'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <FileDown size={16} />
                <span>Export Data</span>
              </button>
            </div>
          </div>

          {/* Data Type Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Select Data Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataTypes.map(type => (
                <div
                  key={type.id}
                  onClick={() => setSelectedDataType(type.id)}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    selectedDataType === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {type.icon}
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {type.label}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {type.description}
                  </p>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Includes:</p>
                    <div className="flex flex-wrap gap-1">
                      {type.includes.map(item => (
                        <span
                          key={item}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-md"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            {activeMode === 'import' ? (
              <>
                <Button
                  onClick={() => setShowImportModal(true)}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <Upload size={20} />
                  <span>Import {dataTypes.find(t => t.id === selectedDataType)?.label}</span>
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="lg"
                >
                  <FileSpreadsheet size={20} />
                  <span>Import from File</span>
                </Button>
                <Button
                  onClick={() => setShowTemplatesModal(true)}
                  variant="outline"
                  size="lg"
                >
                  <FileText size={20} />
                  <span>View Templates</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowExportModal(true)}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <Download size={20} />
                  <span>Export {dataTypes.find(t => t.id === selectedDataType)?.label}</span>
                </Button>
              </>
            )}
          </div>

          {/* Current Data Stats */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Current Data Overview
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <HardDrive className="mx-auto mb-2 text-blue-500" size={24} />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Object.values(reportData.hardware || {}).reduce((total, items) => 
                    total + (Array.isArray(items) ? items.length : 0), 0
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hardware Items</p>
              </div>
              <div className="text-center">
                <Server className="mx-auto mb-2 text-green-500" size={24} />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(reportData.dataCloset?.locations || []).reduce((total, loc) => 
                    total + (loc.racks || []).reduce((rackTotal, rack) => 
                      rackTotal + (rack.devices || []).length, 0
                    ), 0
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rack Devices</p>
              </div>
              <div className="text-center">
                <Package className="mx-auto mb-2 text-orange-500" size={24} />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(reportData.inventory?.items || []).reduce((total, item) => {
                    return total + (item.inUse || 0) + 
                      Object.values(item.otherUse || {}).reduce((sum, val) => sum + (val || 0), 0) + 
                      Object.values(item.spares || {}).reduce((sum, val) => sum + (val || 0), 0) + 
                      (item.broken || 0);
                  }, 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Items</p>
              </div>
              <div className="text-center">
                <RefreshCw className="mx-auto mb-2 text-purple-500" size={24} />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(reportData.recycling?.broughtBack || []).reduce((sum, item) => sum + (item.quantity || 0), 0) +
                   (reportData.recycling?.pickupRequired || []).reduce((sum, item) => sum + (item.quantity || 0), 0) +
                   (reportData.recycling?.sentToHq || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recycling Items</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.yaml,.yml,.txt"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={`Import ${dataTypes.find(t => t.id === selectedDataType)?.label}`}
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Import Format"
              value={importFormat}
              onChange={(e) => setImportFormat(e.target.value)}
            >
              {formats.map(format => (
                <option key={format.id} value={format.id}>
                  {format.label} - {format.description}
                </option>
              ))}
            </Select>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={generateExampleData}
                className="w-full"
              >
                <Eye size={16} />
                Generate Example
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste or Edit Import Data
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
              rows={16}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
          </div>

          <Alert variant="info">
            <strong>Import Tips:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li><strong>JSON:</strong> Most flexible format, preserves all data relationships</li>
              <li><strong>CSV:</strong> Great for tabular data like hardware inventories</li>
              <li><strong>YAML:</strong> Human-readable format, good for configuration-like data</li>
              <li>Use "Generate Example" to see the expected format</li>
              <li>Large datasets are supported - the system will validate before importing</li>
            </ul>
          </Alert>

          <div className="flex justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setImportData('')}
              >
                <Trash2 size={16} />
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Load File
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportValidation}
                disabled={!importData.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Validate & Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={`Export ${dataTypes.find(t => t.id === selectedDataType)?.label}`}
        size="lg"
      >
        <div className="space-y-6">
          <Select
            label="Export Format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            {formats.map(format => (
              <option key={format.id} value={format.id}>
                {format.label} - {format.description}
              </option>
            ))}
          </Select>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Export Preview
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will export your {dataTypes.find(t => t.id === selectedDataType)?.label.toLowerCase()} 
              in {formats.find(f => f.id === exportFormat)?.label} format.
            </p>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Filename: rss-report-{selectedDataType}-{reportData.office || 'office'}-{new Date().toISOString().split('T')[0]}{formats.find(f => f.id === exportFormat)?.extension}
            </div>
          </div>

          <Alert variant="info">
            <strong>Export Notes:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>JSON format preserves all data structure and relationships</li>
              <li>CSV format is ideal for spreadsheet applications like Excel</li>
              <li>YAML format is human-readable and great for documentation</li>
              <li>All exports include metadata like timestamps and office information</li>
            </ul>
          </Alert>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Import Preview & Validation"
        size="xl"
      >
        {validationResults && (
          <div className="space-y-6">
            {/* Validation Status */}
            <div className={`p-4 rounded-lg ${
              validationResults.isValid 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {validationResults.isValid ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
                <h4 className={`font-semibold ${
                  validationResults.isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {validationResults.isValid ? 'Validation Successful' : 'Validation Failed'}
                </h4>
              </div>

              {validationResults.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Errors:</p>
                  <ul className="mt-1 list-disc list-inside text-sm text-red-700 dark:text-red-300">
                    {validationResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResults.warnings.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings:</p>
                  <ul className="mt-1 list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                    {validationResults.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Statistics */}
            {validationResults.stats && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Import Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(validationResults.stats).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Preview */}
            {previewData && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Data Preview
                </h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-auto">
                  <pre>{JSON.stringify(previewData, null, 2)}</pre>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
              >
                Cancel
              </Button>
              {validationResults.isValid && (
                <Button
                  onClick={handleImportConfirm}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Confirm Import
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Data Templates Modal */}
      <DataTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onUseTemplate={(templateData, format) => {
          setImportData(templateData);
          setImportFormat(format);
          setShowImportModal(true);
        }}
      />
    </div>
  );
};

export default ImportExport;