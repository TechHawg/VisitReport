import React, { useState } from 'react';
import { Sun, Moon, Send, User, Settings, Save, Download, Upload } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useApp } from '../../context/AppContext';
import { getEmailRecipients } from '../../utils/security';

const Header = () => {
  const { theme, toggleTheme, isLoading, reportData, addNotification, setLoading } = useApp();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsData, setSettingsData] = useState({
    exportFormat: 'json',
    autoSave: 'enabled',
    defaultView: 'dashboard'
  });

  const handleSubmitReport = async () => {
    // Basic validation
    if (!reportData.office.trim() || !reportData.date || !reportData.summary.trim()) {
      addNotification({
        type: 'error',
        message: 'Please fill in all required fields before submitting',
        description: 'Office location, date, and summary are required.',
        duration: 5000
      });
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Replace with actual API call to backend
      const emailRecipients = await getEmailRecipients();
      console.log('Submitting report:', reportData);
      console.log('Email recipients:', emailRecipients.fullReport);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification({
        type: 'success',
        message: 'Report submitted successfully!',
        description: 'Your visit report has been sent to the management team.',
        duration: 5000
      });
    } catch (error) {
      console.error('Submission error:', error);
      addNotification({
        type: 'error',
        message: 'Failed to submit report',
        description: 'Please try again or contact support if the problem persists.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    // Save settings logic here
    localStorage.setItem('rssReportSettings', JSON.stringify(settingsData));
    addNotification({
      type: 'success',
      message: 'Settings saved successfully',
      duration: 3000
    });
    setShowSettingsModal(false);
  };

  const handleExportData = () => {
    const dataToExport = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataToExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visit-report-${reportData.date || 'draft'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification({
      type: 'success',
      message: 'Report data exported successfully',
      duration: 3000
    });
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          // TODO: Merge imported data with current data
          addNotification({
            type: 'success',
            message: 'Data imported successfully',
            duration: 3000
          });
        } catch (error) {
          addNotification({
            type: 'error',
            message: 'Failed to import data',
            description: 'Please ensure the file is a valid JSON format',
            duration: 5000
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RSS</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Visit Report System
              </h1>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User size={16} />
                <span>development-user@company.com</span>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </Button>

              {/* Settings Button */}
              <Button
                variant="outline"
                size="sm"
                className="p-2 hidden md:flex"
                aria-label="Settings"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings size={18} />
              </Button>

              {/* Submit Report Button */}
              <Button
                onClick={handleSubmitReport}
                disabled={isLoading}
                loading={isLoading}
                className="flex items-center space-x-2"
              >
                <Send size={18} />
                <span className="hidden sm:inline">Submit Report</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Application Settings"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">General Settings</h3>
            
            <div className="space-y-4">
              <Select
                label="Default Export Format"
                value={settingsData.exportFormat}
                onChange={(e) => setSettingsData({ ...settingsData, exportFormat: e.target.value })}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF (Coming Soon)</option>
              </Select>

              <Select
                label="Auto-Save"
                value={settingsData.autoSave}
                onChange={(e) => setSettingsData({ ...settingsData, autoSave: e.target.value })}
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </Select>

              <Select
                label="Default View"
                value={settingsData.defaultView}
                onChange={(e) => setSettingsData({ ...settingsData, defaultView: e.target.value })}
              >
                <option value="dashboard">Dashboard</option>
                <option value="summary">Summary</option>
                <option value="infrastructure">Infrastructure</option>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Data Management</h3>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="w-full justify-start"
              >
                <Download size={18} />
                Export Current Report Data
              </Button>

              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-file"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('import-file').click()}
                  className="w-full justify-start"
                >
                  <Upload size={18} />
                  Import Report Data
                </Button>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              <Save size={16} />
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;