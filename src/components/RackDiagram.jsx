import React from 'react';
import '../styles/rack.css';

/**
 * Device type color mapping with WCAG-compliant contrast
 */
const DEVICE_TYPE_COLORS = {
  // Infrastructure & Power
  'ups': { bg: '#dc2626', fg: '#ffffff' }, // Red - Critical power
  'pdu': { bg: '#ea580c', fg: '#ffffff' }, // Orange - Power distribution
  
  // Network Equipment  
  'switch': { bg: '#2563eb', fg: '#ffffff' }, // Blue - Network switching
  'router': { bg: '#1d4ed8', fg: '#ffffff' }, // Dark Blue - Network routing
  'isp-equipment': { bg: '#3730a3', fg: '#ffffff' }, // Indigo - ISP gear
  
  // Servers & Compute
  'server': { bg: '#059669', fg: '#ffffff' }, // Green - Servers
  'top-level': { bg: '#047857', fg: '#ffffff' }, // Dark Green - Top level servers
  
  // Network & WAN
  'sd-wan': { bg: '#7c3aed', fg: '#ffffff' }, // Purple - SD-WAN
  
  // Monitoring & Security
  'camera-server': { bg: '#be185d', fg: '#ffffff' }, // Pink - Security/cameras
  'test-pc': { bg: '#0891b2', fg: '#ffffff' }, // Cyan - Test equipment
  
  // Connectivity
  'patch-panel': { bg: '#65a30d', fg: '#ffffff' }, // Lime - Patch panels
  
  // Default fallback
  'default': { bg: '#6b7280', fg: '#ffffff' }, // Gray - Unknown devices
};

/**
 * Generate consistent color for device based on its type and power source
 * Falls back to device-specific color if type is not recognized
 */
function colorForDevice(device) {
  const deviceType = device.type?.toLowerCase() || 'default';
  
  // Check if we have a predefined color for this device type
  if (DEVICE_TYPE_COLORS[deviceType]) {
    return DEVICE_TYPE_COLORS[deviceType];
  }
  
  // Fallback to device-specific color generation for unknown types
  const deviceKey = device.id || device.name || 'unknown';
  let h = 0;
  for (let i = 0; i < deviceKey.length; i++) {
    h = (h * 31 + deviceKey.charCodeAt(i)) >>> 0;
  }
  
  const hue = h % 360;
  const sat = 55;
  const light = 45; // Darker for better contrast
  
  const bg = `hsl(${hue} ${sat}% ${light}%)`;
  const fg = '#ffffff'; // Always white text for better contrast
  
  return { bg, fg };
}

/**
 * DeviceBlock component - represents a single device in the rack
 */
