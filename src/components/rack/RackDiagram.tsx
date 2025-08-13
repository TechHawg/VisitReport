import React from 'react';
import '../../styles/rack.css';

interface Device {
  id: string;
  name: string;
  startRU: number;
  heightRU: number;
  type: 'server' | 'switch' | 'pdu' | 'ups' | 'network' | 'storage' | 'other';
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
}

interface RackDiagramProps {
  rackId: string;
  rackName: string;
  totalU?: number;
  devices: Device[];
  location?: string;
  onDeviceClick?: (device: Device) => void;
  onEmptyClick?: (startRU: number) => void;
}

// Device type colors with high contrast for print
const deviceColors: Record<string, { bg: string; text: string }> = {
  server: { bg: '#dcfce7', text: '#166534' },      // Green
  switch: { bg: '#dbeafe', text: '#1e40af' },      // Blue
  pdu: { bg: '#fed7aa', text: '#ea580c' },         // Orange
  ups: { bg: '#f3e8ff', text: '#7c3aed' },         // Purple
  network: { bg: '#cffafe', text: '#0e7490' },     // Cyan
  storage: { bg: '#fef3c7', text: '#d97706' },     // Amber
  other: { bg: '#f1f5f9', text: '#475569' }        // Gray
};

export default function RackDiagram({ 
  rackId, 
  rackName, 
  totalU = 45, 
  devices, 
  location = '',
  onDeviceClick,
  onEmptyClick 
}: RackDiagramProps) {
  // Calculate occupancy for statistics
  const occupiedUs = devices.reduce((sum, device) => sum + device.heightRU, 0);
  const utilization = Math.round((occupiedUs / totalU) * 100);

  // Create array of all RU positions for tracking occupancy
  const occupiedRUs = new Set<number>();
  devices.forEach(device => {
    for (let i = device.startRU; i < device.startRU + device.heightRU; i++) {
      occupiedRUs.add(i);
    }
  });

  return (
    <div className="rack-container">
      {/* Header with rack info */}
      <div className="rack-header">
        <div className="rack-title">
          <h3>{rackName}</h3>
          {location && <div className="location-name">{location}</div>}
        </div>
        <div className="rack-stats">
          <div>Total: {totalU}U</div>
          <div>Used: {occupiedUs}U</div>
          <div className="utilization">{utilization}%</div>
        </div>
      </div>

      {/* Device Type Legend */}
      <div className="device-type-legend">
        <div className="legend-title">Device Types</div>
        <div className="legend-colors">
          {Object.entries(deviceColors).map(([type, colors]) => (
            <div key={type} className="legend-color-item">
              <div 
                className="color-swatch" 
                style={{ 
                  backgroundColor: colors.bg, 
                  color: colors.text 
                }}
              >
                {type.charAt(0).toUpperCase()}
              </div>
              <span className="color-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Rack Grid Layout */}
      <div className="rack-wrapper">
        {/* Left RU Numbers */}
        <div className="ru-bar-left">
          {Array.from({ length: totalU }, (_, i) => (
            <div key={i} className="ru-number">
              {totalU - i}
            </div>
          ))}
        </div>

        {/* Rack with Grid Positioning */}
        <div className="rack">
          {/* Devices positioned using CSS Grid */}
          {devices.map(device => {
            const colors = deviceColors[device.type] || deviceColors.other;
            const ruStart = totalU - device.startRU - device.heightRU + 1;
            
            return (
              <div
                key={device.id}
                className="device"
                style={{
                  '--ru-start': ruStart,
                  '--ru-height': device.heightRU,
                  backgroundColor: colors.bg,
                  color: colors.text
                } as React.CSSProperties}
                onClick={() => onDeviceClick?.(device)}
              >
                <div className="device-content">
                  <div className="device-name">{device.name}</div>
                  <div className="device-details">
                    <span className="device-type">{device.type}</span>
                    <span className="device-units">{device.heightRU}U</span>
                  </div>
                  {device.model && (
                    <div className="device-model">{device.model}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty slots for interaction */}
          {Array.from({ length: totalU }, (_, i) => {
            const ruNumber = i + 1;
            if (occupiedRUs.has(ruNumber)) return null;
            
            const ruStart = totalU - ruNumber;
            
            return (
              <div
                key={`empty-${ruNumber}`}
                className="empty-unit"
                style={{
                  '--ru-start': ruStart + 1,
                  '--ru-height': 1
                } as React.CSSProperties}
                onClick={() => onEmptyClick?.(ruNumber)}
              />
            );
          })}
        </div>

        {/* Right RU Tick Marks */}
        <div className="ru-bar-right">
          {Array.from({ length: totalU }, (_, i) => (
            <div key={i} className="ru-tick" />
          ))}
        </div>
      </div>
    </div>
  );
}