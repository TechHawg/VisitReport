import React from 'react';
import {
  Server, Monitor, HardDrive, Wifi, Shield, Zap, Package,
  Power, Thermometer, Activity, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { getDeviceTypeConfig, formatDeviceTooltip } from '../../utils/rackUtils.js';
import { POWER_STATUS, THERMAL_STATUS } from '../../constants/rackConfig.js';

const DeviceUnit = ({ 
  device, 
  unitNumber, 
  isHovered, 
  onDeviceClick, 
  viewMode = 'detailed',
  showControls = false 
}) => {
  if (!device) return null;

  const deviceConfig = getDeviceTypeConfig(device.type);
  
  // Get icon component
  const getIconComponent = (iconName) => {
    const icons = {
      Server, Monitor, HardDrive, Wifi, Shield, Zap, Package,
      Power, Thermometer, Activity, AlertTriangle, CheckCircle, Info
    };
    return icons[iconName] || Package;
  };

  const DeviceIcon = getIconComponent(deviceConfig.icon);
  
  // Get power status
  const getPowerStatus = () => {
    if (!device.powerStatus) return POWER_STATUS.UNKNOWN;
    const status = device.powerStatus.toLowerCase();
    return POWER_STATUS[status.toUpperCase()] || POWER_STATUS.UNKNOWN;
  };

  // Get thermal status
  const getThermalStatus = () => {
    if (!device.temperature) return null;
    const temp = parseFloat(device.temperature);
    if (temp <= THERMAL_STATUS.NORMAL.threshold[1]) return THERMAL_STATUS.NORMAL;
    if (temp <= THERMAL_STATUS.WARNING.threshold[1]) return THERMAL_STATUS.WARNING;
    return THERMAL_STATUS.CRITICAL;
  };

  const powerStatus = getPowerStatus();
  const thermalStatus = getThermalStatus();
  const PowerIcon = getIconComponent(powerStatus.icon);

  // Calculate dynamic height for multi-unit devices
  const getDeviceHeight = () => {
    if (viewMode === 'compact') return '1rem';
    if (device.totalSpan > 1 && device.isFirst) {
      // Only the first unit should have the full height
      return `calc(${device.totalSpan * 1.5}rem + ${(device.totalSpan - 1) * 1}px)`;
    }
    return '1.5rem';
  };

  // Handle spacing for multi-unit devices
  const getMarginTop = () => {
    // Remove margin calculations as we handle positioning differently
    return '0';
  };

  // Get border radius classes for multi-unit devices
  const getBorderRadius = () => {
    if (!device.totalSpan || device.totalSpan <= 1) return 'rounded';
    
    if (device.isFirst && device.isLast) {
      // Single unit (shouldn't happen with totalSpan > 1)
      return 'rounded';
    } else if (device.isFirst) {
      // First unit of multi-unit device
      return 'rounded-t';
    } else if (device.isLast) {
      // Last unit of multi-unit device  
      return 'rounded-b';
    } else {
      // Middle unit of multi-unit device
      return '';
    }
  };

  const baseClasses = `
    relative border cursor-pointer transition-all duration-200
    ${deviceConfig.bgColor} ${deviceConfig.borderColor}
    ${getBorderRadius()}
    ${isHovered ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg transform scale-105' : ''}
    ${device.isFirst ? 'z-10' : 'z-0'}
  `;

  if (viewMode === 'compact') {
    return (
      <div
        className={`${baseClasses} px-2 py-1 flex items-center justify-between`}
        style={{ height: getDeviceHeight(), marginTop: getMarginTop() }}
        onClick={() => onDeviceClick?.(device)}
        title={formatDeviceTooltip(device)}
      >
        <div className="flex items-center space-x-1 min-w-0">
          <DeviceIcon size={12} className={deviceConfig.color} />
          <span className="text-xs font-medium truncate">{device.name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <PowerIcon size={10} className={powerStatus.color} />
          {device.unitSpan > 1 && (
            <span className="text-xs text-gray-500">{device.unitSpan}U</span>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'overview') {
    return (
      <div
        className={`${baseClasses} px-2 py-1 flex items-center`}
        style={{ height: getDeviceHeight(), marginTop: getMarginTop() }}
        onClick={() => onDeviceClick?.(device)}
        title={formatDeviceTooltip(device)}
      >
        <DeviceIcon size={14} className={deviceConfig.color} />
        <span className="ml-2 text-sm font-medium truncate">{device.name}</span>
        {device.unitSpan > 1 && (
          <span className="ml-auto text-xs text-gray-500">{device.unitSpan}U</span>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div
      className={`${baseClasses} px-3 py-2`}
      style={{ height: getDeviceHeight(), marginTop: getMarginTop() }}
      onClick={() => onDeviceClick?.(device)}
      title={formatDeviceTooltip(device)}
    >
      {device.isFirst && (
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <DeviceIcon size={16} className={deviceConfig.color} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {device.name}
              </div>
              {device.model && (
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {device.manufacturer} {device.model}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-2">
            {/* Power Status */}
            <div className="flex items-center space-x-1">
              <PowerIcon size={14} className={powerStatus.color} />
              {viewMode === 'detailed' && (
                <span className={`text-xs ${powerStatus.color}`}>
                  {powerStatus.status.toUpperCase()}
                </span>
              )}
            </div>

            {/* Temperature Status */}
            {thermalStatus && (
              <div className="flex items-center space-x-1">
                <Thermometer size={14} className={thermalStatus.color} />
                {device.temperature && (
                  <span className={`text-xs ${thermalStatus.color}`}>
                    {device.temperature}°C
                  </span>
                )}
              </div>
            )}

            {/* Unit Span Indicator */}
            {device.unitSpan > 1 && (
              <div className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                {device.unitSpan}U
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unit number indicator for multi-unit devices */}
      {device.totalSpan > 1 && (
        <div className="absolute right-1 top-1 text-xs text-gray-500 bg-white dark:bg-gray-800 px-1 rounded">
          U{unitNumber}
        </div>
      )}

      {/* Connection indicators */}
      {device.connections && device.connections.length > 0 && device.isFirst && (
        <div className="absolute bottom-1 left-1">
          <div className="flex space-x-1">
            {device.connections.slice(0, 3).map((conn, idx) => (
              <div 
                key={idx}
                className="w-2 h-2 rounded-full bg-green-400"
                title={`Connected to ${conn.target}`}
              />
            ))}
            {device.connections.length > 3 && (
              <div className="text-xs text-gray-500">
                +{device.connections.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceUnit;
