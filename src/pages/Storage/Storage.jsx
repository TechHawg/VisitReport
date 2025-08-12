import React, { useState, useRef } from 'react';
import { MapPin, Package, Plus, Edit, Trash2, Camera, Thermometer, Shield, Zap, Server, Monitor, HardDrive, Wifi, Eye, Mail, BarChart3, Award, Settings, Move, Upload, FileSpreadsheet, Copy } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PhotoUpload from '../../components/ui/PhotoUpload';
import { RACK_COLORS } from '../../constants/colors';
import { useApp } from '../../context/AppContext';
import { EMAIL_RECIPIENTS } from '../../constants/emailConfig';
import RackVisualizer from '../../components/rack/RackVisualizer.jsx';

const Storage = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState('grading');
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingRack, setEditingRack] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedRack, setSelectedRack] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [viewingPhotos, setViewingPhotos] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importType, setImportType] = useState('devices');
  const fileInputRef = useRef(null);

  // Initialize data closet data structure with new location-based system
  const dataClosetData = reportData.dataCloset || {
    grading: [
      { category: 'Data Closet Appearance', score: '', comments: '' },
      { category: 'Cable Management', score: '', comments: '' },
      { category: 'Labeling', score: '', comments: '' },
      { category: 'Temperature', score: '', comments: '' },
      { category: 'Physical Security', score: '', comments: '' },
      { category: 'Device Health', score: '', comments: '' },
    ],
    overallScore: 0, // Auto-calculated percentage
    locations: [], // New location-based structure
    environmental: {
      temperature: '',
      humidity: '',
      airflow: '',
      powerStatus: '',
      lastChecked: new Date().toISOString().split('T')[0]
    },
    photos: [],
    notes: '',
    lastUpdated: new Date().toISOString().split('T')[0]
  };

  const updateDataClosetData = (field, value) => {
    const updatedDataCloset = { ...dataClosetData, [field]: value, lastUpdated: new Date().toISOString().split('T')[0] };
    updateReportData('dataCloset', updatedDataCloset);
  };

  const tabs = [
    { id: 'grading', label: 'Quality Grading', icon: <Award size={18} /> },
    { id: 'locations', label: 'Location Management', icon: <MapPin size={18} /> },
    { id: 'environmental', label: 'Environment', icon: <Thermometer size={18} /> },
    { id: 'photos', label: 'Photos', icon: <Camera size={18} /> }
  ];

  // Location management functions
  const createLocation = () => {
    setEditingLocation({
      id: null,
      name: `Location ${(dataClosetData.locations || []).length + 1}`,
      description: '',
      racks: [],
      lastUpdated: new Date().toISOString().split('T')[0]
    });
  };

  const updateLocation = (locationId, updates) => {
    const updatedLocations = (dataClosetData.locations || []).map(location => 
      location.id === locationId ? { ...location, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : location
    );
    updateDataClosetData('locations', updatedLocations);
  };

  const deleteLocation = (locationId) => {
    const updatedLocations = (dataClosetData.locations || []).filter(location => location.id !== locationId);
    updateDataClosetData('locations', updatedLocations);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Location deleted successfully',
      duration: 3000
    });
  };

  // Rack management functions
  const createRack = (locationId) => {
    const location = (dataClosetData.locations || []).find(loc => loc.id === locationId);
    if (!location) return;

    const newRack = {
      id: Date.now(),
      name: `Rack-${(location.racks || []).length + 1}`,
      height: 42, // Standard 42U rack
      devices: [],
      color: RACK_COLORS[Math.floor(Math.random() * RACK_COLORS.length)],
      power: '',
      notes: '',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    const updatedRacks = [...(location.racks || []), newRack];
    updateLocation(locationId, { racks: updatedRacks });
    
    addNotification({
      type: 'success',
      message: 'New rack created successfully',
      duration: 3000
    });
  };

  const updateRack = (locationId, rackId, updates) => {
    const location = (dataClosetData.locations || []).find(loc => loc.id === locationId);
    if (!location) return;

    const updatedRacks = (location.racks || []).map(rack => 
      rack.id === rackId ? { ...rack, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : rack
    );
    updateLocation(locationId, { racks: updatedRacks });
  };

  const deleteRack = (locationId, rackId) => {
    const location = (dataClosetData.locations || []).find(loc => loc.id === locationId);
    if (!location) return;

    const updatedRacks = (location.racks || []).filter(rack => rack.id !== rackId);
    updateLocation(locationId, { racks: updatedRacks });
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Rack deleted successfully',
      duration: 3000
    });
  };

  // Device management functions
  const getDefaultPortCount = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'pdu':
        return 12;
      case 'ups':
        return 6;
      default:
        return 0;
    }
  };

  const getEmptyDevice = () => ({
    id: Date.now(),
    name: '',
    type: '',
    model: '',
    serialNumber: '',
    assetTag: '',            // Asset tag field for device identification
    startUnit: '',
    unitSpan: 1,
    status: 'active',
    notes: '',
    isNotRacked: false,      // NEW: checkbox for devices not in rack
    // New extended fields
    pduPorts: [],            // [{pduId: string, outlet: string, type: 'pdu'|'ups'}]
    hasNicCard: false,       // boolean
    nicSwitch: '',           // string (switch name/id)
    nicPort: '',             // string/number
    lastTestDate: '',        // YYYY-MM-DD
    ports: [],               // Array of port objects for PDUs and UPS devices
    horizontalPosition: 'left', // 'left', 'center', 'right' for side-by-side placement
    widthFraction: 1,        // 1 = full width, 0.5 = half width, 0.33 = third width
    lastUpdated: new Date().toISOString().split('T')[0]
  });

  const addDevice = (locationId, rackId) => {
    setEditingDevice({ 
      ...getEmptyDevice(), 
      locationId, 
      rackId,
      isNew: true 
    });
  };

  const editDevice = (locationId, rackId, device) => {
    setEditingDevice({ 
      ...device, 
      locationId, 
      rackId,
      isNew: false 
    });
  };

  const saveDevice = () => {
    if (!editingDevice.name.trim()) {
      addNotification({
        type: 'error',
        message: 'Device name is required',
        duration: 3000
      });
      return;
    }

    // NEW: Validate that either startUnit is provided OR device is marked as not racked
    if (!editingDevice.isNotRacked && !editingDevice.startUnit) {
      addNotification({
        type: 'error',
        message: 'Please specify a start unit or mark the device as not racked',
        duration: 3000
      });
      return;
    }

    const location = (dataClosetData.locations || []).find(loc => loc.id === editingDevice.locationId);
    if (!location) return;

    const rack = location.racks.find(r => r.id === editingDevice.rackId);
    if (!rack) return;

    let updatedDevices;
    
    // Create ports array for PDUs and UPS devices
    const portCount = getDefaultPortCount(editingDevice.type);
    const ports = editingDevice.ports && editingDevice.ports.length > 0 
      ? editingDevice.ports 
      : portCount > 0 
        ? Array.from({ length: portCount }, (_, i) => ({
            id: i + 1,
            portNumber: i + 1,
            label: `Port ${i + 1}`,
            connected: false,
            connectedDevice: '',
            notes: ''
          }))
        : [];

    const deviceData = {
      id: editingDevice.id,
      name: editingDevice.name,
      type: editingDevice.type,
      model: editingDevice.type === 'patch-panel' ? '' : editingDevice.model,
      serialNumber: editingDevice.type === 'patch-panel' ? '' : editingDevice.serialNumber,
      startUnit: editingDevice.isNotRacked ? '' : parseInt(editingDevice.startUnit) || '',
      unitSpan: editingDevice.isNotRacked ? 1 : parseInt(editingDevice.unitSpan) || 1,
      status: editingDevice.status,
      notes: editingDevice.notes,
      isNotRacked: !!editingDevice.isNotRacked,
      // Persist new fields with proper type handling
      pduPorts: (editingDevice.pduPorts || []).map(p => ({ 
        pduId: p.pduId || '', 
        outlet: p.outlet || '',
        type: p.type || 'pdu'
      })),
      hasNicCard: !!editingDevice.hasNicCard,
      nicSwitch: editingDevice.nicSwitch || '',
      nicPort: editingDevice.nicPort || '',
      macAddress: editingDevice.macAddress || '',
      lastTestDate: editingDevice.lastTestDate || '',
      ports: ports, // Add the ports array
      horizontalPosition: editingDevice.horizontalPosition || 'left',
      widthFraction: parseFloat(editingDevice.widthFraction) || 1,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    if (editingDevice.isNew) {
      updatedDevices = [...(rack.devices || []), deviceData];
    } else {
      updatedDevices = (rack.devices || []).map(device => 
        device.id === editingDevice.id ? deviceData : device
      );
    }

    updateRack(editingDevice.locationId, editingDevice.rackId, { devices: updatedDevices });
    setEditingDevice(null);
    
    addNotification({
      type: 'success',
      message: 'Device saved successfully',
      duration: 3000
    });
  };

  const deleteDevice = (locationId, rackId, deviceId) => {
    const location = (dataClosetData.locations || []).find(loc => loc.id === locationId);
    if (!location) return;

    const rack = location.racks.find(r => r.id === rackId);
    if (!rack) return;

    const updatedDevices = (rack.devices || []).filter(device => device.id !== deviceId);
    updateRack(locationId, rackId, { devices: updatedDevices });
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Device deleted successfully',
      duration: 3000
    });
  };

  // Environmental monitoring
  const updateEnvironmental = (field, value) => {
    const updatedEnvironmental = { 
      ...dataClosetData.environmental, 
      [field]: value,
      lastChecked: new Date().toISOString().split('T')[0]
    };
    updateDataClosetData('environmental', updatedEnvironmental);
  };

  // Grading functions with new 1-5 scoring system
  const updateGrading = (index, field, value) => {
    // Use functional update to avoid stale closures and ensure immediate render
    const normalize = (idx, fld, val, base) => {
      const updated = [...(base || [])];
      let newValue = val;
      if (fld === 'score') {
        if (newValue === '' || newValue === null || newValue === undefined) {
          newValue = '';
        } else {
          const n = parseInt(newValue, 10);
          newValue = !isNaN(n) && n >= 1 && n <= 5 ? String(n) : '';
        }
      }
      updated[idx] = { ...updated[idx], [fld]: newValue };
      return updated;
    };

    // Build next dataCloset atomically, recompute overallScore synchronously for consistent UI
    const nextDataCloset = (() => {
      const baseGrading = Array.isArray(dataClosetData.grading) ? dataClosetData.grading : [];
      const nextGrading = normalize(index, field, value, baseGrading);
      const numericScores = nextGrading
        .map(item => parseInt(item.score, 10))
        .filter(v => !isNaN(v) && v >= 1 && v <= 5);
      const average = numericScores.length === 0 ? 0 : (numericScores.reduce((a,b)=>a+b,0) / numericScores.length);
      const nextOverall = Math.round((average / 5) * 100);
      return {
        ...dataClosetData,
        grading: nextGrading,
        overallScore: nextOverall,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    })();

    updateReportData('dataCloset', nextDataCloset);
  };

  const calculateOverallScore = (gradingData) => {
    const numericScores = (gradingData || [])
      .map(item => parseInt(item.score, 10))
      .filter(v => !isNaN(v) && v >= 1 && v <= 5);

    // Average selected scores; if none selected, 0%
    const average = numericScores.length === 0
      ? 0
      : (numericScores.reduce((a, b) => a + b, 0) / numericScores.length);
    const overall = Math.round((average / 5) * 100);

    const updatedDataCloset = {
      ...dataClosetData,
      overallScore: overall,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    updateReportData('dataCloset', updatedDataCloset);
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Data Closet Report - ${office} - ${date}`;
    
    let body = `Data Closet & Storage Report\\n`;
    body += `Office: ${office}\\n`;
    body += `Date: ${date}\\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\\n\\n`;
    
    body += `OVERALL SCORE: ${dataClosetData.overallScore}%\\n\\n`;
    
    body += `QUALITY ASSESSMENT (1-5 Scale):\\n`;
    (dataClosetData.grading || []).forEach(item => {
      const scoreText = item.score ? `${item.score}/5 (${Math.round((item.score / 5) * 100)}%)` : 'Not graded';
      body += `• ${item.category}: ${scoreText}\\n`;
      if (item.comments) body += `  Notes: ${item.comments}\\n`;
    });
    body += `\\n`;
    
    // Calculate totals from locations
    const totalRacks = (dataClosetData.locations || []).reduce((sum, loc) => sum + (loc.racks || []).length, 0);
    const totalDevices = (dataClosetData.locations || []).reduce((sum, loc) => 
      sum + (loc.racks || []).reduce((rackSum, rack) => rackSum + (rack.devices || []).length, 0), 0
    );
    
    body += `INFRASTRUCTURE SUMMARY:\\n`;
    body += `Locations: ${(dataClosetData.locations || []).length}\\n`;
    body += `Racks: ${totalRacks}\\n`;
    body += `Devices: ${totalDevices}\\n`;
    body += `Environmental Monitoring: ${dataClosetData.environmental?.temperature ? 'Active' : 'Not configured'}\\n`;
    body += `Photos: ${(dataClosetData.photos || []).length}\\n\\n`;
    
    // Location details
    if ((dataClosetData.locations || []).length > 0) {
      body += `LOCATION DETAILS:\\n`;
      (dataClosetData.locations || []).forEach(location => {
        body += `• ${location.name}: ${(location.racks || []).length} rack(s)\\n`;
        if (location.description) body += `  ${location.description}\\n`;
      });
      body += `\\n`;
    }
    
    if (dataClosetData.environmental?.temperature) {
      body += `ENVIRONMENTAL CONDITIONS:\\n`;
      body += `Temperature: ${dataClosetData.environmental.temperature}°F\\n`;
      body += `Humidity: ${dataClosetData.environmental.humidity}%\\n`;
      body += `Airflow: ${dataClosetData.environmental.airflow || 'Not assessed'}\\n`;
      body += `Power Status: ${dataClosetData.environmental.powerStatus || 'Not assessed'}\\n\\n`;
    }
    
    if (dataClosetData.notes) {
      body += `ADDITIONAL NOTES:\\n${dataClosetData.notes}\\n`;
    }
    
    const recipients = EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with data closet report',
      duration: 3000
    });
  };

  // Calculate progress
  const calculateProgress = () => {
    const locationCount = (dataClosetData.locations || []).length;
    const totalRacks = (dataClosetData.locations || []).reduce((sum, loc) => sum + (loc.racks || []).length, 0);
    const totalDevices = (dataClosetData.locations || []).reduce((sum, loc) => 
      sum + (loc.racks || []).reduce((rackSum, rack) => rackSum + (rack.devices || []).length, 0), 0
    );
    const envData = dataClosetData.environmental || {};
    const photoCount = (dataClosetData.photos || []).length;
    const gradingComplete = (dataClosetData.grading || []).filter(item => item.score).length;
    
    let score = 0;
    if (locationCount > 0) score += 15;
    if (totalRacks > 0) score += 15;
    if (totalDevices > 0) score += 20;
    if (envData.temperature && envData.humidity) score += 20;
    if (photoCount > 0) score += 15;
    if (gradingComplete >= 3) score += 15; // At least half of grading categories
    
    return score;
  };

  const progress = calculateProgress();

  // Bulk Import/Paste functionality
  const processImportData = () => {
    if (!importData.trim()) {
      addNotification({
        type: 'error',
        message: 'Please enter data to import',
        duration: 3000
      });
      return;
    }

    try {
      if (importType === 'devices') {
        processDeviceImport();
      } else if (importType === 'racks') {
        processRackImport();
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Error processing import data: ' + error.message,
        duration: 5000
      });
    }
  };

  const processDeviceImport = () => {
    const lines = importData.trim().split('\n');
    let processedCount = 0;
    let errorCount = 0;

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      try {
        // Support multiple formats:
        // CSV: name,type,model,serial,location,rack,startUnit,unitSpan,status
        // Tab-separated
        // JSON format
        let deviceData;
        
        if (line.startsWith('{')) {
          // JSON format
          deviceData = JSON.parse(line);
        } else {
          // CSV/Tab format
          const separator = line.includes('\t') ? '\t' : ',';
          const parts = line.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));
          
          if (parts.length < 4) {
            throw new Error(`Line ${index + 1}: Insufficient data. Need at least name, type, model, serial`);
          }

          deviceData = {
            name: parts[0],
            type: parts[1] || '',
            model: parts[2] || '',
            serialNumber: parts[3] || '',
            locationName: parts[4] || '',
            rackName: parts[5] || '',
            startUnit: parts[6] ? parseInt(parts[6]) : '',
            unitSpan: parts[7] ? parseInt(parts[7]) : 1,
            status: parts[8] || 'active',
            notes: parts[9] || ''
          };
        }

        // Find or create location and rack
        const locationName = deviceData.locationName || 'Default Location';
        const rackName = deviceData.rackName || 'Rack-1';

        let location = (dataClosetData.locations || []).find(loc => 
          loc.name.toLowerCase() === locationName.toLowerCase()
        );

        if (!location) {
          // Create new location
          location = {
            id: Date.now() + Math.random(),
            name: locationName,
            description: `Auto-created during import`,
            racks: [],
            lastUpdated: new Date().toISOString().split('T')[0]
          };
          const updatedLocations = [...(dataClosetData.locations || []), location];
          updateDataClosetData('locations', updatedLocations);
        }

        let rack = (location.racks || []).find(r => 
          r.name.toLowerCase() === rackName.toLowerCase()
        );

        if (!rack) {
          // Create new rack
          rack = {
            id: Date.now() + Math.random(),
            name: rackName,
            height: 42,
            devices: [],
            color: RACK_COLORS[Math.floor(Math.random() * RACK_COLORS.length)],
            power: '',
            notes: 'Auto-created during import',
            lastUpdated: new Date().toISOString().split('T')[0]
          };
          const updatedRacks = [...(location.racks || []), rack];
          updateLocation(location.id, { racks: updatedRacks });
        }

        // Add device to rack
        const newDevice = {
          id: Date.now() + Math.random(),
          name: deviceData.name,
          type: deviceData.type,
          model: deviceData.model,
          serialNumber: deviceData.serialNumber,
          startUnit: deviceData.startUnit,
          unitSpan: deviceData.unitSpan || 1,
          status: deviceData.status || 'active',
          notes: deviceData.notes || 'Imported device',
          lastUpdated: new Date().toISOString().split('T')[0]
        };

        const updatedDevices = [...(rack.devices || []), newDevice];
        updateRack(location.id, rack.id, { devices: updatedDevices });
        processedCount++;

      } catch (error) {
        console.error(`Error processing line ${index + 1}:`, error);
        errorCount++;
      }
    });

    setShowImportModal(false);
    setImportData('');

    addNotification({
      type: processedCount > 0 ? 'success' : 'error',
      message: `Import completed: ${processedCount} devices imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      duration: 5000
    });
  };

  const processRackImport = () => {
    const lines = importData.trim().split('\n');
    let processedCount = 0;
    let errorCount = 0;

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      try {
        let rackData;
        
        if (line.startsWith('{')) {
          rackData = JSON.parse(line);
        } else {
          const separator = line.includes('\t') ? '\t' : ',';
          const parts = line.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));
          
          if (parts.length < 2) {
            throw new Error(`Line ${index + 1}: Need at least rack name and location`);
          }

          rackData = {
            name: parts[0],
            locationName: parts[1] || 'Default Location',
            height: parts[2] ? parseInt(parts[2]) : 42,
            power: parts[3] || '',
            notes: parts[4] || ''
          };
        }

        // Find or create location
        let location = (dataClosetData.locations || []).find(loc => 
          loc.name.toLowerCase() === rackData.locationName.toLowerCase()
        );

        if (!location) {
          location = {
            id: Date.now() + Math.random(),
            name: rackData.locationName,
            description: 'Auto-created during import',
            racks: [],
            lastUpdated: new Date().toISOString().split('T')[0]
          };
          const updatedLocations = [...(dataClosetData.locations || []), location];
          updateDataClosetData('locations', updatedLocations);
        }

        // Create rack
        const newRack = {
          id: Date.now() + Math.random(),
          name: rackData.name,
          height: rackData.height || 42,
          devices: [],
          color: RACK_COLORS[Math.floor(Math.random() * RACK_COLORS.length)],
          power: rackData.power || '',
          notes: rackData.notes || 'Imported rack',
          lastUpdated: new Date().toISOString().split('T')[0]
        };

        const updatedRacks = [...(location.racks || []), newRack];
        updateLocation(location.id, { racks: updatedRacks });
        processedCount++;

      } catch (error) {
        console.error(`Error processing line ${index + 1}:`, error);
        errorCount++;
      }
    });

    setShowImportModal(false);
    setImportData('');

    addNotification({
      type: processedCount > 0 ? 'success' : 'error',
      message: `Import completed: ${processedCount} racks imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      duration: 5000
    });
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
    };
    reader.readAsText(file);
  };

  const exportToCSV = () => {
    let csvContent = '';
    
    if (importType === 'devices') {
      csvContent = 'Name,Type,Model,Serial,Location,Rack,Start Unit,Unit Span,Status,Notes\n';
      
      (dataClosetData.locations || []).forEach(location => {
        (location.racks || []).forEach(rack => {
          (rack.devices || []).forEach(device => {
            const row = [
              `"${device.name || ''}"`,
              `"${device.type || ''}"`,
              `"${device.model || ''}"`,
              `"${device.serialNumber || ''}"`,
              `"${location.name}"`,
              `"${rack.name}"`,
              device.startUnit || '',
              device.unitSpan || 1,
              `"${device.status || 'active'}"`,
              `"${device.notes || ''}"`
            ].join(',');
            csvContent += row + '\n';
          });
        });
      });
    } else {
      csvContent = 'Rack Name,Location,Height,Power,Notes\n';
      
      (dataClosetData.locations || []).forEach(location => {
        (location.racks || []).forEach(rack => {
          const row = [
            `"${rack.name}"`,
            `"${location.name}"`,
            rack.height || 42,
            `"${rack.power || ''}"`,
            `"${rack.notes || ''}"`
          ].join(',');
          csvContent += row + '\n';
        });
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${importType}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({
      type: 'success',
      message: `${importType} data exported successfully`,
      duration: 3000
    });
  };

  // New rack visualization using RackVisualizer component
  const renderRackVisualization = (rack, locationId, showControls = false) => {
    return (
      <RackVisualizer
        rack={rack}
        locationId={locationId}
        showControls={showControls}
        onDeviceEdit={editDevice}
        onDeviceDelete={(locId, rackId, deviceId) => setShowDeleteDialog({
          type: 'device',
          item: { id: deviceId },
          locationId: locId,
          rackId: rackId
        })}
        onDeviceAdd={addDevice}
        onDeviceClick={(device) => setSelectedDevice(device)}
        viewMode="detailed"
      />
    );
  };

  // Enhanced rack visualization with better device visibility (keeping original for reference)
  const renderRackVisualizationOriginal = (rack, locationId, showControls = false) => {
    const rackUnits = Array.from({ length: rack.height }, (_, i) => rack.height - i);
    
    // Create a map of which units are occupied by devices
    const unitMap = {};
    (rack.devices || []).forEach(device => {
      if (device.startUnit && device.unitSpan) {
        const start = parseInt(device.startUnit);
        const span = parseInt(device.unitSpan);
        for (let i = 0; i < span; i++) {
          const unit = start + i;
          if (unit <= rack.height) {
            unitMap[unit] = {
              ...device,
              isFirst: i === 0,
              isLast: i === span - 1,
              position: i,
              totalSpan: span
            };
          }
        }
      }
    });

    // Get device type icon
    const getDeviceIcon = (type) => {
      const iconMap = {
        'server': <Server size={12} />,
        'switch': <Wifi size={12} />,
        'router': <Wifi size={12} />,
        'storage': <HardDrive size={12} />,
        'ups': <Zap size={12} />,
        'pdu': <Zap size={12} />,
        'firewall': <Shield size={12} />,
        'monitor': <Monitor size={12} />,
        'patch-panel': <Package size={12} />,
        'other': <Package size={12} />
      };
      return iconMap[type] || iconMap.other;
    };
    
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 min-h-[500px] shadow-inner">
        {/* Rack Header */}
        <div className="text-center mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{rack.name}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">{rack.height}U • {(rack.devices || []).length} devices</p>
        </div>
        
        {/* Rack Units */}
        <div className="space-y-0.5 bg-gray-200 dark:bg-gray-700 p-2 rounded border-2 border-gray-400 dark:border-gray-500">
          {rackUnits.map(unit => {
            const deviceInfo = unitMap[unit];
            const isEmpty = !deviceInfo;
            
            return (
              <div
                key={unit}
                className={`h-6 border-2 text-xs flex items-center justify-between px-2 relative group transition-all duration-200 ${
                  isEmpty
                    ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-gray-750 cursor-pointer'
                    : deviceInfo.status === 'active'
                      ? 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600'
                      : deviceInfo.status === 'inactive' 
                        ? 'bg-red-100 text-red-800 border-red-400 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                        : deviceInfo.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600'
                          : 'bg-gray-100 text-gray-800 border-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'
                }`}
                title={deviceInfo ? `${deviceInfo.name} (${deviceInfo.type || 'Unknown'}) - ${deviceInfo.unitSpan}U - ${deviceInfo.status}\nModel: ${deviceInfo.model || 'N/A'}\nSerial: ${deviceInfo.serialNumber || 'N/A'}` : `Unit ${unit} - Available\nClick to add device`}
                onClick={isEmpty && showControls ? () => {
                  const newDevice = getEmptyDevice();
                  newDevice.startUnit = unit;
                  setEditingDevice({ 
                    ...newDevice, 
                    locationId, 
                    rackId: rack.id,
                    isNew: true 
                  });
                } : undefined}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400 min-w-[20px]">
                    {unit.toString().padStart(2, '0')}
                  </span>
                  
                  {deviceInfo && deviceInfo.isFirst && (
                    <div className="flex items-center space-x-1 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {getDeviceIcon(deviceInfo.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold truncate block">
                          {deviceInfo.name}
                        </span>
                        {deviceInfo.type && (
                          <span className="text-[9px] opacity-75 truncate block">
                            {deviceInfo.type}
                          </span>
                        )}
                      </div>
                      {deviceInfo.unitSpan > 1 && (
                        <span className="text-[9px] bg-white/20 px-1 rounded font-bold">
                          {deviceInfo.unitSpan}U
                        </span>
                      )}
                    </div>
                  )}
                  
                  {deviceInfo && !deviceInfo.isFirst && (
                    <div className="flex items-center space-x-1 opacity-60">
                      <span className="text-[10px]">↑</span>
                      <span className="text-[9px] truncate">
                        {deviceInfo.name}
                      </span>
                    </div>
                  )}

                  {isEmpty && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                      Empty
                    </span>
                  )}
                </div>

                {/* Control buttons */}
                {showControls && deviceInfo && deviceInfo.isFirst && (
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editDevice(locationId, rack.id, deviceInfo);
                      }}
                      className="text-[10px] p-1 hover:bg-white/30 rounded transition-colors"
                      title="Edit device"
                    >
                      <Edit size={10} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog({
                          type: 'device',
                          item: deviceInfo,
                          locationId,
                          rackId: rack.id
                        });
                      }}
                      className="text-[10px] p-1 hover:bg-red-500/30 rounded transition-colors"
                      title="Delete device"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Add Device Button */}
        {showControls && (
          <div className="mt-3 flex justify-center space-x-2">
            <Button
              size="sm"
              onClick={() => addDevice(locationId, rack.id)}
              className="text-xs"
            >
              <Plus size={14} />
              Add Device
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="text-xs"
            >
              <Upload size={14} />
              Bulk Import
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Device types per requirements - Updated with Router and ISP Equipment
  const deviceTypes = [
    { value: 'ups', label: 'UPS', icon: <Zap size={16} /> },
    { value: 'pdu', label: 'PDU', icon: <Zap size={16} /> },
    { value: 'switch', label: 'Switch', icon: <Wifi size={16} /> },
    { value: 'router', label: 'Router', icon: <Wifi size={16} /> },
    { value: 'isp-equipment', label: 'ISP Equipment', icon: <Wifi size={16} /> },
    { value: 'top-level', label: 'Top Level', icon: <Server size={16} /> },
    { value: 'sd-wan', label: 'SD WAN', icon: <Wifi size={16} /> },
    { value: 'camera-server', label: 'Camera Server', icon: <Server size={16} /> },
    { value: 'test-pc', label: 'Test PC', icon: <Monitor size={16} /> },
    { value: 'patch-panel', label: 'Patch Panel', icon: <Package size={16} /> }
  ];

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Data Closet Management Progress" icon={<Package className="text-purple-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Overall Data Closet Documentation"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <MapPin className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(dataClosetData.locations || []).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Locations</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Package className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(dataClosetData.locations || []).reduce((sum, loc) => sum + (loc.racks || []).length, 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Racks</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Server className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(dataClosetData.locations || []).reduce((sum, loc) => 
                  sum + (loc.racks || []).reduce((rackSum, rack) => rackSum + (rack.devices || []).length, 0), 0
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Devices</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Thermometer className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {dataClosetData.environmental?.temperature || '--'}°F
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Camera className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(dataClosetData.photos || []).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Photos</p>
            </div>
          </div>
        </div>
      </Section>

      <Section 
        title="Data Closet & Rack Management" 
        icon={<Package className="text-green-500" />}
        helpText="Manage server racks, track devices, monitor environmental conditions, and document with photos."
      >
        <div className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Data Closet Management
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setShowEmailModal(true)} 
                variant="outline" 
                size="sm"
              >
                <Mail size={16} />
                Email Report
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
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
          {activeTab === 'grading' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Data Closet Quality Assessment
                  </h3>
                </div>
                {/* Match Summary grading header percentage block */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grading Score:</span>
                    <div className="flex items-center">
                      <span className={`text-2xl font-bold ${
                        dataClosetData.overallScore >= 80 ? 'text-green-600' :
                        dataClosetData.overallScore >= 60 ? 'text-blue-600' :
                        dataClosetData.overallScore >= 40 ? 'text-yellow-600' :
                        dataClosetData.overallScore > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {Number.isFinite(dataClosetData.overallScore) ? dataClosetData.overallScore : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(dataClosetData.grading || []).map((item, index) => (
                  <div key={`${item.category}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {item.category}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Rate this aspect (1-5 scale)
                        </p>
                      </div>
                      <div>
                        <Select
                          value={typeof item.score === 'string' ? item.score : (item.score ? String(item.score) : '')}
                          onChange={(e) => updateGrading(index, 'score', e.target.value)}
                          aria-label={`Set score for ${item.category}`}
                          required
                        >
                          <option value="">Select Score</option>
                          <option value="5">5 - Excellent</option>
                          <option value="4">4 - Very Good</option>
                          <option value="3">3 - Good</option>
                          <option value="2">2 - Fair</option>
                          <option value="1">1 - Poor</option>
                        </Select>
                      </div>
                      <div>
                        <Input
                          multiline
                          value={item.comments}
                          onChange={(e) => updateGrading(index, 'comments', e.target.value)}
                          placeholder="Comments and observations..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Alert variant="info">
                <strong>Grading Guidelines (1-5 Scale):</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li><strong>1 - Poor:</strong> Significant issues, requires urgent attention</li>
                  <li><strong>2 - Fair:</strong> Below standards, needs improvement</li>
                  <li><strong>3 - Good:</strong> Meets basic requirements, minor improvements needed</li>
                  <li><strong>4 - Very Good:</strong> Above average, minor enhancements possible</li>
                  <li><strong>5 - Excellent:</strong> Outstanding, exceeds expectations</li>
                </ul>
                <div className="mt-4">
                  <strong>Categories:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li><strong>Data Closet Appearance:</strong> Overall cleanliness, organization, and professional appearance</li>
                    <li><strong>Cable Management:</strong> Organization of cables, use of cable trays, minimal tangling</li>
                    <li><strong>Labeling:</strong> Clear labeling of racks, devices, cables, and connections</li>
                    <li><strong>Temperature:</strong> Proper cooling, temperature monitoring, hot/cold aisle management</li>
                    <li><strong>Physical Security:</strong> Access controls, locked doors, security cameras</li>
                    <li><strong>Device Health:</strong> Equipment condition, maintenance logs, operational status</li>
                  </ul>
                </div>
              </Alert>
            </div>
          )}
          {activeTab === 'locations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Data Closet Locations ({(dataClosetData.locations || []).length})
                </h3>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setImportType('devices');
                      exportToCSV();
                    }}
                  >
                    <FileSpreadsheet size={14} />
                    Export Devices
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setImportType('racks');
                      exportToCSV();
                    }}
                  >
                    <FileSpreadsheet size={14} />
                    Export Racks
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload size={14} />
                    Bulk Import
                  </Button>
                  <Button onClick={createLocation}>
                    <Plus size={16} />
                    Add Location
                  </Button>
                </div>
              </div>

              {(dataClosetData.locations || []).length > 0 ? (
                <div className="space-y-8">
                  {(dataClosetData.locations || []).map(location => (
                    <div key={location.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
                      {/* Location Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <MapPin className="text-blue-500" size={20} />
                            <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                              {location.name}
                            </h4>
                          </div>
                          {location.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 ml-8">
                              {location.description}
                            </p>
                          )}
                          <div className="ml-8 mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>{(location.racks || []).length} racks</span>
                            <span>
                              {(location.racks || []).reduce((sum, rack) => sum + (rack.devices || []).length, 0)} devices
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => createRack(location.id)}
                          >
                            <Plus size={14} />
                            Add Rack
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLocation(location)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setShowDeleteDialog({
                              type: 'location',
                              item: location
                            })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Racks Grid */}
                      {(location.racks || []).length > 0 ? (
                        <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                          {(location.racks || []).map(rack => (
                            <div key={rack.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                              {/* Rack Header */}
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {rack.name}
                                  </h5>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {rack.height}U • {(rack.devices || []).length} devices
                                  </p>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => setSelectedRack({ ...rack, locationId: location.id })}
                                  >
                                    <Eye size={12} />
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => setEditingRack({ ...rack, locationId: location.id })}
                                  >
                                    <Edit size={12} />
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="danger"
                                    onClick={() => setShowDeleteDialog({
                                      type: 'rack',
                                      item: rack,
                                      locationId: location.id
                                    })}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Rack Visualization */}
                              {renderRackVisualization(rack, location.id, true)}
                            </div>
                          ))}
                        </div>
                        {/* Non-racked devices in this location */}
                        {(() => {
                          const nonRackedDevices = (location.racks || []).flatMap(rack => 
                            (rack.devices || []).filter(device => device.isNotRacked)
                          );
                          return nonRackedDevices.length > 0 ? (
                            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                              <h5 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200 flex items-center">
                                <Package size={16} className="mr-2" />
                                Non-Racked Devices ({nonRackedDevices.length})
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {nonRackedDevices.map(device => (
                                  <div 
                                    key={device.id} 
                                    className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-300 dark:border-yellow-700 text-sm cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                                    onClick={() => setSelectedDevice(device)}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-gray-900 dark:text-gray-100">{device.name}</span>
                                      <div className="flex space-x-1">
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDevice(device);
                                          }}
                                          title="View Details"
                                        >
                                          <Eye size={10} />
                                        </Button>
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const rack = (location.racks || []).find(r => r.devices?.some(d => d.id === device.id));
                                            if (rack) editDevice(location.id, rack.id, device);
                                          }}
                                        >
                                          <Edit size={10} />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div>Type: {device.type || 'Unknown'}</div>
                                      {device.model && <div>Model: {device.model}</div>}
                                      <div>Status: <span className={`${device.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{device.status}</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* Outlet mapping for PDUs and UPS in this location */}
                        {(() => {
                          const powerDevices = (location.racks || []).flatMap(rack => 
                            (rack.devices || []).filter(device => ['pdu', 'ups'].includes(device.type))
                          );
                          return powerDevices.length > 0 ? (
                            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                              <h5 className="font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center">
                                <Zap size={16} className="mr-2" />
                                Power Device Outlet Mapping
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {powerDevices.map(powerDevice => {
                                  // Find all devices connected to this power device
                                  const connectedDevices = (location.racks || []).flatMap(rack =>
                                    (rack.devices || []).filter(device =>
                                      (device.pduPorts || []).some(port => port.pduId === String(powerDevice.id))
                                    ).map(device => ({
                                      ...device,
                                      outlets: (device.pduPorts || []).filter(port => port.pduId === String(powerDevice.id))
                                    }))
                                  );

                                  return (
                                    <div key={powerDevice.id} className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-300 dark:border-blue-700">
                                      <div className="flex items-center justify-between mb-3">
                                        <span 
                                          className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                          onClick={() => setSelectedDevice(powerDevice)}
                                          title="Click to view device details"
                                        >
                                          {powerDevice.name} ({powerDevice.type?.toUpperCase()})
                                        </span>
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {connectedDevices.length} connected
                                          </span>
                                          <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => setSelectedDevice(powerDevice)}
                                            title="View Details"
                                          >
                                            <Eye size={10} />
                                          </Button>
                                        </div>
                                      </div>
                                      {connectedDevices.length > 0 ? (
                                        <div className="space-y-2">
                                          {connectedDevices.map(device => 
                                            device.outlets.map((outlet, idx) => (
                                              <div key={`${device.id}-${idx}`} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{device.name}</span>
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                    Outlet {outlet.outlet}
                                                  </span>
                                                  <span className={`text-xs px-2 py-1 rounded ${
                                                    device.status === 'active' 
                                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                  }`}>
                                                    {device.status}
                                                  </span>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                          No devices connected to this {powerDevice.type}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null;
                        })()}
                        </>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Package className="mx-auto mb-3 opacity-50 text-gray-400" size={32} />
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">No racks in this location</p>
                          <Button size="sm" onClick={() => createRack(location.id)}>
                            <Plus size={14} />
                            Add First Rack
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin size={48} className="mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No locations configured</p>
                  <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
                    Create your first location to organize your racks and devices
                  </p>
                  <Button onClick={createLocation}>
                    <Plus size={16} />
                    Create First Location
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'environmental' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Environmental Monitoring
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Temperature (°F)"
                  type="number"
                  value={dataClosetData.environmental?.temperature || ''}
                  onChange={(e) => updateEnvironmental('temperature', e.target.value)}
                  placeholder="72"
                />
                <Input
                  label="Humidity (%)"
                  type="number"
                  value={dataClosetData.environmental?.humidity || ''}
                  onChange={(e) => updateEnvironmental('humidity', e.target.value)}
                  placeholder="45"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Airflow Status"
                  value={dataClosetData.environmental?.airflow || ''}
                  onChange={(e) => updateEnvironmental('airflow', e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </Select>
                <Select
                  label="Power Status"
                  value={dataClosetData.environmental?.powerStatus || ''}
                  onChange={(e) => updateEnvironmental('powerStatus', e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="stable">Stable</option>
                  <option value="fluctuating">Fluctuating</option>
                  <option value="issues">Issues Detected</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>

              <Alert variant="info">
                <strong>Environmental Guidelines:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Temperature: 68-72°F (20-22°C) optimal</li>
                  <li>Humidity: 40-60% relative humidity</li>
                  <li>Ensure proper airflow and ventilation</li>
                  <li>Monitor power quality and UPS status</li>
                </ul>
              </Alert>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Data Closet Photos
                </h3>
                <Button onClick={() => setViewingPhotos(true)} variant="outline">
                  <Eye size={16} />
                  View Gallery
                </Button>
              </div>
              
              <PhotoUpload
                photos={dataClosetData.photos || []}
                onPhotosChange={(photos) => updateDataClosetData('photos', photos)}
                maxPhotos={20}
                label="Data Closet Documentation Photos"
              />

              <Alert variant="info">
                <strong>Photo Documentation Tips:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Take overview shots of the entire data closet</li>
                  <li>Capture individual rack front and back views</li>
                  <li>Document cable management and organization</li>
                  <li>Photo any issues or areas needing attention</li>
                  <li>Include environmental monitoring equipment</li>
                </ul>
              </Alert>
            </div>
          )}
        </div>
      </Section>

      {/* Rack Detail Modal */}
      <Modal
        isOpen={!!selectedRack}
        onClose={() => setSelectedRack(null)}
        title={`Rack Details: ${selectedRack?.name}`}
        size="xl"
      >
        {selectedRack && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-4">Rack Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedRack.name}</div>
                  <div><strong>Height:</strong> {selectedRack.height}U</div>
                  <div><strong>Devices:</strong> {(selectedRack.devices || []).length}</div>
                  <div><strong>Power:</strong> {selectedRack.power || 'Not specified'}</div>
                  <div><strong>Last Updated:</strong> {selectedRack.lastUpdated}</div>
                </div>
                {selectedRack.notes && (
                  <div className="mt-4">
                    <strong>Notes:</strong>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedRack.notes}</p>
                  </div>
                )}
                
                {/* Device List */}
                {(selectedRack.devices || []).length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-semibold mb-3">Installed Devices</h5>
                    <div className="space-y-2">
                      {(selectedRack.devices || []).map(device => (
                        <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                          <div>
                            <span className="font-medium">{device.name}</span>
                            <span className="text-gray-500 ml-2">({device.type || 'Unknown'})</span>
                          </div>
                          <div className="text-right">
                            <div>U{device.startUnit}{device.unitSpan > 1 ? `-${device.startUnit + device.unitSpan - 1}` : ''}</div>
                            <div className="text-xs text-gray-500">{device.unitSpan}U</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-4">Rack Visualization</h4>
                {renderRackVisualization(selectedRack, selectedRack.locationId, false)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        title={editingLocation?.id ? 'Edit Location' : 'Add Location'}
        size="lg"
      >
        {editingLocation && (
          <div className="space-y-4">
            <Input
              label="Location Name *"
              value={editingLocation.name}
              onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
              placeholder="Server Room A, Data Closet 1st Floor"
            />
            <Input
              label="Description"
              multiline
              value={editingLocation.description}
              onChange={(e) => setEditingLocation({ ...editingLocation, description: e.target.value })}
              placeholder="Describe this location..."
              rows={3}
              spellCheck={true}
            />
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setEditingLocation(null)}>Cancel</Button>
              <Button onClick={() => {
                if (editingLocation.id) {
                  updateLocation(editingLocation.id, editingLocation);
                } else {
                  const newLocation = { ...editingLocation, id: Date.now(), racks: [] };
                  const updatedLocations = [...(dataClosetData.locations || []), newLocation];
                  updateDataClosetData('locations', updatedLocations);
                }
                setEditingLocation(null);
                addNotification({ type: 'success', message: 'Location saved successfully', duration: 3000 });
              }}>
                Save Location
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Rack Modal */}
      <Modal
        isOpen={!!editingRack}
        onClose={() => setEditingRack(null)}
        title={editingRack?.id ? 'Edit Rack' : 'Add Rack'}
        size="lg"
      >
        {editingRack && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Rack Name *"
                value={editingRack.name}
                onChange={(e) => setEditingRack({ ...editingRack, name: e.target.value })}
                placeholder="Rack-1"
                spellCheck={false}
              />
              <Input
                label="Height (U)"
                type="number"
                value={editingRack.height}
                onChange={(e) => setEditingRack({ ...editingRack, height: parseInt(e.target.value) || 42 })}
                placeholder="42"
              />
            </div>
            <Input
              label="Power (kW)"
              value={editingRack.power}
              onChange={(e) => setEditingRack({ ...editingRack, power: e.target.value })}
              placeholder="5.5 kW"
              spellCheck={false}
            />
            <Input
              label="Notes"
              multiline
              value={editingRack.notes}
              onChange={(e) => setEditingRack({ ...editingRack, notes: e.target.value })}
              placeholder="Additional notes about this rack..."
              rows={3}
              spellCheck={true}
            />
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setEditingRack(null)}>Cancel</Button>
              <Button onClick={() => {
                if (editingRack.id) {
                  updateRack(editingRack.locationId, editingRack.id, editingRack);
                }
                setEditingRack(null);
                addNotification({ type: 'success', message: 'Rack saved successfully', duration: 3000 });
              }}>
                Save Rack
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Device Modal */}
      <Modal
        isOpen={!!editingDevice}
        onClose={() => setEditingDevice(null)}
        title={editingDevice?.isNew ? 'Add Device' : 'Edit Device'}
        size="xl"
      >
        {editingDevice && (
          <div className="space-y-4">
            {/* Basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={editingDevice.type === 'patch-panel' ? 'Panel Name *' : 'Device Name *'}
                value={editingDevice.name}
                onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                placeholder={editingDevice.type === 'patch-panel' ? 'Patch Panel A' : 'Server-01, Switch-Main'}
                spellCheck={false}
              />
              <Select
                label="Device Type"
                value={editingDevice.type}
                onChange={(e) => setEditingDevice({ ...editingDevice, type: e.target.value })}
              >
                <option value="">Select Type</option>
                {deviceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>

            {editingDevice.type !== 'patch-panel' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Model"
                  value={editingDevice.model}
                  onChange={(e) => setEditingDevice({ ...editingDevice, model: e.target.value })}
                  placeholder="Dell PowerEdge R730"
                  spellCheck={false}
                />
                <Input
                  label="Serial Number"
                  value={editingDevice.serialNumber}
                  onChange={(e) => setEditingDevice({ ...editingDevice, serialNumber: e.target.value })}
                  placeholder="ABC123DEF456"
                  spellCheck={false}
                />
                <Input
                  label="Asset Tag"
                  value={editingDevice.assetTag}
                  onChange={(e) => setEditingDevice({ ...editingDevice, assetTag: e.target.value })}
                  placeholder="IT-2024-001"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Device not racked checkbox */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!!editingDevice.isNotRacked}
                  onChange={(e) => setEditingDevice({ ...editingDevice, isNotRacked: e.target.checked })}
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Device is not racked</span>
              </label>
              {editingDevice.isNotRacked && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  This device will be tracked but not assigned to a specific rack unit.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Start Unit (U)"
                type="number"
                min="1"
                max="42"
                value={editingDevice.startUnit}
                onChange={(e) => setEditingDevice({ ...editingDevice, startUnit: e.target.value })}
                placeholder="1"
                disabled={editingDevice.isNotRacked}
              />
              <Input
                label="Unit Span"
                type="number"
                min="1"
                max="10"
                value={editingDevice.unitSpan}
                onChange={(e) => setEditingDevice({ ...editingDevice, unitSpan: e.target.value })}
                placeholder="1"
                disabled={editingDevice.isNotRacked}
              />
              <Select
                label="Status"
                value={editingDevice.status}
                onChange={(e) => setEditingDevice({ ...editingDevice, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </Select>
            </div>

            {/* Horizontal positioning for side-by-side placement */}
            {!editingDevice.isNotRacked && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Horizontal Positioning (Side-by-Side)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Device Width"
                    value={editingDevice.widthFraction}
                    onChange={(e) => setEditingDevice({ ...editingDevice, widthFraction: parseFloat(e.target.value) })}
                  >
                    <option value="1">Full Width (1/1)</option>
                    <option value="0.5">Half Width (1/2)</option>
                    <option value="0.33">Third Width (1/3)</option>
                  </Select>
                  <Select
                    label="Position"
                    value={editingDevice.horizontalPosition}
                    onChange={(e) => setEditingDevice({ ...editingDevice, horizontalPosition: e.target.value })}
                    disabled={parseFloat(editingDevice.widthFraction) >= 1}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </Select>
                </div>
                <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> This allows multiple devices to be placed side-by-side in the same rack units. 
                  Other devices can occupy the remaining space in the same units.
                </div>
              </div>
            )}

            {/* Power connections based on device type */}
            {/* PDU - shows "Add UPS Outlet" */}
            {editingDevice.type === 'pdu' && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">UPS Power Connections</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = [...(editingDevice.pduPorts || [])];
                      next.push({ pduId: '', outlet: '', type: 'ups' });
                      setEditingDevice({ ...editingDevice, pduPorts: next });
                    }}
                  >
                    Add UPS Outlet
                  </Button>
                </div>
                {(editingDevice.pduPorts || []).length === 0 && (
                  <Alert variant="info">Add UPS outlets that power this PDU.</Alert>
                )}
                {(editingDevice.pduPorts || []).map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Select
                      label="UPS"
                      value={p.pduId}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], pduId: e.target.value, type: 'ups' };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      <option value="">Select UPS</option>
                      {(dataClosetData.locations || []).flatMap(loc => (loc.racks || []).flatMap(rack => rack.devices || []))
                        .filter(d => d.type === 'ups')
                        .map(d => (
                          <option key={d.id} value={String(d.id)}>{d.name || `UPS ${d.id}`}</option>
                        ))}
                    </Select>
                    <Input
                      label="Outlet/Port"
                      value={p.outlet}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], outlet: e.target.value };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                      placeholder="e.g., A5 or Left-12"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const next = [...(editingDevice.pduPorts || [])];
                        next.splice(idx, 1);
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Test PC - allows selection between UPS or PDU */}
            {editingDevice.type === 'test-pc' && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Power Connections</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = [...(editingDevice.pduPorts || [])];
                      next.push({ pduId: '', outlet: '', type: 'pdu' });
                      setEditingDevice({ ...editingDevice, pduPorts: next });
                    }}
                  >
                    Add Power Connection
                  </Button>
                </div>
                {(editingDevice.pduPorts || []).length === 0 && (
                  <Alert variant="info">Add power connections (UPS or PDU outlets).</Alert>
                )}
                {(editingDevice.pduPorts || []).map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <Select
                      label="Power Type"
                      value={p.type || 'pdu'}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], type: e.target.value, pduId: '' };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      <option value="pdu">PDU</option>
                      <option value="ups">UPS</option>
                    </Select>
                    <Select
                      label={p.type === 'ups' ? 'UPS' : 'PDU'}
                      value={p.pduId}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], pduId: e.target.value };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      <option value="">Select {p.type === 'ups' ? 'UPS' : 'PDU'}</option>
                      {(dataClosetData.locations || []).flatMap(loc => (loc.racks || []).flatMap(rack => rack.devices || []))
                        .filter(d => d.type === (p.type || 'pdu'))
                        .map(d => (
                          <option key={d.id} value={String(d.id)}>{d.name || `${(p.type || 'pdu').toUpperCase()} ${d.id}`}</option>
                        ))}
                    </Select>
                    <Input
                      label="Outlet/Port"
                      value={p.outlet}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], outlet: e.target.value };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                      placeholder="e.g., A5 or Left-12"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const next = [...(editingDevice.pduPorts || [])];
                        next.splice(idx, 1);
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Other devices - standard PDU connections (but NOT UPS) */}
            {(['switch','top-level','sd-wan','camera-server'].includes(editingDevice.type)) && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    PDU Power Connections
                    {editingDevice.type === 'switch' && (
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                        (up to 3 connections)
                      </span>
                    )}
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={editingDevice.type === 'switch' && (editingDevice.pduPorts || []).length >= 3}
                    onClick={() => {
                      const next = [...(editingDevice.pduPorts || [])];
                      next.push({ pduId: '', outlet: '', type: 'pdu' });
                      setEditingDevice({ ...editingDevice, pduPorts: next });
                    }}
                  >
                    Add PDU Port
                    {editingDevice.type === 'switch' && ` (${(editingDevice.pduPorts || []).length}/3)`}
                  </Button>
                </div>
                {(editingDevice.pduPorts || []).length === 0 && (
                  <Alert variant="info">Add PDU outlets this device is plugged into.</Alert>
                )}
                {(editingDevice.pduPorts || []).map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Select
                      label="PDU"
                      value={p.pduId}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], pduId: e.target.value, type: 'pdu' };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      <option value="">Select PDU</option>
                      {(dataClosetData.locations || []).flatMap(loc => (loc.racks || []).flatMap(rack => rack.devices || []))
                        .filter(d => d.type === 'pdu')
                        .map(d => (
                          <option key={d.id} value={String(d.id)}>{d.name || `PDU ${d.id}`}</option>
                        ))}
                    </Select>
                    <Input
                      label="Outlet/Port"
                      value={p.outlet}
                      onChange={(e) => {
                        const next = [...editingDevice.pduPorts];
                        next[idx] = { ...next[idx], outlet: e.target.value };
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                      placeholder="e.g., A5 or Left-12"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const next = [...(editingDevice.pduPorts || [])];
                        next.splice(idx, 1);
                        setEditingDevice({ ...editingDevice, pduPorts: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Conditional: NIC card section for UPS, PDU, Camera Server, Test PC */}
            {(['ups','pdu','camera-server','test-pc'].includes(editingDevice.type)) && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!editingDevice.hasNicCard}
                    onChange={(e) => setEditingDevice({ ...editingDevice, hasNicCard: e.target.checked })}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">NIC Card Installed</span>
                </label>
                {editingDevice.hasNicCard && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Switch"
                        value={editingDevice.nicSwitch || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, nicSwitch: e.target.value })}
                        placeholder="Switch name or ID"
                        spellCheck={false}
                      />
                      <Input
                        label="Port Number"
                        value={editingDevice.nicPort || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, nicPort: e.target.value })}
                        placeholder="e.g., 12"
                        spellCheck={false}
                      />
                      <Input
                        label="Last Test Date"
                        type="date"
                        value={editingDevice.lastTestDate || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, lastTestDate: e.target.value })}
                      />
                    </div>
                    <div className="md:w-1/3">
                      <Input
                        label="MAC Address"
                        value={editingDevice.macAddress || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, macAddress: e.target.value.toUpperCase().replace(/[^0-9A-F:]/g, '') })}
                        placeholder="00:1B:44:11:3A:B7"
                        spellCheck={false}
                        className="font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter MAC address for network identification</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Input
              label="Notes"
              multiline
              value={editingDevice.notes}
              onChange={(e) => setEditingDevice({ ...editingDevice, notes: e.target.value })}
              placeholder="Additional notes about this device..."
              rows={3}
              spellCheck={true}
            />
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setEditingDevice(null)}>Cancel</Button>
              <Button onClick={saveDevice}>Save Device</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Data Closet Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {EMAIL_RECIPIENTS.default.join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Overall Score: {dataClosetData.overallScore}%</div>
              <div>Locations: {(dataClosetData.locations || []).length}</div>
              <div>Racks: {(dataClosetData.locations || []).reduce((sum, loc) => sum + (loc.racks || []).length, 0)}</div>
              <div>Devices: {(dataClosetData.locations || []).reduce((sum, loc) => 
                sum + (loc.racks || []).reduce((rackSum, rack) => rackSum + (rack.devices || []).length, 0), 0
              )}</div>
              <div>Environmental Monitoring: {dataClosetData.environmental?.temperature ? 'Active' : 'Not configured'}</div>
              <div>Photos: {(dataClosetData.photos || []).length}</div>
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

      {/* Import/Paste Data Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportData('');
        }}
        title="Bulk Import Data"
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Import Type
              </label>
              <Select
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
              >
                <option value="devices">Devices</option>
                <option value="racks">Racks</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Import from File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload size={16} />
                Choose File
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste or Type Data
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={importType === 'devices' 
                ? `Paste device data (CSV format or one per line):
Server-001,server,Dell PowerEdge R730,ABC123,Server Room,Rack-1,1,2,active,Main server
Switch-001,switch,Cisco Catalyst,DEF456,Server Room,Rack-1,3,1,active,Network switch

Or JSON format:
{"name":"Server-001","type":"server","model":"Dell PowerEdge R730","serialNumber":"ABC123","locationName":"Server Room","rackName":"Rack-1","startUnit":1,"unitSpan":2,"status":"active","notes":"Main server"}`
                : `Paste rack data (CSV format or one per line):
Rack-001,Server Room,42,5.5kW,Main server rack
Rack-002,Network Closet,24,3kW,Network equipment

Or JSON format:
{"name":"Rack-001","locationName":"Server Room","height":42,"power":"5.5kW","notes":"Main server rack"}`
              }
              rows={12}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
          </div>

          <Alert variant="info">
            <strong>Supported Formats:</strong>
            <div className="mt-2 space-y-2">
              {importType === 'devices' ? (
                <>
                  <div><strong>CSV:</strong> Name, Type, Model, Serial, Location, Rack, StartUnit, UnitSpan, Status, Notes</div>
                  <div><strong>Tab-separated:</strong> Same fields separated by tabs</div>
                  <div><strong>JSON:</strong> One JSON object per line with fields: name, type, model, serialNumber, locationName, rackName, startUnit, unitSpan, status, notes</div>
                </>
              ) : (
                <>
                  <div><strong>CSV:</strong> RackName, Location, Height, Power, Notes</div>
                  <div><strong>Tab-separated:</strong> Same fields separated by tabs</div>
                  <div><strong>JSON:</strong> One JSON object per line with fields: name, locationName, height, power, notes</div>
                </>
              )}
            </div>
            <div className="mt-3">
              <p><strong>Notes:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Empty lines are ignored</li>
                <li>Missing locations/racks will be created automatically</li>
                <li>Device types: ups, pdu, switch, router, isp-equipment, top-level, sd-wan, camera-server, test-pc, patch-panel</li>
                <li>Device status: active, inactive, maintenance, retired</li>
              </ul>
            </div>
          </Alert>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setImportData('');
                }}
              >
                <Trash2 size={16} />
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (importType === 'devices') {
                    setImportData(`Server-001,server,Dell PowerEdge R730,ABC123,Server Room,Rack-1,1,2,active,Main application server
Switch-001,switch,Cisco Catalyst 2960,DEF456,Server Room,Rack-1,3,1,active,Main network switch
Firewall-001,firewall,SonicWall TZ400,GHI789,Server Room,Rack-1,4,1,active,Network security`);
                  } else {
                    setImportData(`Rack-001,Server Room,42,5.5kW,Main server rack
Rack-002,Network Closet,24,3kW,Network equipment rack
Rack-003,Storage Room,18,2kW,Storage array rack`);
                  }
                }}
              >
                <Copy size={16} />
                Load Example
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={processImportData}
                disabled={!importData.trim()}
              >
                <Upload size={16} />
                Import Data
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <Modal
          isOpen={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          title={`Device Details: ${selectedDevice.name}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Basic Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-sm font-medium">{selectedDevice.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="text-sm font-medium capitalize">{selectedDevice.type || 'Unknown'}</span>
                  </div>
                  {selectedDevice.model && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="text-sm font-medium">{selectedDevice.model}</span>
                    </div>
                  )}
                  {selectedDevice.serialNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Serial Number:</span>
                      <span className="text-sm font-medium">{selectedDevice.serialNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`text-sm font-medium capitalize ${selectedDevice.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedDevice.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Physical Location</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Is Racked:</span>
                    <span className="text-sm font-medium">{selectedDevice.isNotRacked ? 'No' : 'Yes'}</span>
                  </div>
                  {!selectedDevice.isNotRacked && selectedDevice.startUnit && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Rack Position:</span>
                      <span className="text-sm font-medium">Units {selectedDevice.startUnit}-{selectedDevice.startUnit + (selectedDevice.unitSpan || 1) - 1}</span>
                    </div>
                  )}
                  {selectedDevice.unitSpan && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Unit Span:</span>
                      <span className="text-sm font-medium">{selectedDevice.unitSpan}U</span>
                    </div>
                  )}
                  {selectedDevice.lastTestDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Last Tested:</span>
                      <span className="text-sm font-medium">{selectedDevice.lastTestDate}</span>
                    </div>
                  )}
                  {selectedDevice.widthFraction && selectedDevice.widthFraction < 1 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Positioning:</span>
                      <span className="text-sm font-medium">
                        {selectedDevice.widthFraction === 0.5 ? 'Half Width' : 
                         selectedDevice.widthFraction === 0.33 ? 'Third Width' : 
                         `${Math.round(selectedDevice.widthFraction * 100)}% Width`}
                        {' - '}
                        {selectedDevice.horizontalPosition === 'left' ? 'Left Side' : 
                         selectedDevice.horizontalPosition === 'center' ? 'Center' : 
                         'Right Side'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Power Connections */}
            {selectedDevice.pduPorts && selectedDevice.pduPorts.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Power Connections</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="space-y-2">
                    {selectedDevice.pduPorts.map((port, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {port.type?.toUpperCase()} Connection:
                        </span>
                        <span className="text-sm font-medium">
                          {port.pduId ? `Device ID: ${port.pduId}` : 'Not specified'} - Outlet {port.outlet || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Network Connections */}
            {selectedDevice.hasNicCard && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Network Connection</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Has NIC Card:</span>
                      <span className="text-sm font-medium">Yes</span>
                    </div>
                    {selectedDevice.nicSwitch && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Connected Switch:</span>
                        <span className="text-sm font-medium">{selectedDevice.nicSwitch}</span>
                      </div>
                    )}
                    {selectedDevice.nicPort && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Switch Port:</span>
                        <span className="text-sm font-medium">{selectedDevice.nicPort}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Power Mapping - Show devices connected to this PDU/UPS */}
            {(selectedDevice.type === 'pdu' || selectedDevice.type === 'ups') && (() => {
              // Find all devices connected to this power device
              const connectedDevices = (dataClosetData.locations || []).flatMap(location =>
                (location.racks || []).flatMap(rack =>
                  (rack.devices || []).filter(device =>
                    (device.pduPorts || []).some(port => 
                      String(port.pduId) === String(selectedDevice.id)
                    )
                  ).map(device => ({
                    ...device,
                    connections: (device.pduPorts || []).filter(port => 
                      String(port.pduId) === String(selectedDevice.id)
                    ),
                    locationName: location.name,
                    rackName: rack.name
                  }))
                )
              );

              // Create port usage map
              const portUsageMap = {};
              connectedDevices.forEach(device => {
                device.connections.forEach(conn => {
                  if (conn.outlet) {
                    if (!portUsageMap[conn.outlet]) {
                      portUsageMap[conn.outlet] = [];
                    }
                    portUsageMap[conn.outlet].push({
                      deviceName: device.name,
                      deviceType: device.type,
                      location: device.locationName,
                      rack: device.rackName
                    });
                  }
                });
              });

              return (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Power Distribution Mapping ({connectedDevices.length} devices connected)
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {selectedDevice.ports && selectedDevice.ports.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {selectedDevice.ports.map((port, idx) => {
                          const portNumber = port.portNumber || idx + 1;
                          const connections = portUsageMap[String(portNumber)] || [];
                          const isConnected = connections.length > 0;
                          
                          return (
                            <div 
                              key={port.id || idx} 
                              className={`p-2 rounded text-xs border ${
                                isConnected 
                                  ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200' 
                                  : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300'
                              }`}
                              title={isConnected ? connections.map(c => c.deviceName).join(', ') : 'Available'}
                            >
                              <div className="font-medium">Port {portNumber}</div>
                              {isConnected && (
                                <div className="mt-1 space-y-1">
                                  {connections.map((conn, cidx) => (
                                    <div key={cidx} className="text-xs truncate">
                                      {conn.deviceName}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {!isConnected && (
                                <div className="text-xs mt-1 opacity-60">Available</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        No ports configured. {selectedDevice.type?.toUpperCase()} should have {getDefaultPortCount(selectedDevice.type)} ports.
                      </div>
                    )}

                    {connectedDevices.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Connected Devices Detail:</h5>
                        <div className="space-y-2">
                          {connectedDevices.map((device, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-gray-800 rounded">
                              <div>
                                <span className="font-medium">{device.name}</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  ({device.type})
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {device.connections.map(c => `Port ${c.outlet}`).join(', ')}
                                </span>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  {device.locationName} / {device.rackName}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            {selectedDevice.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Notes</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedDevice.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Device ID: {selectedDevice.id}</span>
                <span>Last Updated: {selectedDevice.lastUpdated || 'Never'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  // Find the location and rack for this device to enable editing
                  const location = (dataClosetData.locations || []).find(loc => 
                    loc.racks?.some(rack => rack.devices?.some(device => device.id === selectedDevice.id))
                  );
                  if (location) {
                    const rack = location.racks.find(r => r.devices?.some(d => d.id === selectedDevice.id));
                    if (rack) {
                      editDevice(location.id, rack.id, selectedDevice);
                      setSelectedDevice(null);
                    }
                  }
                }}
              >
                <Edit size={16} />
                Edit Device
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => {
          if (showDeleteDialog.type === 'location') {
            deleteLocation(showDeleteDialog.item.id);
          } else if (showDeleteDialog.type === 'rack') {
            deleteRack(showDeleteDialog.locationId, showDeleteDialog.item.id);
          } else if (showDeleteDialog.type === 'device') {
            deleteDevice(showDeleteDialog.locationId, showDeleteDialog.rackId, showDeleteDialog.item.id);
          }
        }}
        title={`Delete ${showDeleteDialog?.type || 'Item'}`}
        message={`Are you sure you want to delete "${showDeleteDialog?.item?.name}"? This action cannot be undone.${
          showDeleteDialog?.type === 'location' ? ' All racks and devices in this location will also be deleted.' :
          showDeleteDialog?.type === 'rack' ? ' All devices in this rack will also be deleted.' : ''
        }`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Storage;