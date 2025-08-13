import React from 'react';
import RackDiagram from './RackDiagram';
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

interface RackData {
  id: string;
  name: string;
  totalU: number;
  devices: Device[];
  location: string;
}

interface RackPageProps {
  leftRack: RackData;
  rightRack: RackData;
  pageTitle?: string;
  location?: string;
  onDeviceClick?: (device: Device, rackId: string) => void;
  onEmptyClick?: (startRU: number, rackId: string) => void;
  onExportPDF?: () => void;
  showControls?: boolean;
}

const RackPage: React.FC<RackPageProps> = ({
  leftRack,
  rightRack,
  pageTitle = 'Rack Layout',
  location = '',
  onDeviceClick,
  onEmptyClick,
  onExportPDF,
  showControls = true
}) => {
  return (
    <div id="rack-page-print" className="rack-page-container">
      {/* Page Header */}
      {pageTitle && (
        <div className="rack-page-header">
          <h1>{pageTitle}</h1>
          {location && <p className="rack-page-location">{location}</p>}
          <div className="rack-page-date">
            Generated: {new Date().toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Two-Rack Layout */}
      <div className="rack-page">
        {/* Left Rack */}
        <RackDiagram
          rackId={leftRack.id}
          rackName={leftRack.name}
          totalU={leftRack.totalU}
          devices={leftRack.devices}
          location={leftRack.location}
          onDeviceClick={(device) => onDeviceClick?.(device, leftRack.id)}
          onEmptyClick={(startRU) => onEmptyClick?.(startRU, leftRack.id)}
        />

        {/* Right Rack */}
        <RackDiagram
          rackId={rightRack.id}
          rackName={rightRack.name}
          totalU={rightRack.totalU}
          devices={rightRack.devices}
          location={rightRack.location}
          onDeviceClick={(device) => onDeviceClick?.(device, rightRack.id)}
          onEmptyClick={(startRU) => onEmptyClick?.(startRU, rightRack.id)}
        />
      </div>

      {/* Controls */}
      {showControls && (
        <div className="rack-page-controls">
          <button 
            className="btn btn-primary"
            onClick={onExportPDF}
          >
            Export to PDF
          </button>
          <div className="rack-page-summary">
            <div className="summary-item">
              <strong>Total Devices:</strong> {leftRack.devices.length + rightRack.devices.length}
            </div>
            <div className="summary-item">
              <strong>Total RUs Used:</strong> {
                leftRack.devices.reduce((sum, d) => sum + d.heightRU, 0) + 
                rightRack.devices.reduce((sum, d) => sum + d.heightRU, 0)
              } / {leftRack.totalU + rightRack.totalU}
            </div>
            <div className="summary-item">
              <strong>Overall Utilization:</strong> {
                Math.round(
                  ((leftRack.devices.reduce((sum, d) => sum + d.heightRU, 0) + 
                    rightRack.devices.reduce((sum, d) => sum + d.heightRU, 0)) / 
                   (leftRack.totalU + rightRack.totalU)) * 100
                )
              }%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RackPage;