const DeviceBlock = ({ device, onClick }) => {
  const unitSpan = device.unitSpan || device.rack_units || 1;
  const colors = colorForDevice(device);
  
  return (
    <div
      className="device"
      style={{
        '--u': unitSpan,
        '--bg': colors.bg,
        '--fg': colors.fg,
        gridRow: `span ${unitSpan}`,
        backgroundColor: colors.bg,
        color: colors.fg,
      }}
      onClick={onClick}
      title={`${device.name} (${device.type}) - ${unitSpan}U`}
    >
      <div className="device-content">
        <div className="device-name">{device.name}</div>
        <div className="device-details">
          <span className="device-type">{device.type}</span>
          {unitSpan > 1 && <span className="device-units">{unitSpan}U</span>}
        </div>
        {device.model && (
          <div className="device-model">
            {device.manufacturer && `${device.manufacturer} `}{device.model}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main RackDiagram component using CSS Grid layout
 */
const RackDiagram = ({
  rack,
  locationName,
  showControls = false,
  onDeviceClick,
  viewMode = 'single'
}) => {
  const rackHeight = rack.height || 45;
  const devices = rack.devices || [];
  
  // Create array of units from top (45) to bottom (1) for display
  const units = Array.from({ length: rackHeight }, (_, i) => rackHeight - i);
  
  // Create a map of which units are occupied by devices
  const devicesByUnit = {};
  
  devices.forEach(device => {
    const startUnit = device.startUnit || 1;
    const unitSpan = device.unitSpan || device.rack_units || 1;
    
    // Fill all units this device occupies (spans DOWN from start unit)
    // e.g., start=37, span=2 -> occupies units 37, 36
    for (let i = 0; i < unitSpan; i++) {
      const occupiedUnit = startUnit - i;
      if (occupiedUnit >= 1 && occupiedUnit <= rackHeight) {
        devicesByUnit[occupiedUnit] = device;
      }
    }
  });
  
  // Calculate utilization
  const occupiedUnits = Object.keys(devicesByUnit).length;
  const utilization = Math.round((occupiedUnits / rackHeight) * 100);
  
  const handleDeviceClick = (device) => {
    if (onDeviceClick) {
      onDeviceClick(device);
    }
  };
  
  return (
    <div className={`rack-container ${viewMode}`} data-rack-id={rack.id} data-component="RackDiagram">
      {/* Rack Header */}
      <div className="rack-header">
        <div className="rack-title">
          <h3>{rack.name} (New Grid Layout)</h3>
          {locationName && <span className="location-name">{locationName}</span>}
        </div>
        <div className="rack-stats">
          <span className="utilization">Utilization: {utilization}%</span>
          <span className="height">{rackHeight}U</span>
          <span className="device-count">{devices.length} devices</span>
        </div>
      </div>
      
      {/* Rack Legend */}
      <div className="rack-legend">
        <span className="legend-item front">FRONT</span>
        <span className="legend-item back">BACK</span>
      </div>
      
      {/* Device Type Color Legend */}
      {devices.length > 0 && (
        <div className="device-type-legend">
          <div className="legend-title">Device Types:</div>
          <div className="legend-colors">
            {(() => {
              const deviceTypes = new Set();
              
              devices.forEach(device => {
                const deviceType = device.type?.toLowerCase();
                if (deviceType) {
                  deviceTypes.add(deviceType);
                }
              });
              
              return Array.from(deviceTypes).sort().map(deviceType => {
                const colors = DEVICE_TYPE_COLORS[deviceType] || DEVICE_TYPE_COLORS['default'];
                return (
                  <div key={deviceType} className="legend-color-item">
                    <div 
                      className="color-swatch"
                      style={{ backgroundColor: colors.bg, color: colors.fg }}
                    />
                    <span className="color-label">{deviceType.replace('-', ' ').toUpperCase()}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
      
      {/* Rack Grid */}
      <div 
        className="rack"
        style={{
          '--ruH': '24px',
          gridTemplateRows: `repeat(${rackHeight}, var(--ruH))`,
        }}
      >
        {/* Unit Numbers */}
        <div className="unit-numbers">
          {units.map(unitNum => (
            <div key={unitNum} className="unit-number">
              {unitNum}
            </div>
          ))}
        </div>
        
        {/* Rack Content */}
        <div className="rack-content">
          {/* Render all units in order, showing devices only where they actually exist */}
          {units.map(unitNum => {
            const device = devicesByUnit[unitNum];
            
            if (device) {
              // Only render device block at its starting unit
              const isStartUnit = device.startUnit === unitNum;
              if (isStartUnit) {
                const unitSpan = device.unitSpan || device.rack_units || 1;
                const gridRowStart = rackHeight - unitNum + 1;
                
                return (
                  <div
                    key={`device-${device.id}-${unitNum}`}
                    style={{
                      gridRowStart,
                      gridRowEnd: `span ${unitSpan}`,
                    }}
                  >
                    <DeviceBlock
                      device={device}
                      onClick={() => handleDeviceClick(device)}
                    />
                  </div>
                );
              }
              // Device continues from previous unit - render nothing (space already occupied)
              return null;
            }
            
            // Empty unit - show available space
            return (
              <div
                key={`empty-${unitNum}`}
                className="empty-unit"
                title={`Unit ${unitNum} - Available`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RackDiagram;