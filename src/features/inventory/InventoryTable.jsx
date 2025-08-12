import React, { useState, useCallback, useMemo } from 'react';
import { 
  Monitor, HardDrive, Phone, Headphones, Package, 
  Building2, Plus, Download, Mail, Trash2
} from 'lucide-react';
import { calc, calcAll, getSummaryTotals } from './calc.js';
import '../../styles/inventory.css';

// Default inventory items
const DEFAULT_ITEMS = [
  { name: 'PCs', icon: <Monitor size={16} /> },
  { name: 'Laptops', icon: <HardDrive size={16} /> },
  { name: 'Monitors', icon: <Monitor size={16} /> },
  { name: 'Webcams', icon: <Package size={16} /> },
  { name: 'Phones', icon: <Phone size={16} /> },
  { name: 'Headsets', icon: <Headphones size={16} /> },
  { name: 'Direct Connect', icon: <Package size={16} /> },
  { name: 'Workstations', icon: <Building2 size={16} /> },
  { name: 'Desk Chairs', icon: <Package size={16} /> },
  { name: 'Wireless Headsets', icon: <Headphones size={16} /> },
  { name: 'VPN Phone', icon: <Phone size={16} /> },
];

const InventoryTable = ({ data, onUpdate, onExportPDF }) => {
  // Convert legacy data format to new format
  const convertLegacyItem = (item, index) => {
    const baseItem = DEFAULT_ITEMS[index] || { name: item.description || 'Item', icon: <Package size={16} /> };
    
    return {
      id: item.id || `item-${index}`,
      name: item.description || baseItem.name || 'Item',
      icon: baseItem.icon,
      inUse: item.inUse || 0,
      training: item.otherUse?.training || 0,
      conference: item.otherUse?.conf || 0,
      gsm: item.otherUse?.gsm || 0,
      prospect: item.otherUse?.prospecting || 0,
      applicant: item.otherUse?.applicant || 0,
      visitor: item.otherUse?.visitor || 0,
      other: item.otherUse?.other || 0,
      floor: item.spares?.onFloor || 0,
      storage: item.spares?.inStorage || 0,
      broken: item.broken || 0,
    };
  };

  // Initialize items from data or defaults
  const initializeItems = () => {
    if (data?.items && Array.isArray(data.items)) {
      return data.items.map((item, index) => convertLegacyItem(item, index));
    }
    
    return DEFAULT_ITEMS.map((item, index) => ({
      id: `item-${index}`,
      name: item.name || 'Item',
      icon: item.icon,
      inUse: 0,
      training: 0,
      conference: 0,
      gsm: 0,
      prospect: 0,
      applicant: 0,
      visitor: 0,
      other: 0,
      floor: 0,
      storage: 0,
      broken: 0,
    }));
  };

  const [items, setItems] = useState(initializeItems());
  const [headerInfo, setHeaderInfo] = useState({
    location: data?.location || '',
    date: data?.date || new Date().toISOString().split('T')[0],
    recordedBy: data?.recordedBy || ''
  });
  
  const [footerFields, setFooterFields] = useState({
    threeMonitorSetups: data?.specialStations?.threeMonitorSetups || 0,
    prospectingStations: data?.specialStations?.prospectingStations || 0,
    visitorStations: data?.specialStations?.visitorStations || 0,
    applicantStations: data?.specialStations?.applicantStations || 0,
    eolComputers: data?.specialStations?.eolComputers || 0,
    officeHeadcount: data?.officeHeadcount || 0
  });

  // Calculate items with formulas
  const calculatedItems = useMemo(() => calcAll(items), [items]);
  const summaryTotals = useMemo(() => getSummaryTotals(calculatedItems), [calculatedItems]);

  // Update handler with debouncing
  const handleItemChange = useCallback((index, field, value) => {
    const numValue = Math.max(0, parseInt(value) || 0); // Clamp negatives to 0
    
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        [field]: numValue
      };
      return newItems;
    });
  }, []);

  // Convert back to legacy format for saving
  const saveLegacyFormat = useCallback(() => {
    const legacyItems = items.map((item, index) => ({
      description: item.name,
      inUse: item.inUse,
      otherUse: {
        training: item.training,
        conf: item.conference,
        gsm: item.gsm,
        prospecting: item.prospect,
        applicant: item.applicant,
        visitor: item.visitor,
        other: item.other
      },
      spares: {
        onFloor: item.floor,
        inStorage: item.storage
      },
      broken: item.broken
    }));

    const updatedData = {
      ...data,
      items: legacyItems,
      specialStations: {
        threeMonitorSetups: footerFields.threeMonitorSetups,
        prospectingStations: footerFields.prospectingStations,
        visitorStations: footerFields.visitorStations,
        applicantStations: footerFields.applicantStations,
        eolComputers: footerFields.eolComputers
      },
      officeHeadcount: footerFields.officeHeadcount,
      location: headerInfo.location,
      date: headerInfo.date,
      recordedBy: headerInfo.recordedBy,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    onUpdate(updatedData);
  }, [items, footerFields, headerInfo, data, onUpdate]);

  // Save on changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      saveLegacyFormat();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [items, footerFields, headerInfo, saveLegacyFormat]);

  // Add custom item
  const addCustomItem = () => {
    const newItem = {
      id: `custom-${Date.now()}`,
      name: 'New Item',
      icon: <Package size={16} />,
      inUse: 0,
      training: 0,
      conference: 0,
      gsm: 0,
      prospect: 0,
      applicant: 0,
      visitor: 0,
      other: 0,
      floor: 0,
      storage: 0,
      broken: 0,
    };
    setItems([...items, newItem]);
  };

  // Delete item
  const deleteItem = (index) => {
    if (index >= DEFAULT_ITEMS.length) { // Only allow deleting custom items
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      'Description',
      'In Use by Employees',
      'Training',
      'Conference Room',
      'GSM Office',
      'Prospecting Station',
      'Applicant Station',
      'Visitor Station',
      'Other',
      'Total Other Use',
      'Spares On the Floor',
      'Spares in Storage',
      'Spares (Auto Fills)',
      'Broken',
      'Total'
    ];

    const rows = calculatedItems.map(item => [
      item.name,
      item.inUse,
      item.training,
      item.conference,
      item.gsm,
      item.prospect,
      item.applicant,
      item.visitor,
      item.other,
      item.totalOther,
      item.floor,
      item.storage,
      item.sparesAuto,
      item.broken,
      item.total
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-inventory-${headerInfo.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Email report
  const emailReport = () => {
    const subject = `Office Inventory Report - ${headerInfo.location} - ${headerInfo.date}`;
    const body = `Office Inventory Report
Location: ${headerInfo.location}
Date: ${headerInfo.date}
Recorded By: ${headerInfo.recordedBy}

Summary:
- Total Items: ${summaryTotals.grandTotal}
- In Use: ${summaryTotals.totalInUse}
- Other Use: ${summaryTotals.totalOther}
- Spares: ${summaryTotals.totalSpares}
- Broken: ${summaryTotals.totalBroken}

Special Stations:
- Three Monitor Setups: ${footerFields.threeMonitorSetups}
- Prospecting Stations: ${footerFields.prospectingStations}
- Visitor Stations: ${footerFields.visitorStations}
- Applicant Stations: ${footerFields.applicantStations}
- EOL Computers: ${footerFields.eolComputers}
- Office Headcount: ${footerFields.officeHeadcount}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div id="inventory-print" className="inventory-container">
      {/* Header Band */}
      <div className="inventory-header-band">
        <div className="header-field">
          <label>Location:</label>
          <input
            type="text"
            value={headerInfo.location}
            onChange={(e) => setHeaderInfo({ ...headerInfo, location: e.target.value })}
            placeholder="Office Location"
          />
        </div>
        <div className="header-field">
          <label>Date:</label>
          <input
            type="date"
            value={headerInfo.date}
            onChange={(e) => setHeaderInfo({ ...headerInfo, date: e.target.value })}
          />
        </div>
        <div className="header-field">
          <label>Recorded By:</label>
          <input
            type="text"
            value={headerInfo.recordedBy}
            onChange={(e) => setHeaderInfo({ ...headerInfo, recordedBy: e.target.value })}
            placeholder="Your Name"
          />
        </div>
      </div>

      {/* Main Table */}
      <table className="inventory-table">
        <thead>
          {/* Row 1: Group Headers */}
          <tr className="header-groups">
            <th rowSpan={2} className="description-header">Description</th>
            <th rowSpan={2}>In Use by<br/>Employees</th>
            <th colSpan={7}>Other Use</th>
            <th rowSpan={2}>Total<br/>Other Use</th>
            <th colSpan={3}>Inventory Not in Use</th>
            <th rowSpan={2} className="total-header">Total</th>
          </tr>
          {/* Row 2: Sub-headers */}
          <tr className="header-columns">
            <th>Training</th>
            <th>Conference<br/>Room</th>
            <th>GSM<br/>Office</th>
            <th>Prospecting<br/>Station</th>
            <th>Applicant<br/>Station</th>
            <th>Visitor<br/>Station</th>
            <th>Other</th>
            <th>Spares On<br/>the Floor</th>
            <th>Spares in<br/>Storage</th>
            <th>Spares<br/>(Auto Fills)</th>
          </tr>
        </thead>
        <tbody>
          {calculatedItems.map((item, index) => (
            <tr key={item.id}>
              <td className="description-cell">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="icon-cell">{item.icon}</span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontWeight: 500, width: '100%' }}
                  />
                  {index >= DEFAULT_ITEMS.length && (
                    <button
                      onClick={() => deleteItem(index)}
                      style={{ padding: '2px', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.inUse}
                  onChange={(e) => handleItemChange(index, 'inUse', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.training}
                  onChange={(e) => handleItemChange(index, 'training', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.conference}
                  onChange={(e) => handleItemChange(index, 'conference', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.gsm}
                  onChange={(e) => handleItemChange(index, 'gsm', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.prospect}
                  onChange={(e) => handleItemChange(index, 'prospect', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.applicant}
                  onChange={(e) => handleItemChange(index, 'applicant', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.visitor}
                  onChange={(e) => handleItemChange(index, 'visitor', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.other}
                  onChange={(e) => handleItemChange(index, 'other', e.target.value)}
                />
              </td>
              <td className="total-other-cell computed-cell">{item.totalOther}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.floor}
                  onChange={(e) => handleItemChange(index, 'floor', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.storage}
                  onChange={(e) => handleItemChange(index, 'storage', e.target.value)}
                />
              </td>
              <td className="spares-auto-cell computed-cell">{item.sparesAuto}</td>
              <td className="broken-input">
                <input
                  type="number"
                  min="0"
                  value={item.broken}
                  onChange={(e) => handleItemChange(index, 'broken', e.target.value)}
                />
              </td>
              <td className="total-cell">{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Fields */}
      <div className="inventory-footer-fields">
        <div className="field-group">
          <label>Three Monitor Setups</label>
          <input
            type="number"
            min="0"
            value={footerFields.threeMonitorSetups}
            onChange={(e) => setFooterFields({ ...footerFields, threeMonitorSetups: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="field-group">
          <label>Prospecting Stations</label>
          <input
            type="number"
            min="0"
            value={footerFields.prospectingStations}
            onChange={(e) => setFooterFields({ ...footerFields, prospectingStations: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="field-group">
          <label>Visitor Stations</label>
          <input
            type="number"
            min="0"
            value={footerFields.visitorStations}
            onChange={(e) => setFooterFields({ ...footerFields, visitorStations: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="field-group">
          <label>Applicant Stations</label>
          <input
            type="number"
            min="0"
            value={footerFields.applicantStations}
            onChange={(e) => setFooterFields({ ...footerFields, applicantStations: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="field-group">
          <label>EOL Computers</label>
          <input
            type="number"
            min="0"
            value={footerFields.eolComputers}
            onChange={(e) => setFooterFields({ ...footerFields, eolComputers: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="field-group">
          <label>Office Headcount</label>
          <input
            type="number"
            min="0"
            value={footerFields.officeHeadcount}
            onChange={(e) => setFooterFields({ ...footerFields, officeHeadcount: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="inventory-summary">
        Inventory Items ({items.length})
      </div>

      {/* Actions */}
      <div className="inventory-actions">
        <button onClick={addCustomItem} className="btn btn-primary">
          <Plus size={16} /> Add Custom Item
        </button>
        <button onClick={exportCSV} className="btn btn-secondary">
          <Download size={16} /> Export CSV
        </button>
        <button onClick={emailReport} className="btn btn-secondary">
          <Mail size={16} /> Email Report
        </button>
      </div>
    </div>
  );
};

export default InventoryTable;