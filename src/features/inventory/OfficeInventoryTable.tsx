import React, { useState, useCallback, useEffect } from 'react';
import { 
  Monitor, HardDrive, Phone, Headphones, Package, 
  Building2, Plus, Download, Mail, Trash2
} from 'lucide-react';
import { useInventoryCalculations, InventoryRow } from '../../hooks/useInventoryCalculations';
import { 
  createDefaultInventoryData, 
  createDefaultInventoryRow,
  validateInventoryData,
  InventoryDataType,
  KpiDataType,
  HeaderInfoType
} from '../../schemas/inventorySchema';
import '../../styles/inventory.css';

interface OfficeInventoryTableProps {
  data?: InventoryDataType;
  onUpdate?: (data: InventoryDataType) => void;
}

// Default inventory items with icons
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

const OfficeInventoryTable: React.FC<OfficeInventoryTableProps> = ({ 
  data, 
  onUpdate 
}) => {
  // Convert legacy data format to new format
  const convertLegacyData = (legacyData: any): InventoryDataType => {
    if (!legacyData) return createDefaultInventoryData();
    
    // Check if it's already in the new format
    if (legacyData.kpiData && legacyData.headerInfo) {
      return legacyData as InventoryDataType;
    }
    
    // Convert from legacy format
    const items = (legacyData.items || []).map((item: any, index: number) => ({
      id: `item-${index}`,
      name: item.description || DEFAULT_ITEMS[index]?.name || 'Item',
      inUseByEmployees: item.inUse || 0,
      training: item.otherUse?.training || 0,
      conferenceRoom: item.otherUse?.conf || 0,
      gsmOffice: item.otherUse?.gsm || 0,
      prospectingStation: item.otherUse?.prospecting || 0,
      applicantStation: item.otherUse?.applicant || 0,
      visitorStation: item.otherUse?.visitor || 0,
      other: item.otherUse?.other || 0,
      sparesOnFloor: item.spares?.onFloor || 0,
      sparesInStorage: item.spares?.inStorage || 0,
      broken: item.broken || 0
    }));
    
    return {
      items: items.length > 0 ? items : createDefaultInventoryData().items,
      kpiData: {
        threeMonitorSetups: legacyData.specialStations?.threeMonitorSetups || 0,
        prospectingStations: legacyData.specialStations?.prospectingStations || 0,
        visitorStations: legacyData.specialStations?.visitorStations || 0,
        applicantStations: legacyData.specialStations?.applicantStations || 0,
        eolComputers: legacyData.specialStations?.eolComputers || 0,
        officeHeadcount: legacyData.officeHeadcount || 0
      },
      headerInfo: {
        location: legacyData.location || '',
        date: legacyData.date || new Date().toISOString().split('T')[0],
        recordedBy: legacyData.recordedBy || ''
      },
      lastUpdated: legacyData.lastUpdated || new Date().toISOString().split('T')[0],
      notes: legacyData.notes || ''
    };
  };

  // Initialize state from data or localStorage or defaults
  const [inventoryData, setInventoryData] = useState<InventoryDataType>(() => {
    if (data) return convertLegacyData(data);
    
    // Try loading from localStorage
    try {
      const saved = localStorage.getItem('office-inventory-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const validation = validateInventoryData(parsed);
        if (validation.success) {
          return validation.data;
        }
      }
    } catch (error) {
      console.warn('Failed to load inventory data from localStorage:', error);
    }
    
    return createDefaultInventoryData();
  });

  // Use calculation hook
  const { calculatedRows, summaryTotals, sanitizeNumber } = useInventoryCalculations(inventoryData.items);

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('office-inventory-data', JSON.stringify(inventoryData));
    } catch (error) {
      console.warn('Failed to save inventory data to localStorage:', error);
    }
  }, [inventoryData]);

  // Notify parent component of changes
  useEffect(() => {
    if (onUpdate) {
      onUpdate(inventoryData);
    }
  }, [inventoryData, onUpdate]);

  // Update handlers
  const handleItemChange = useCallback((index: number, field: keyof InventoryRow, value: string | number) => {
    setInventoryData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      return {
        ...prev,
        items: newItems,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    });
  }, []);

  const handleKpiChange = useCallback((field: keyof KpiDataType, value: string | number) => {
    setInventoryData(prev => ({
      ...prev,
      kpiData: {
        ...prev.kpiData,
        [field]: sanitizeNumber(value)
      },
      lastUpdated: new Date().toISOString().split('T')[0]
    }));
  }, [sanitizeNumber]);

  const handleHeaderChange = useCallback((field: keyof HeaderInfoType, value: string) => {
    setInventoryData(prev => ({
      ...prev,
      headerInfo: {
        ...prev.headerInfo,
        [field]: value
      },
      lastUpdated: new Date().toISOString().split('T')[0]
    }));
  }, []);

  // Add custom item
  const addCustomItem = useCallback(() => {
    const newItem = createDefaultInventoryRow('New Item', `custom-${Date.now()}`);
    setInventoryData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      lastUpdated: new Date().toISOString().split('T')[0]
    }));
  }, []);

  // Delete item (only custom items beyond defaults)
  const deleteItem = useCallback((index: number) => {
    if (index >= DEFAULT_ITEMS.length) {
      setInventoryData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
        lastUpdated: new Date().toISOString().split('T')[0]
      }));
    }
  }, []);

  // Get icon for item
  const getItemIcon = useCallback((index: number) => {
    return DEFAULT_ITEMS[index]?.icon || <Package size={16} />;
  }, []);

  // Export to CSV
  const exportCSV = useCallback(() => {
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

    const rows = calculatedRows.map(item => [
      `"${item.name}"`,
      item.inUseByEmployees,
      item.training,
      item.conferenceRoom,
      item.gsmOffice,
      item.prospectingStation,
      item.applicantStation,
      item.visitorStation,
      item.other,
      item.totalOtherUse,
      item.sparesOnFloor,
      item.sparesInStorage,
      item.sparesAuto,
      item.broken,
      item.rowTotal
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-inventory-${inventoryData.headerInfo.date || new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [calculatedRows, inventoryData.headerInfo.date]);

  // Email report
  const emailReport = useCallback(() => {
    const subject = `Office Inventory Report - ${inventoryData.headerInfo.location} - ${inventoryData.headerInfo.date}`;
    const body = `Office Inventory Report\nLocation: ${inventoryData.headerInfo.location}\nDate: ${inventoryData.headerInfo.date}\nRecorded By: ${inventoryData.headerInfo.recordedBy}\n\nSummary:\n- Total Items: ${summaryTotals.grandTotal}\n- In Use: ${summaryTotals.totalInUse}\n- Other Use: ${summaryTotals.totalOtherUse}\n- Spares: ${summaryTotals.totalSpares}\n- Broken: ${summaryTotals.totalBroken}\n\nKPI Summary:\n- Three Monitor Setups: ${inventoryData.kpiData.threeMonitorSetups}\n- Prospecting Stations: ${inventoryData.kpiData.prospectingStations}\n- Visitor Stations: ${inventoryData.kpiData.visitorStations}\n- Applicant Stations: ${inventoryData.kpiData.applicantStations}\n- EOL Computers: ${inventoryData.kpiData.eolComputers}\n- Office Headcount: ${inventoryData.kpiData.officeHeadcount}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [inventoryData, summaryTotals]);

  // PDF Export with html2pdf exact specifications
  const exportPDF = useCallback(async () => {
    try {
      // Wait for fonts to load and double RAF to settle layout
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      // Double RAF to settle layout
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.querySelector('#office-inventory-print');
      
      if (!element) {
        throw new Error('Print element not found');
      }

      const options = {
        margin: [10, 10, 12, 10],
        filename: 'Office-Inventory.pdf',
        html2canvas: { 
          scale: 2, 
          backgroundColor: '#ffffff', 
          windowWidth: element.scrollWidth || 1200 
        },
        pagebreak: { mode: ['css', 'avoid-all'] },
        jsPDF: { 
          unit: 'mm', 
          format: 'letter', 
          putOnlyUsedFonts: true 
        }
      };

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  }, []);

  return (
    <div id="office-inventory-print" className="inventory-container">
      {/* Header Band - Location, Date, Recorded By */}
      <div className="inventory-header-band">
        <div className="header-field">
          <label>Location:</label>
          <input
            type="text"
            value={inventoryData.headerInfo.location || ''}
            onChange={(e) => handleHeaderChange('location', e.target.value)}
            placeholder="Office Location"
          />
        </div>
        <div className="header-field">
          <label>Date:</label>
          <input
            type="date"
            value={inventoryData.headerInfo.date || ''}
            onChange={(e) => handleHeaderChange('date', e.target.value)}
          />
        </div>
        <div className="header-field">
          <label>Recorded By:</label>
          <input
            type="text"
            value={inventoryData.headerInfo.recordedBy || ''}
            onChange={(e) => handleHeaderChange('recordedBy', e.target.value)}
            placeholder="Your Name"
          />
        </div>
      </div>

      {/* Main Table - Exact Excel Layout */}
      <div className="inv-scroll">
        <table className="inv-table">
          <colgroup>
            <col className="col-desc" />                {/* Description (smaller) */}
            <col className="col-inuse" />               {/* In Use by Employees */}
            <col className="col-narrow" />              {/* Training */}
            <col className="col-narrow" />              {/* Conference Room */}
            <col className="col-narrow" />              {/* GSM Office */}
            <col className="col-narrow" />              {/* Prospecting Station */}
            <col className="col-narrow" />              {/* Applicant Station */}
            <col className="col-narrow" />              {/* Visitor Station */}
            <col className="col-narrow" />              {/* Other */}
            <col className="col-total-other" />         {/* Total Other Use */}
            <col className="col-mid" />                 {/* Spares On the Floor (wider) */}
            <col className="col-mid" />                 {/* Spares in Storage (wider) */}
            <col className="col-mid" />                 {/* Spares (Auto Fills) (wider) */}
            <col className="col-broken" />              {/* Broken */}
            <col className="col-grand" />               {/* TOTAL */}
          </colgroup>
          <thead>
          {/* Row 1: Group Headers */}
          <tr className="header-groups">
            <th rowSpan={2} className="description-header">Description</th>
            <th rowSpan={2} className="in-use-header">In Use by<br/>Employees</th>
            <th colSpan={7} className="other-use-header">Other Use</th>
            <th rowSpan={2} className="total-other-header">Total<br/>Other Use</th>
            <th colSpan={4} className="inventory-not-in-use-header">Inventory Not in Use</th>
            <th rowSpan={2} className="total-header">Total</th>
          </tr>
          {/* Row 2: Sub-headers */}
          <tr className="header-columns other-use-group">
            <th className="other-use-header"><span className="inv-rot">Training</span></th>
            <th className="other-use-header"><span className="inv-rot">Conference Room</span></th>
            <th className="other-use-header"><span className="inv-rot">GSM Office</span></th>
            <th className="other-use-header"><span className="inv-rot">Prospecting Station</span></th>
            <th className="other-use-header"><span className="inv-rot">Applicant Station</span></th>
            <th className="other-use-header"><span className="inv-rot">Visitor Station</span></th>
            <th className="other-use-header"><span className="inv-rot">Other</span></th>
            <th className="inventory-not-in-use-header">Spares On<br/>the Floor</th>
            <th className="inventory-not-in-use-header">Spares in<br/>Storage</th>
            <th className="inventory-not-in-use-header">Spares<br/>(Auto Fills)</th>
            <th className="inventory-not-in-use-header">Broken</th>
          </tr>
        </thead>
        <tbody>
          {calculatedRows.map((item, index) => (
            <tr key={item.id}>
              <td className="description-cell">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="icon-cell">{getItemIcon(index)}</span>
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
              <td className="in-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.inUseByEmployees}
                  onChange={(e) => handleItemChange(index, 'inUseByEmployees', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.training}
                  onChange={(e) => handleItemChange(index, 'training', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.conferenceRoom}
                  onChange={(e) => handleItemChange(index, 'conferenceRoom', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.gsmOffice}
                  onChange={(e) => handleItemChange(index, 'gsmOffice', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.prospectingStation}
                  onChange={(e) => handleItemChange(index, 'prospectingStation', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.applicantStation}
                  onChange={(e) => handleItemChange(index, 'applicantStation', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.visitorStation}
                  onChange={(e) => handleItemChange(index, 'visitorStation', e.target.value)}
                />
              </td>
              <td className="other-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.other}
                  onChange={(e) => handleItemChange(index, 'other', e.target.value)}
                />
              </td>
              <td className="total-other-cell computed-cell">{item.totalOtherUse}</td>
              <td className="inventory-not-in-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.sparesOnFloor}
                  onChange={(e) => handleItemChange(index, 'sparesOnFloor', e.target.value)}
                />
              </td>
              <td className="inventory-not-in-use-cell">
                <input
                  type="number"
                  min="0"
                  value={item.sparesInStorage}
                  onChange={(e) => handleItemChange(index, 'sparesInStorage', e.target.value)}
                />
              </td>
              <td className="spares-auto-cell computed-cell">{item.sparesAuto}</td>
              <td className="broken-input">
                <input
                  type="number"
                  min="0"
                  value={item.broken}
                  onChange={(e) => handleItemChange(index, 'broken', e.target.value)}
                  style={{ color: '#dc3545', fontWeight: 600 }}
                />
              </td>
              <td className="total-cell">{item.rowTotal}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      {/* KPI Footer Fields */}
      <div className="inventory-footer-fields">
        <div className="field-group">
          <label>Three Monitor Setups</label>
          <input
            type="number"
            min="0"
            value={inventoryData.kpiData.threeMonitorSetups}
            onChange={(e) => handleKpiChange('threeMonitorSetups', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label>Prospecting Stations</label>
          <input
            type="number"
            min="0"
            value={inventoryData.kpiData.prospectingStations}
            onChange={(e) => handleKpiChange('prospectingStations', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label>Visitor Stations</label>
          <input
            type="number"
            min="0"
            value={inventoryData.kpiData.visitorStations}
            onChange={(e) => handleKpiChange('visitorStations', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label>Applicant Stations</label>
          <input
            type="number"
            min="0"
            value={inventoryData.kpiData.applicantStations}
            onChange={(e) => handleKpiChange('applicantStations', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label>EOL Computers</label>
          <input
            type="number"
            min="0"
            value={inventoryData.kpiData.eolComputers}
            onChange={(e) => handleKpiChange('eolComputers', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label>Office Headcount</label>
          <input
            type="number"
            min="0"
            value={inventoryData.kpiData.officeHeadcount}
            onChange={(e) => handleKpiChange('officeHeadcount', e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="inventory-summary">
        Total Items: {summaryTotals.grandTotal} | In Use: {summaryTotals.totalInUse} | Spares: {summaryTotals.totalSpares} | Broken: {summaryTotals.totalBroken}
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
        <button onClick={exportPDF} className="btn btn-secondary">
          <Download size={16} /> Export PDF
        </button>
      </div>
    </div>
  );
};

export default OfficeInventoryTable;