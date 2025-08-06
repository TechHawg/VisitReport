import React from 'react';
import { Plus } from 'lucide-react';
import DeviceUnit from './DeviceUnit.jsx';
import { isUnitEmpty, getDeviceTypeConfig } from '../../utils/rackUtils.js';
import { RACK_CONFIG } from '../../constants/rackConfig.js';

const EmptyUnit = ({ 
  unitNumber, 
  isHovered, 
  onUnitClick, 
  onUnitHover, 
  showControls, 
  viewMode 
}) => {
  const handleClick = () => {
    if (showControls && onUnitClick) {
      onUnitClick(unitNumber);
    }
  };

  const getEmptyUnitHeight = () => {
    if (viewMode === 'compact') return '1rem';
    return '1.5rem';
  };

  return (
    <div
      className={`
        border border-dashed transition-all duration-200 rounded
        ${RACK_CONFIG.COLORS.EMPTY_UNIT}
        ${RACK_CONFIG.COLORS.DEVICE_BORDER}
        ${isHovered ? RACK_CONFIG.COLORS.HOVER_UNIT + ' border-blue-400' : ''}
        ${showControls ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}
      `}
      style={{ height: getEmptyUnitHeight() }}
      onClick={handleClick}
      onMouseEnter={() => onUnitHover?.(unitNumber)}
      onMouseLeave={() => onUnitHover?.(null)}
    >
      <div className="h-full flex items-center justify-between px-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">U{unitNumber}</span>
        {showControls && isHovered && (
          <Plus size={12} className="text-blue-500" />
        )}
      </div>
    </div>
  );
};

const RackUnits = ({
  units,
  unitMap,
  hoveredUnit,
  onUnitHover,
  onUnitClick,
  onDeviceClick,
  showControls,
  viewMode = 'detailed'
}) => {
  if (!units || units.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No rack units to display</p>
      </div>
    );
  }

  const getContainerClasses = () => {
    const baseClasses = "space-y-px";
    
    if (viewMode === 'compact') {
      return `${baseClasses} max-h-96 overflow-y-auto`;
    }
    
    if (viewMode === 'overview') {
      return `${baseClasses} max-h-[600px] overflow-y-auto`;
    }
    
    return baseClasses;
  };

  return (
    <div className={getContainerClasses()}>
      {/* Unit number labels for detailed view */}
      {viewMode === 'detailed' && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
          <span>Units</span>
          <span>Front</span>
        </div>
      )}
      
      {units.map((unitNumber) => {
        const device = unitMap[unitNumber];
        const isEmpty = isUnitEmpty(unitNumber, unitMap);
        const isHovered = hoveredUnit === unitNumber;
        const isMultiUnit = device && device.totalSpan > 1;
        const isFirstUnit = device && device.isFirst;
        const isLastUnit = device && device.isLast;

        // Calculate styling for multi-unit devices
        const getUnitClasses = () => {
          if (!isMultiUnit) return "";
          
          let classes = "";
          if (isFirstUnit && isLastUnit) {
            // Single unit device (shouldn't happen with totalSpan > 1, but safety)
            classes = "rounded";
          } else if (isFirstUnit) {
            // First unit of multi-unit device
            classes = "rounded-t border-b-0";
          } else if (isLastUnit) {
            // Last unit of multi-unit device
            classes = "rounded-b border-t-0";
          } else {
            // Middle unit of multi-unit device
            classes = "border-t-0 border-b-0";
          }
          
          return classes;
        };

        return (
          <div key={unitNumber} className={`relative ${getUnitClasses()}`}>
            {/* Unit number label for detailed view - always show for visibility */}
            {viewMode === 'detailed' && (
              <div className={`absolute left-0 top-0 w-8 h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 z-20 ${
                isMultiUnit 
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-r border-blue-300 dark:border-blue-700' 
                  : 'bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700'
              } ${
                isFirstUnit && isLastUnit ? 'rounded-l' : 
                isFirstUnit ? 'rounded-tl' :
                isLastUnit ? 'rounded-bl' : ''
              }`}>
                {unitNumber}
              </div>
            )}
            
            {/* Unit content */}
            <div className={`${viewMode === 'detailed' ? 'ml-8' : ''} ${
              isMultiUnit && !isFirstUnit ? 'opacity-0 pointer-events-none' : ''
            }`}>
              {isEmpty ? (
                <EmptyUnit
                  unitNumber={unitNumber}
                  isHovered={isHovered}
                  onUnitClick={onUnitClick}
                  onUnitHover={onUnitHover}
                  showControls={showControls}
                  viewMode={viewMode}
                />
              ) : (
                <DeviceUnit
                  device={device}
                  unitNumber={unitNumber}
                  isHovered={isHovered}
                  onDeviceClick={onDeviceClick}
                  viewMode={viewMode}
                  showControls={showControls}
                />
              )}
            </div>

            {/* Multi-unit background highlighting */}
            {isMultiUnit && !isFirstUnit && (() => {
              const deviceTypeConfig = getDeviceTypeConfig(device.type);
              return (
                <div className={`absolute inset-0 ${viewMode === 'detailed' ? 'ml-8' : ''} ${
                  deviceTypeConfig?.bgColor || 'bg-blue-50 dark:bg-blue-900/20'
                } ${
                  deviceTypeConfig?.borderColor || 'border border-blue-200 dark:border-blue-700'
                } ${getUnitClasses()} pointer-events-none z-0`} />
              );
            })()}

            {/* Rear devices indicator for detailed view */}
            {viewMode === 'detailed' && device?.rearDevices && isFirstUnit && (
              <div className="absolute right-0 top-0 w-4 h-full bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-600 rounded-r z-10">
                <div className="h-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" title="Rear device present" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RackUnits;
