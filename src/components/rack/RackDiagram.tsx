import React from 'react';
import '../../styles/rack.css';

interface Device {
  id: string;
  name: string;
  type: string;
  startUnit: number;
  unitSpan?: number;
  rack_units?: number;
  status?: string;
  model?: string;
  manufacturer?: string;
  [key: string]: any;
}

interface Rack {
  id: string;
  name: string;
  height: number;
  devices?: Device[];
}

interface RackDiagramProps {
  rack: Rack;
  locationName?: string;
  showControls?: boolean;
  onDeviceClick?: (device: Device) => void;
  viewMode?: 'single' | 'side-by-side';
}

/**
 * Generate deterministic color for device based on its ID/name
 * Uses string hash to HSL conversion for consistent, unique colors
 */
function colorForDevice(k: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < k.length; i++) {
    h = (h * 31 + k.charCodeAt(i)) >>> 0;
  }
  
  const hue = h % 360;
  const sat = 62;
  const light = 58;
  
  const bg = `hsl(${hue} ${sat}% ${light}%)`;
  // Choose foreground color for contrast
  const fg = light < 60 ? '#fff' : '#111';
  
  return { bg, fg };
}

/**
 * DeviceBlock component - represents a single device in the rack
 */
interface DeviceBlockProps {
  device: Device;
  onClick?: () => void;
}

const DeviceBlock: React.FC<DeviceBlockProps> = ({ device, onClick }) => {
  const unitSpan = device.unitSpan || device.rack_units || 1;
  const colors = colorForDevice(device.id || device.name || '');
  
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
      } as React.CSSProperties}
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
const RackDiagram: React.FC<RackDiagramProps> = ({
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
  const devicesByUnit: { [unit: number]: Device } = {};
  
  devices.forEach(device => {
    const startUnit = device.startUnit || 1;
    const unitSpan = device.unitSpan || device.rack_units || 1;
    
    // Fill all units this device occupies
    for (let u = startUnit; u < startUnit + unitSpan; u++) {
      if (u <= rackHeight) {
        devicesByUnit[u] = device;
      }
    }
  });
  
  // Calculate utilization
  const occupiedUnits = Object.keys(devicesByUnit).length;
  const utilization = Math.round((occupiedUnits / rackHeight) * 100);
  
  const handleDeviceClick = (device: Device) => {
    if (onDeviceClick) {
      onDeviceClick(device);
    }
  };

  return (
    <div className={`rack-container ${viewMode}`} data-rack-id={rack.id}>
      {/* Rack Header */}
      <div className="rack-header">
        <div className="rack-title">
          <h3>{rack.name}</h3>
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
      
      {/* Rack Grid */}
      <div 
        className="rack"
        style={{
          '--ruH': '24px',
          gridTemplateRows: `repeat(${rackHeight}, var(--ruH))`,
        } as React.CSSProperties}
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
          {/* Render devices positioned at their start units */}
          {devices.map((device, index) => {
            const startUnit = device.startUnit || 1;
            const unitSpan = device.unitSpan || device.rack_units || 1;
            
            // Calculate grid position: unit 45 = row 1, unit 44 = row 2, etc.
            const gridRowStart = rackHeight - startUnit - unitSpan + 2;
            
            return (
              <div
                key={`${device.id}-${index}`}
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
          })}
          
          {/* Render empty units for remaining space */}
          {units.map(unitNum => {
            const device = devicesByUnit[unitNum];
            
            if (!device) {
              return (
                <div
                  key={`empty-${unitNum}`}
                  className="empty-unit"
                  title={`Unit ${unitNum} - Available`}
                />
              );
            }
            
            return null; // Space occupied by device
          })}
        </div>
      </div>
    </div>
  );
};

export default RackDiagram;