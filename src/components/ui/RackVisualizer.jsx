import React, { useState } from 'react';
import { 
  Server, Monitor, HardDrive, Wifi, Shield, Zap, Package, 
  Edit, Trash2, Plus, Eye, Info, AlertTriangle, CheckCircle,
  Power, Thermometer, Activity, Cpu, Database
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
      const span = parseInt(device.unitSpan);
      for (let i = 0; i < span; i++) {
        const unit = start + i;
        if (unit <= (rack.height || 42)) {
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

  const getUnitStyle = (unit, deviceInfo) => {
    const isEmpty = !deviceInfo;
    
    if (isEmpty) {
      return {
        base: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-gray-750 cursor-pointer',
        hover: 'hover:shadow-sm'
      };
    }

    const statusStyles = {
      'active': 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600',
      'inactive': 'bg-red-100 text-red-800 border-red-400 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600',
      'maintenance': 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600',
      'retired': 'bg-gray-100 text-gray-800 border-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'
    };

    return {
      base: statusStyles[deviceInfo.status] || statusStyles.active,
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
      <div className="space-y-0.5 bg-gray-200 dark:bg-gray-700 p-2 rounded border-2 border-gray-400 dark:border-gray-500 max-h-96 overflow-y-auto">
        {rackUnits.map(unit => {
          const deviceInfo = unitMap[unit];
          const isEmpty = !deviceInfo;
          const style = getUnitStyle(unit, deviceInfo);
          
          return (
            <div
              key={unit}
              className={`h-${viewMode === 'compact' ? '4' : '6'} border-2 text-xs flex items-center justify-between px-2 relative group ${style.base} ${style.hover}`}
              title={deviceInfo ? 
                `${deviceInfo.name} (${deviceInfo.type || 'Unknown'}) - ${deviceInfo.unitSpan}U - ${deviceInfo.status}\nModel: ${deviceInfo.model || 'N/A'}\nSerial: ${deviceInfo.serialNumber || 'N/A'}${deviceInfo.notes ? `\nNotes: ${deviceInfo.notes}` : ''}` : 
                `Unit ${unit} - Available\n${showControls ? 'Click to add device' : ''}`
              }
              onClick={() => handleUnitClick(unit, deviceInfo)}
              onMouseEnter={() => setHoveredUnit(unit)}
              onMouseLeave={() => setHoveredUnit(null)}
            >
              {/* Unit Number */}
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400 min-w-[20px]">
                  {unit.toString().padStart(2, '0')}
                </span>
                
                {/* Device Info */}
                {deviceInfo && deviceInfo.isFirst && (
                  <div className="flex items-center space-x-1 min-w-0 flex-1">
                    <div className="flex-shrink-0 flex items-center space-x-1">
                      {getDeviceIcon(deviceInfo.type, deviceInfo.status)}
                      {viewMode === 'detailed' && getStatusIndicator(deviceInfo.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-semibold truncate">
                          {deviceInfo.name}
                        </span>
                        {deviceInfo.unitSpan > 1 && (
                          <span className="text-[8px] bg-white/20 px-1 rounded font-bold">
                            {deviceInfo.unitSpan}U
                          </span>
                        )}
                      </div>
                      {viewMode === 'detailed' && deviceInfo.type && (
                        <span className="text-[9px] opacity-75 truncate block">
                          {deviceInfo.type}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Continuation indicator for multi-unit devices */}
                {deviceInfo && !deviceInfo.isFirst && (
                  <div className="flex items-center space-x-1 opacity-60">
                    <span className="text-[10px]">↑</span>
                    <span className="text-[9px] truncate">
                      {deviceInfo.name}
                    </span>
                  </div>
                )}

                {/* Empty unit indicator */}
                {isEmpty && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                    {hoveredUnit === unit && showControls ? 'Click to add' : 'Empty'}
                  </span>
                )}
              </div>

              {/* Control buttons */}
              {showControls && deviceInfo && deviceInfo.isFirst && (
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeviceView(deviceInfo);
                    }}
                    className="text-[10px] p-1 hover:bg-white/30 rounded transition-colors"
                    title="View details"
                  >
                    <Eye size={10} />
                  </button>
                  {onDeviceEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeviceEdit(locationId, rack.id, deviceInfo);
                      }}
                      className="text-[10px] p-1 hover:bg-white/30 rounded transition-colors"
                      title="Edit device"
                    >
                      <Edit size={10} />
                    </button>
                  )}
                  {onDeviceDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeviceDelete(locationId, rack.id, deviceInfo.id);
                      }}
                      className="text-[10px] p-1 hover:bg-red-500/30 rounded transition-colors"
                      title="Delete device"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              )}
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
              <Thermometer className="mx-auto mb-1 text-blue-500" size={12} />
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {rack.temperature || '--'}°F
              </div>
              <div className="text-gray-500 dark:text-gray-400">Temp</div>
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