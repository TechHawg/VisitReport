import { useApp } from '../context/AppContext';
import { validateEmail, VALIDATION_PATTERNS } from '../utils/security';

export const useReport = () => {
  const { reportData, updateReportData, addNotification, setLoading } = useApp();

  const validateReportData = () => {
    const errors = [];

    // Required fields validation
    if (!reportData.office?.trim()) {
      errors.push('Office location is required');
    }

    if (!reportData.date) {
      errors.push('Visit date is required');
    }

    if (!reportData.summary?.trim()) {
      errors.push('Visit summary is required');
    }

    // Office location format validation
    if (reportData.office && !VALIDATION_PATTERNS.office.test(reportData.office)) {
      errors.push('Office location contains invalid characters');
    }

    // Date validation
    if (reportData.date) {
      const visitDate = new Date(reportData.date);
      const today = new Date();
      const maxPastDate = new Date();
      maxPastDate.setFullYear(today.getFullYear() - 1);

      if (visitDate > today) {
        errors.push('Visit date cannot be in the future');
      }

      if (visitDate < maxPastDate) {
        errors.push('Visit date cannot be more than one year ago');
      }
    }

    return errors;
  };

  const getReportSummary = () => {
    const infrastructureCount = Object.values(reportData.itInfrastructure || {})
      .reduce((total, items) => total + (items?.length || 0), 0);

    return {
      isComplete: validateReportData().length === 0,
      infrastructureItems: infrastructureCount,
      inventoryItems: reportData.inventory?.length || 0,
      recyclingItems: reportData.recycling?.length || 0,
      issuesCount: reportData.issues?.length || 0,
      recommendationsCount: reportData.recommendations?.length || 0
    };
  };

  const exportReportData = () => {
    try {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `visit-report-${reportData.office}-${reportData.date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Report exported successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Export error:', error);
      addNotification({
        type: 'error',
        message: 'Failed to export report',
        duration: 3000
      });
    }
  };

  const importReportData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Basic validation of imported data structure
          if (!importedData || typeof importedData !== 'object') {
            throw new Error('Invalid file format');
          }

          // Merge with current data, preserving structure
          const mergedData = {
            ...reportData,
            ...importedData,
            // Ensure required fields exist
            itInfrastructure: {
              servers: [],
              workstations: [],
              networkEquipment: [],
              ...importedData.itInfrastructure
            }
          };

          updateReportData('', mergedData);
          
          addNotification({
            type: 'success',
            message: 'Report imported successfully',
            duration: 3000
          });
          
          resolve(mergedData);
        } catch (error) {
          console.error('Import error:', error);
          addNotification({
            type: 'error',
            message: 'Failed to import report: Invalid file format',
            duration: 5000
          });
          reject(error);
        }
      };

      reader.onerror = () => {
        addNotification({
          type: 'error',
          message: 'Failed to read file',
          duration: 3000
        });
        reject(new Error('File read error'));
      };

      reader.readAsText(file);
    });
  };

  const clearReportData = () => {
    const emptyData = {
      office: '',
      date: new Date().toISOString().split('T')[0],
      visitPurpose: '',
      summary: '',
      itInfrastructure: {
        servers: [],
        workstations: [],
        networkEquipment: []
      },
      inventory: [],
      recycling: [],
      issues: [],
      recommendations: []
    };

    Object.keys(emptyData).forEach(key => {
      updateReportData(key, emptyData[key]);
    });

    addNotification({
      type: 'info',
      message: 'Report data cleared',
      duration: 3000
    });
  };

  const saveAsDraft = async () => {
    setLoading(true);
    
    try {
      // TODO: Implement actual draft saving to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addNotification({
        type: 'success',
        message: 'Draft saved successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Save draft error:', error);
      addNotification({
        type: 'error',
        message: 'Failed to save draft',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    reportData,
    updateReportData,
    validateReportData,
    getReportSummary,
    exportReportData,
    importReportData,
    clearReportData,
    saveAsDraft
  };
};