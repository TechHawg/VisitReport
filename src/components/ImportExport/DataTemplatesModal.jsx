import React, { useState } from 'react';
import { 
  Copy, Download, Eye, Code, FileSpreadsheet, 
  Database, Server, Package, HardDrive, RefreshCw
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Alert from '../ui/Alert';
import { 
  HARDWARE_TEMPLATES, 
  DATACLOSET_TEMPLATES, 
  INVENTORY_TEMPLATES, 
  RECYCLING_TEMPLATES,
  COMPLETE_REPORT_TEMPLATE,
  getTemplate 
} from '../../utils/dataTemplates';

const DataTemplatesModal = ({ isOpen, onClose, onUseTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState('hardware');
  const [selectedTemplate, setSelectedTemplate] = useState('computers');
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [previewData, setPreviewData] = useState('');

  const categories = [
    { 
      id: 'hardware', 
      label: 'Hardware Infrastructure', 
      icon: <HardDrive size={16} />,
      templates: {
        computers: 'Computer hardware inventory',
        networking: 'Network equipment inventory'
      }
    },
    { 
      id: 'datacloset', 
      label: 'Data Closet & Racks', 
      icon: <Server size={16} />,
      templates: {
        devices: 'Rack-mounted devices',
        racks: 'Rack configuration'
      }
    },
    { 
      id: 'inventory', 
      label: 'General Inventory', 
      icon: <Package size={16} />,
      templates: {
        general: 'General office inventory'
      }
    },
    { 
      id: 'recycling', 
      label: 'Recycling Data', 
      icon: <RefreshCw size={16} />,
      templates: {
        complete: 'Complete recycling data'
      }
    },
    { 
      id: 'complete', 
      label: 'Complete Report', 
      icon: <Database size={16} />,
      templates: {
        json: 'Complete report template'
      }
    }
  ];

  const formats = [
    { id: 'json', label: 'JSON', icon: <Code size={16} /> },
    { id: 'csv', label: 'CSV', icon: <FileSpreadsheet size={16} /> }
  ];

  React.useEffect(() => {
    // Update template options when category changes
    const category = categories.find(c => c.id === selectedCategory);
    if (category) {
      const firstTemplate = Object.keys(category.templates)[0];
      setSelectedTemplate(firstTemplate);
    }
  }, [selectedCategory]);

  React.useEffect(() => {
    // Generate preview data
    const templateData = getTemplateData();
    setPreviewData(templateData);
  }, [selectedCategory, selectedTemplate, selectedFormat]);

  const getTemplateData = () => {
    const templates = {
      hardware: HARDWARE_TEMPLATES,
      datacloset: DATACLOSET_TEMPLATES,
      inventory: INVENTORY_TEMPLATES,
      recycling: RECYCLING_TEMPLATES,
      complete: COMPLETE_REPORT_TEMPLATE
    };

    const categoryTemplates = templates[selectedCategory];
    if (!categoryTemplates) return '';

    if (selectedCategory === 'complete') {
      return selectedFormat === 'json' 
        ? JSON.stringify(categoryTemplates.json, null, 2)
        : 'CSV format not available for complete reports';
    }

    const template = categoryTemplates[selectedTemplate];
    if (!template) return '';

    return selectedFormat === 'json' 
      ? JSON.stringify(template.json, null, 2)
      : template.csv || 'CSV format not available for this template';
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewData);
      // Show success notification (you might want to implement this)
      console.log('Template copied to clipboard');
    } catch (err) {
      console.error('Failed to copy template:', err);
    }
  };

  const handleDownloadTemplate = () => {
    const filename = `${selectedCategory}-${selectedTemplate}-template.${selectedFormat}`;
    const mimeType = selectedFormat === 'json' ? 'application/json' : 'text/csv';
    
    const blob = new Blob([previewData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUseTemplate = () => {
    onUseTemplate(previewData, selectedFormat);
    onClose();
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Templates & Examples"
      size="xl"
    >
      <div className="space-y-6">
        <Alert variant="info">
          <strong>Data Templates:</strong> Use these pre-built templates to understand the expected data format 
          and get started quickly with bulk imports. You can copy, download, or use these templates directly.
        </Alert>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Data Category
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedCategory === category.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {category.icon}
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {category.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Object.keys(category.templates).length} template(s)
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Template and Format Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Template Type"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {currentCategory && Object.entries(currentCategory.templates).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              label="Format"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              {formats.map(format => (
                <option key={format.id} value={format.id}>{format.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Template Preview */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Template Preview
            </label>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyToClipboard}
              >
                <Copy size={14} />
                Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                <Download size={14} />
                Download
              </Button>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-auto">
            <pre>{previewData}</pre>
          </div>
        </div>

        {/* Template Description */}
        {selectedCategory === 'hardware' && (
          <Alert variant="info">
            <strong>Hardware Templates:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li><strong>Computers:</strong> Desktop computers, laptops, and workstations with full specs</li>
              <li><strong>Networking:</strong> Routers, switches, firewalls, and access points with network info</li>
              <li>Each template includes common fields like model, serial number, and status</li>
              <li>JSON format preserves all relationships and metadata</li>
            </ul>
          </Alert>
        )}

        {selectedCategory === 'datacloset' && (
          <Alert variant="info">
            <strong>Data Closet Templates:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li><strong>Devices:</strong> Complete rack-mounted device inventory with positions</li>
              <li><strong>Racks:</strong> Rack definitions with power and environmental info</li>
              <li>Includes rack unit positioning (startUnit, unitSpan) for visual representation</li>
              <li>Device types include servers, switches, storage, UPS, and more</li>
            </ul>
          </Alert>
        )}

        {selectedCategory === 'inventory' && (
          <Alert variant="info">
            <strong>Inventory Templates:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Comprehensive inventory tracking with detailed usage categories</li>
              <li>Tracks in-use, spare, broken, and special-purpose equipment</li>
              <li>Includes usage breakdown (training, conference, prospecting, etc.)</li>
              <li>Special stations tracking for complex setups</li>
            </ul>
          </Alert>
        )}

        {selectedCategory === 'recycling' && (
          <Alert variant="info">
            <strong>Recycling Templates:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Complete recycling workflow with status tracking</li>
              <li>Categories: brought back, pickup required, sent to HQ</li>
              <li>Priority levels and scheduling information</li>
              <li>Notes and status tracking for each item</li>
            </ul>
          </Alert>
        )}

        {selectedCategory === 'complete' && (
          <Alert variant="info">
            <strong>Complete Report Template:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Full report structure with all sections included</li>
              <li>Contains example data for hardware, inventory, data closet, and recycling</li>
              <li>Includes visit summary, issues, and recommendations</li>
              <li>Perfect for understanding the complete data model</li>
            </ul>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={handleUseTemplate}
          >
            <Eye size={16} />
            Use This Template
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DataTemplatesModal;