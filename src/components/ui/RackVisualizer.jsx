import React, { useState } from 'react';
import {
  Server, Monitor, HardDrive, Wifi, Shield, Zap, Package,
  Edit, Trash2, Plus, Eye, Info, AlertTriangle, CheckCircle,
  Power, Thermometer, Activity
} from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';

const RackVisualizer = ({ 
  rack, 
  locationId, 
  showControls = false, 
  onDeviceEdit, 
  onDeviceDelete, 
  onDeviceAdd,
  viewMode = 'detailed' // 'detailed', 'compact', 'overview'
}) => {
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hoveredUnit, setHoveredUnit] = useState(null);

  if (!rack) return null;

  const rackUnits = Array.from({ length: rack.height || 42 }, (_, i) => (rack.height || 42) - i);
  
  // Create a map of which units are occupied by devices
  const unitMap = {};
  (rack.devices || []).forEach(device => {
    if (device.startUnit && device.unitSpan) {
      const start = parseInt(device.startUnit);
      const span = Math.max(1, parseInt(device.unitSpan));
      // Span goes downward in U numbering (toward smaller numbers)
      for (let i = 0; i < span; i++) {
        const unit = start - i;
        if (unit >= 1) {
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

  // Calculate rack utilization
  const occupiedUnits = Object.keys(unitMap).length;
  const utilizationPercent = Math.round((occupiedUnits / (rack.height || 42)) * 100);

  // Get device type icon with enhanced styling
  const getDeviceIcon = (type, status = 'active') => {
    const iconMap = {
      'server': { icon: Server, color: 'text-blue-500' },
      'switch': { icon: Wifi, color: 'text-green-500' },
      'router': { icon: Wifi, color: 'text-purple-500' },
      'storage': { icon: HardDrive, color: 'text-orange-500' },
      'ups': { icon: Zap, color: 'text-yellow-500' },
      'pdu': { icon: Power, color: 'text-red-500' },
      'firewall': { icon: Shield, color: 'text-red-600' },
      'monitor': { icon: Monitor, color: 'text-gray-500' },
      'patch-panel': { icon: Package, color: 'text-gray-600' },
      'other': { icon: Package, color: 'text-gray-400' }
    };
    
    const deviceInfo = iconMap[type] || iconMap.other;
    const IconComponent = deviceInfo.icon;
    
    const statusColor = status === 'active' ? deviceInfo.color :
                       status === 'inactive' ? 'text-gray-400' :
                       status === 'maintenance' ? 'text-yellow-400' :
                       'text-red-400';
    
    return <IconComponent size={viewMode === 'compact' ? 10 : 12} className={statusColor} />;
  };

  // Get status indicator
  const getStatusIndicator = (status) => {
    const indicators = {
      'active': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
      'inactive': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' },
      'maintenance': { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100' },
      'retired': { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-100' }
    };
    
    const indicator = indicators[status] || indicators.active;
    const IconComponent = indicator.icon;
    
    return <IconComponent size={8} className={indicator.color} />;
  };

  // Type-based color styles for readability (base)
  const typeStyles = {
    'switch': 'bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-600',
    'top-level': 'bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100 dark:border-indigo-600',
    'sd-wan': 'bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-900/30 dark:text-teal-100 dark:border-teal-600',
    'ups': 'bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100 dark:border-yellow-600',
    'pdu': 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-600',
    'camera-server': 'bg-green-100 border-green-400 text-green-900 dark:bg-green-900/30 dark:text-green-100 dark:border-green-600',
    'test-pc': 'bg-pink-100 border-pink-400 text-pink-900 dark:bg-pink-900/30 dark:text-pink-100 dark:border-pink-600',
    'patch-panel': 'bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-900/30 dark:text-purple-100 dark:border-purple-600',
  };

  // Status overlay styles to draw attention for maintenance/inactive
  const statusStyles = {
    'maintenance': 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent shadow-[0_0_0_3px_rgba(250,204,21,0.25)]',
    'inactive': 'ring-2 ring-gray-500 ring-offset-1 ring-offset-transparent opacity-75 grayscale',
  };

  const getUnitStyle = (unit, deviceInfo) => {
    const isEmpty = !deviceInfo;
    if (isEmpty) {
      return {
        base: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-gray-750 cursor-pointer',
        hover: 'hover:shadow-sm'
      };
    }
    const typeClass = typeStyles[deviceInfo.type] || 'bg-green-50 border-green-400 text-gray-900 dark:bg-green-900/20 dark:text-green-100 dark:border-green-600';
    const statusClass = statusStyles[deviceInfo.status] || '';
    return {
      base: `${typeClass} ${statusClass}`,
      hover: 'hover:shadow-md transition-all duration-200'
    };
  };

  const handleUnitClick = (unit, deviceInfo) => {
    if (!showControls) return;
    
    if (!deviceInfo && onDeviceAdd) {
      onDeviceAdd(locationId, rack.id, unit);
    }
  };

  const handleDeviceView = (device) => {
    setSelectedDevice(device);
    setShowDeviceModal(true);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-inner">
      {/* Rack Header */}
      <div className="text-center mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-center space-x-2 mb-1">
          <Package className="text-blue-500" size={16} />
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{rack.name}</h4>
        </div>
        <div className="flex justify-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
          <span>{rack.height}U</span>
          <span>{(rack.devices || []).length} devices</span>
          <span>{utilizationPercent}% utilized</span>
          {rack.power && <span>{rack.power}</span>}
        </div>
        
        {/* Utilization Bar */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                utilizationPercent >= 90 ? 'bg-red-500' :
                utilizationPercent >= 70 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {occupiedUnits} of {rack.height} units occupied
          </p>
        </div>
      </div>
      
      {/* Rack Units */}
      {/* Unified device boxes spanning multiple U with rail numbers on the left */}
      <div className="space-y-0 bg-gray-200 dark:bg-gray-700 p-1.5 rounded border-2 border-gray-400 dark:border-gray-500 max-h-[36rem] overflow-y-auto">
        {/* Rail header to align left column */}
        <div className="grid grid-cols-[2rem_1fr] gap-x-0">
          <div className="col-span-1" />
          <div className="col-span-1" />
        </div>
        {rackUnits.map(unit => {
          const deviceInfo = unitMap[unit];
          const isEmpty = !deviceInfo;

          // For rows that are part of a device but not the first row, draw only the rail number and a dashed continuation
          if (deviceInfo && !deviceInfo.isFirst) {
            // Reserve the vertical space of this spanned unit so the merged box can overlap it.
            // We render an invisible spacer with the exact unit height so the first row's absolute box can cover it.
            const perURem = viewMode === 'compact' ? 1.25 : 1.7;
            return (
              <div key={unit} className="grid grid-cols-[2rem_1fr] items-stretch" style={{ height: `${perURem}rem` }}>
                {/* Rail number, visible even for continuation rows */}
                <div className="flex items-center justify-center">
                  <span className="text-[12px] font-mono font-bold text-gray-700 dark:text-gray-300">
                    {unit.toString().padStart(2, '0')}
                  </span>
                </div>
                {/* Spacer to reserve height for overlaying merged device box */}
                <div className="opacity-0 pointer-events-none" />
              </div>
            );
          }

          // Build tooltip
          const tooltip = deviceInfo ? [
            `Name: ${deviceInfo.name || ''}`,
            `Type: ${deviceInfo.type || 'Unknown'}`,
            deviceInfo.model ? `Model: ${deviceInfo.model}` : null,
            deviceInfo.serialNumber ? `Serial: ${deviceInfo.serialNumber}` : null,
            `Height: ${deviceInfo.unitSpan || 1}U`,
            deviceInfo.pduPorts?.length ? `PDU Ports: ${deviceInfo.pduPorts.map(p => `${p.pduId || 'PDU'}:${p.outlet || ''}`).join(', ')}` : null,
            deviceInfo.hasNicCard ? `NIC: ${deviceInfo.nicSwitch || ''}${deviceInfo.nicPort ? `/${deviceInfo.nicPort}` : ''}${deviceInfo.lastTestDate ? ` (Last Test: ${deviceInfo.lastTestDate})` : ''}` : null,
            deviceInfo.notes ? `Notes: ${deviceInfo.notes}` : null,
          ].filter(Boolean).join('\n') : `Unit ${unit} - Available\n${showControls ? 'Click to add device' : ''}`;

          // First row (or empty)
          if (deviceInfo) {
            const style = getUnitStyle(unit, deviceInfo);
            // Make the merged device box consume the exact number of unit rows visually.
            // We derive the base single-row heights from the empty-row styles below to ensure a 1:1 match.
            // Exact per-U heights; Increase slightly for readability while still matching empty-row heights
            const perURem = viewMode === 'compact' ? 1.25 : 1.7; // keep in sync with empty row below
            const span = Math.max(1, parseInt(deviceInfo.totalSpan || deviceInfo.unitSpan || 1));
            const heightRem = `${span * perURem}rem`;
            return (
              <div key={unit} className="grid grid-cols-[2rem_1fr] items-stretch" style={{ height: heightRem, marginBottom: `-${(span - 1) * (viewMode === 'compact' ? 1.25 : 1.7)}rem` }}>
                {/* Rail number column */}
                <div className="flex items-start justify-center pt-1">
                  <span className="text-[12px] font-mono font-bold text-gray-700 dark:text-gray-300">
                    {unit.toString().padStart(2, '0')}
                  </span>
                </div>
                {/* Merged device box */}
                <div
                  className={`border-2 ${style.base} ${style.hover} rounded-sm shadow-sm hover:shadow-md transition-shadow relative`}
                  title={tooltip}
                  onClick={() => {
                    // clicking the merged device opens view (if controls enabled)
                    if (showControls) handleDeviceView(deviceInfo);
                  }}
                >
                  <div className="h-full flex flex-col justify-center px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {getDeviceIcon(deviceInfo.type, deviceInfo.status)}
                        <span className="text-[13px] font-semibold truncate" title={deviceInfo.name}>
                          {deviceInfo.name}
                        </span>
                      </div>
                      {span > 1 && (
                        <span className="text-[11px] bg-black/10 dark:bg-white/20 px-1 rounded font-bold">
                          {span}U
                        </span>
                      )}
                    </div>
                    {viewMode === 'detailed' && deviceInfo.type && (
                      <div className="mt-0.5 text-[11px] opacity-90 truncate capitalize">
                        {deviceInfo.type}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Empty single-U row (click anywhere on the row to add a device when controls are enabled)
          return (
            <div key={unit} className="grid grid-cols-[2rem_1fr] items-stretch">
              {/* Rail number */}
              <div className="flex items-center justify-center">
                <span className="text-[12px] font-mono font-bold text-gray-700 dark:text-gray-300">
                  {unit.toString().padStart(2, '0')}
                </span>
              </div>
              {/* Empty row button */}
              <button
                type="button"
                className="h-[1.25rem] md:h-[1.7rem] bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center px-2 text-[11px] text-gray-600 dark:text-gray-300 italic text-left hover:bg-blue-50 disabled:opacity-60"
                onClick={() => showControls && handleUnitClick(unit, null)}
                disabled={!showControls}
              >
                {hoveredUnit === unit && showControls ? 'Click to add' : 'Empty'}
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Rack Footer with Stats */}
      {viewMode === 'detailed' && (
        <div className="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <Activity className="mx-auto mb-1 text-green-500" size={12} />
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {(rack.devices || []).filter(d => d.status === 'active').length}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-1 text-yellow-500" size={12} />
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {(rack.devices || []).filter(d => d.status === 'maintenance').length}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Maintenance</div>
            </div>
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-1 text-gray-500" size={12} />
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {(rack.devices || []).filter(d => d.status === 'inactive').length}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Inactive</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Device Button */}
      {showControls && viewMode === 'detailed' && (
        <div className="mt-3 flex justify-center space-x-2">
          {onDeviceAdd && (
            <Button
              size="sm"
              onClick={() => onDeviceAdd(locationId, rack.id)}
              className="text-xs"
            >
              <Plus size={14} />
              Add Device
            </Button>
          )}
        </div>
      )}

      {/* Device Detail Modal */}
      <Modal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        title={`Device Details: ${selectedDevice?.name}`}
        size="lg"
      >
        {selectedDevice && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  {getDeviceIcon(selectedDevice.type, selectedDevice.status)}
                  <span>Basic Information</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedDevice.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-gray-100 capitalize">{selectedDevice.type || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedDevice.model || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Serial:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">{selectedDevice.serialNumber || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Status:</span>
                    <div className="flex items-center space-x-1">
                      {getStatusIndicator(selectedDevice.status)}
                      <span className="text-gray-900 dark:text-gray-100 capitalize">{selectedDevice.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  <Package size={16} />
                  <span>Rack Placement</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Start Unit:</span>
                    <span className="text-gray-900 dark:text-gray-100">U{selectedDevice.startUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Unit Span:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedDevice.unitSpan}U</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">End Unit:</span>
                    <span className="text-gray-900 dark:text-gray-100">U{selectedDevice.startUnit + selectedDevice.unitSpan - 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedDevice.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedDevice.notes && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center space-x-2">
                  <Info size={16} />
                  <span>Notes</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {selectedDevice.notes}
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeviceModal(false)}
              >
                Close
              </Button>
              {showControls && onDeviceEdit && (
                <Button
                  onClick={() => {
                    setShowDeviceModal(false);
                    onDeviceEdit(locationId, rack.id, selectedDevice);
                  }}
                >
                  <Edit size={16} />
                  Edit Device
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RackVisualizer;