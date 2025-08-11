import React, { useState } from 'react';
import { Sun, Moon, Send, User, Settings, Save, Download, Upload, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import UserMenu from '../auth/UserMenu';
import { useApp } from '../../context/AppContext';
import { getEmailRecipients } from '../../utils/security';
import pdfReportService from '../../services/pdfReportService';

// Helper function to consolidate photos from different sources
const consolidatePhotos = (reportData) => {
  const allPhotos = [];
  
  // Add photos from main photos field
  if (reportData.photos && Array.isArray(reportData.photos)) {
    allPhotos.push(...reportData.photos);
  }
  
  // Add photos from pictures.dataCloset
  if (reportData.pictures?.dataCloset && Array.isArray(reportData.pictures.dataCloset)) {
    allPhotos.push(...reportData.pictures.dataCloset.map(photo => ({
      ...photo,
      category: 'Data Closet'
    })));
  }
  
  // Add photos from pictures.trainingRoom
  if (reportData.pictures?.trainingRoom && Array.isArray(reportData.pictures.trainingRoom)) {
    allPhotos.push(...reportData.pictures.trainingRoom.map(photo => ({
      ...photo,
      category: 'Training Room'
    })));
  }
  
  // Add photos from dataCloset.photos
  if (reportData.dataCloset?.photos && Array.isArray(reportData.dataCloset.photos)) {
    allPhotos.push(...reportData.dataCloset.photos.map(photo => ({
      ...photo,
      category: 'Data Closet'
    })));
  }
  
  return allPhotos;
};

// Helper function to extract racks from data closet locations
const extractRacksFromDataCloset = (dataCloset) => {
  if (!dataCloset || !dataCloset.locations) return [];
  
  const racks = [];
  
  // If locations is an array
  if (Array.isArray(dataCloset.locations)) {
    dataCloset.locations.forEach((location, index) => {
      if (location.racks && Array.isArray(location.racks)) {
        location.racks.forEach(rack => {
          racks.push({
            ...rack,
            location: location.name || `Location ${index + 1}`,
            id: rack.id || `${location.name || 'location'}-rack-${rack.name || index}`
          });
        });
      }
    });
  }
  // If locations is an object
  else if (typeof dataCloset.locations === 'object') {
    Object.entries(dataCloset.locations).forEach(([locationName, locationData]) => {
      if (locationData.racks && Array.isArray(locationData.racks)) {
        locationData.racks.forEach(rack => {
          racks.push({
            ...rack,
            location: locationName,
            id: rack.id || `${locationName}-rack-${rack.name || 'unnamed'}`
          });
        });
      }
    });
  }
  
  return racks;
};

const Header = () => {
  const { theme, toggleTheme, isLoading, reportData, addNotification, setLoading } = useApp();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [settingsData, setSettingsData] = useState({
    exportFormat: 'json',
    autoSave: 'enabled',
    defaultView: 'dashboard'
  });
  const [submitOptions, setSubmitOptions] = useState({
    exportFormat: 'pdf',
    emailReport: true,
    downloadCopy: true,
    includePhotos: true,
    includeRackDiagrams: true
  });

  const handleSubmitReport = () => {
    // Basic validation - be more flexible with field checking
    const hasOffice = reportData.office?.trim();
    const hasDate = reportData.date?.trim();
    const hasSummary = reportData.summary?.summaryText?.trim();
    
    console.log('Submit Report validation:', {
      hasOffice: !!hasOffice,
      hasDate: !!hasDate,
      hasSummary: !!hasSummary,
      office: reportData.office,
      date: reportData.date,
      summaryText: reportData.summary?.summaryText?.substring(0, 50) + '...'
    });
    
    if (!hasOffice || !hasDate || !hasSummary) {
      addNotification({
        type: 'error',
        message: 'Please fill in all required fields before submitting',
        description: 'Office location, date, and summary are required.',
        duration: 5000
      });
      return;
    }

    // Open submission modal for export options
    console.log('Validation passed, opening submission modal...');
    setShowSubmitModal(true);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    
    try {
      // Generate export based on selected format
      if (submitOptions.exportFormat === 'pdf') {
        await handlePDFExport();
      } else if (submitOptions.exportFormat === 'csv') {
        await handleCSVExport();
      } else {
        handleJSONExport();
      }

      // If email option is selected, also prepare email
      if (submitOptions.emailReport) {
        const emailRecipients = await getEmailRecipients();
        console.log('Email recipients:', emailRecipients.fullReport);
        
        // TODO: Integrate with email service
        addNotification({
          type: 'info',
          message: 'Email functionality will be implemented',
          description: 'Report exported successfully. Email integration coming soon.',
          duration: 4000
        });
      }

      addNotification({
        type: 'success',
        message: 'Report submitted and exported successfully!',
        description: `Report exported as ${submitOptions.exportFormat.toUpperCase()}${submitOptions.emailReport ? ' and prepared for email' : ''}`,
        duration: 5000
      });

      setShowSubmitModal(false);
      
    } catch (error) {
      console.error('Submission error:', error);
      addNotification({
        type: 'error',
        message: 'Failed to submit report',
        description: error.message || 'Please try again or contact support if the problem persists.',
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

  const handleExportData = async (format = null) => {
    const exportFormat = format || settingsData.exportFormat;
    setLoading(true);

    try {
      switch (exportFormat) {
        case 'pdf':
          await handlePDFExport();
          break;
        case 'csv':
          await handleCSVExport();
          break;
        case 'json':
        default:
          handleJSONExport();
          break;
      }
      
      addNotification({
        type: 'success',
        message: `Report exported as ${exportFormat.toUpperCase()} successfully`,
        duration: 3000
      });
    } catch (error) {
      console.error('Export error:', error);
      addNotification({
        type: 'error',
        message: `Failed to export as ${exportFormat.toUpperCase()}`,
        description: error.message,
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJSONExport = () => {
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
  };

  const handleCSVExport = () => {
    // Convert report data to CSV format
    const csvData = convertToCSV(reportData);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visit-report-${reportData.date || 'draft'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePDFExport = async () => {
    // Map our actual report data structure to what the PDF service expects
    const mappedReportData = {
      // Basic information
      organization: { 
        name: reportData.office || reportData.organization?.name || 'Unknown Organization' 
      },
      location: { 
        name: reportData.office || reportData.location?.name || 'Unknown Location' 
      },
      visitDate: reportData.date || new Date().toISOString(),
      
      // Handle summary data properly - summary is an object with multiple text fields
      summary: reportData.summary?.summaryText || 
               (typeof reportData.summary === 'string' ? reportData.summary : '') || 
               'Visit completed successfully.',
      
      // Additional summary details
      summaryDetails: {
        pcRepairs: reportData.summary?.pcRepairsText || '',
        trainingRoom: reportData.summary?.trainingRoomText || '',
        issues: reportData.summary?.issuesText || '',
        recommendations: reportData.summary?.recommendationsText || '',
        followUp: reportData.summary?.followUpText || ''
      },
      
      // Technician information
      technician: {
        name: reportData.technician?.name || reportData.technician || reportData.rss || 'Unknown Technician'
      },
      
      // Visit details
      visitPurpose: reportData.visitPurpose || 'Routine maintenance',
      nextVisit: reportData.nextVisit || '',
      
      // Office grading
      officeGrading: reportData.officeGrading || [],
      officeGrade: reportData.officeGrade || 'N/A',
      
      // Infrastructure data - include SCCM PCs and hardware
      infrastructure: {
        sccmPCs: reportData.sccmPCs?.computers || [],
        hardware: reportData.hardware || {},
        officeHardware: reportData.officeHardware || [],
        ...reportData.infrastructure
      },
      
      // Data closet information
      dataCloset: reportData.dataCloset || {},
      
      // Inventory management
      inventory: reportData.inventory || {},
      
      // Recycling information
      recycling: reportData.recycling || {},
      
      // Environmental data from data closet
      environmental: reportData.dataCloset?.environmental || reportData.environmental || {},
      
      // Power systems and network infrastructure
      powerSystems: reportData.powerSystems || {},
      networkInfrastructure: reportData.networkInfrastructure || {},
      
      // Rack information from data closet locations
      racks: extractRacksFromDataCloset(reportData.dataCloset) || reportData.racks || [],
      
      // Issues and recommendations
      recommendations: reportData.recommendations || [],
      issues: reportData.issues || [],
      
      // Photos - handle both pictures and photos fields
      photos: consolidatePhotos(reportData),
      
      // Checklists
      checklists: reportData.checklists || []
    };
    
    // Convert checklists to recommendations if no recommendations exist
    if (mappedReportData.recommendations.length === 0 && mappedReportData.checklists.length > 0) {
      mappedReportData.recommendations = mappedReportData.checklists.flatMap(checklist => 
        checklist.items
          .filter(item => !item.checked && item.text)
          .map(item => ({
            title: item.text,
            description: `Checklist item from: ${checklist.title}`,
            priority: 'Medium'
          }))
      );
    }
    
    const filename = `RSS_Visit_Report_${reportData.office || 'Unknown'}_${reportData.date || new Date().toISOString().split('T')[0]}.pdf`;
    
    const pdfOptions = {
      title: 'RSS Visit Report',
      includePhotos: submitOptions.includePhotos,
      includeRackDiagrams: submitOptions.includeRackDiagrams,
      format: 'a4',
      orientation: 'portrait'
    };

    await pdfReportService.downloadPDF(mappedReportData, filename, pdfOptions);
  };

  const convertToCSV = (data) => {
    const rows = [];
    
    // Header row
    rows.push(['Field', 'Value']);
    
    // Basic information
    rows.push(['Office', data.office || '']);
    rows.push(['Date', data.date || '']);
    rows.push(['Summary', data.summary || '']);
    rows.push(['Technician', data.technician?.name || '']);
    
    // Infrastructure data
    if (data.infrastructure) {
      Object.entries(data.infrastructure).forEach(([key, value]) => {
        if (typeof value === 'object') {
          rows.push([key, JSON.stringify(value)]);
        } else {
          rows.push([key, value || '']);
        }
      });
    }
    
    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      data.recommendations.forEach((rec, index) => {
        rows.push([`Recommendation ${index + 1}`, rec.description || '']);
        rows.push([`Priority ${index + 1}`, rec.priority || '']);
      });
    }
    
    // Convert to CSV string
    return rows.map(row => 
      row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
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
              {/* User Menu */}
              <UserMenu />

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
                <option value="pdf">PDF</option>
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
                onClick={() => handleExportData()}
                className="w-full justify-start"
                disabled={isLoading}
              >
                <Download size={18} />
                Export as {settingsData.exportFormat.toUpperCase()} (Default)
              </Button>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExportData('pdf')}
                  className="text-xs p-2"
                  disabled={isLoading}
                  title="Export as PDF"
                >
                  <FileText size={14} />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportData('csv')}
                  className="text-xs p-2"
                  disabled={isLoading}
                  title="Export as CSV"
                >
                  <Download size={14} />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportData('json')}
                  className="text-xs p-2"
                  disabled={isLoading}
                  title="Export as JSON"
                >
                  <Save size={14} />
                  JSON
                </Button>
              </div>

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

      {/* Submit Report Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Report"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Export Options</h3>
            
            <div className="space-y-4">
              <Select
                label="Export Format"
                value={submitOptions.exportFormat}
                onChange={(e) => setSubmitOptions({ ...submitOptions, exportFormat: e.target.value })}
              >
                <option value="pdf">PDF (Recommended)</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </Select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={submitOptions.emailReport}
                    onChange={(e) => setSubmitOptions({ ...submitOptions, emailReport: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email Report</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={submitOptions.downloadCopy}
                    onChange={(e) => setSubmitOptions({ ...submitOptions, downloadCopy: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Download Copy</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={submitOptions.includePhotos}
                    onChange={(e) => setSubmitOptions({ ...submitOptions, includePhotos: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include Photos</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={submitOptions.includeRackDiagrams}
                    onChange={(e) => setSubmitOptions({ ...submitOptions, includeRackDiagrams: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include Rack Diagrams</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Office: {reportData.office || 'Not specified'}</div>
              <div>Visit Date: {reportData.date || 'Not set'}</div>
              <div>Technician: {reportData.technician || 'Not specified'}</div>
              <div>Export Format: {submitOptions.exportFormat.toUpperCase()}</div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalSubmit} disabled={isLoading} loading={isLoading}>
              <Send size={16} />
              Submit & Export Report
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;