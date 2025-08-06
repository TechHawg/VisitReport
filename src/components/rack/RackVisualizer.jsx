import React, { useState } from 'react';
import RackHeader from './RackHeader.jsx';
import RackUnits from './RackUnits.jsx';
import DeviceModal from './DeviceModal.jsx';
import { useRackCalculations } from '../../hooks/useRackCalculations.js';
import { useDeviceOperations } from '../../hooks/useDeviceOperations.js';

/**
 * RackVisualizer - A comprehensive rack visualization component
 * 
 * Features:
 * - Multiple view modes (detailed, compact, overview)
 * - Interactive device management
 * - Real-time utilization tracking
 * - Responsive design
 * - Accessibility support
 * 
 * @param {Object} rack - Rack object with devices and metadata
 * @param {string} locationId - Location identifier
 * @param {boolean} showControls - Enable device management controls
 * @param {Function} onDeviceEdit - Device edit callback
 * @param {Function} onDeviceDelete - Device delete callback
 * @param {Function} onDeviceAdd - Device add callback
 * @param {string} viewMode - View mode: 'detailed', 'compact', or 'overview'
 */
const RackVisualizer = ({ 
  rack, 
  locationId, 
  showControls = false, 
  onDeviceEdit, 
  onDeviceDelete, 
  onDeviceAdd,
  viewMode = 'detailed'
}) => {
  // Local state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hoveredUnit, setHoveredUnit] = useState(null);

  // Custom hooks for data and operations
  const { unitMap, units, utilization, height } = useRackCalculations(rack);
  const { 
    handleDeviceEdit, 
    handleDeviceDelete, 
    handleDeviceAdd 
  } = useDeviceOperations({
    rack,
    locationId,
    unitMap,
    onEdit: onDeviceEdit,
    onDelete: onDeviceDelete,
    onAdd: onDeviceAdd
  });

  // Early return for invalid data
  if (!rack) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <p className="text-gray-500 dark:text-gray-400">No rack data available</p>
      </div>
    );
  }

  // Event handlers
  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setShowDeviceModal(true);
  };

  const handleUnitClick = (unitNumber) => {
    if (showControls) {
      handleDeviceAdd(unitNumber);
    }
  };

  const handleCloseModal = () => {
    setShowDeviceModal(false);
    setSelectedDevice(null);
  };

  // Container classes based on view mode
  const getContainerClasses = () => {
    const baseClasses = "w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden";
    
    switch (viewMode) {
      case 'compact':
        return `${baseClasses} max-w-md`;
      case 'overview':
        return `${baseClasses} max-w-2xl`;
      default:
        return `${baseClasses} max-w-4xl`;
    }
  };

  return (
    <div className={getContainerClasses()}>
      {/* Rack Header */}
      <RackHeader 
        rack={rack} 
        utilization={utilization} 
        viewMode={viewMode} 
      />

      {/* Rack Units */}
      <div className="p-4">
        <RackUnits
          units={units}
          unitMap={unitMap}
          hoveredUnit={hoveredUnit}
          onUnitHover={setHoveredUnit}
          onUnitClick={handleUnitClick}
          onDeviceClick={handleDeviceClick}
          showControls={showControls}
          viewMode={viewMode}
        />
      </div>

      {/* Device Details Modal */}
      <DeviceModal
        device={selectedDevice}
        isOpen={showDeviceModal}
        onClose={handleCloseModal}
        onEdit={handleDeviceEdit}
        onDelete={handleDeviceDelete}
        showControls={showControls}
        locationId={locationId}
        rackId={rack?.id}
        allDevices={rack?.devices || []}
      />
    </div>
  );
};

export default RackVisualizer;
