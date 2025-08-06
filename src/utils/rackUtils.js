import { RACK_CONFIG, DEVICE_TYPES } from '../constants/rackConfig.js';

/**
 * Creates a mapping of rack units to devices
 * @param {Array} devices - Array of device objects
 * @returns {Object} Unit map with device information
 */
export const createUnitMap = (devices = []) => {
  const unitMap = {};
  
  devices.forEach(device => {
    if (!device?.startUnit || !device?.unitSpan) return;
    
    const start = parseInt(device.startUnit);
    const span = Math.max(1, parseInt(device.unitSpan));
    
    if (isNaN(start) || start < RACK_CONFIG.MIN_UNIT) return;
    
    // Span goes downward in U numbering (toward smaller numbers)
    for (let i = 0; i < span; i++) {
      const unit = start - i;
      if (unit >= RACK_CONFIG.MIN_UNIT) {
        unitMap[unit] = {
          ...device,
          isFirst: i === 0,
          isLast: i === span - 1,
          position: i,
          totalSpan: span,
          unitNumber: unit
        };
      }
    }
  });
  
  return unitMap;
};

/**
 * Calculates rack utilization percentage
 * @param {Object} unitMap - Unit mapping from createUnitMap
 * @param {number} rackHeight - Total rack height in U
 * @returns {Object} Utilization statistics
 */
export const calculateUtilization = (unitMap, rackHeight = RACK_CONFIG.DEFAULT_HEIGHT) => {
  const occupiedUnits = Object.keys(unitMap).length;
  const totalUnits = rackHeight;
  const utilizationPercentage = Math.round((occupiedUnits / totalUnits) * 100);
  
  return {
    occupied: occupiedUnits,
    total: totalUnits,
    available: totalUnits - occupiedUnits,
    percentage: utilizationPercentage,
    status: getUtilizationStatus(utilizationPercentage)
  };
};

/**
 * Gets utilization status based on percentage
 * @param {number} percentage - Utilization percentage
 * @returns {string} Status level
 */
export const getUtilizationStatus = (percentage) => {
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  if (percentage >= 50) return 'moderate';
  return 'low';
};

/**
 * Validates device placement in rack
 * @param {Object} device - Device to validate
 * @param {Object} unitMap - Current unit mapping
 * @param {number} rackHeight - Rack height
 * @returns {Object} Validation result
 */
export const validateDevicePlacement = (device, unitMap, rackHeight = RACK_CONFIG.DEFAULT_HEIGHT) => {
  const errors = [];
  const warnings = [];
  
  if (!device.startUnit) {
    errors.push('Device must have a start unit');
    return { isValid: false, errors, warnings };
  }
  
  const start = parseInt(device.startUnit);
  const span = parseInt(device.unitSpan) || 1;
  
  if (start < RACK_CONFIG.MIN_UNIT || start > rackHeight) {
    errors.push(`Start unit must be between ${RACK_CONFIG.MIN_UNIT} and ${rackHeight}`);
  }
  
  if (span < 1) {
    errors.push('Unit span must be at least 1');
  }
  
  const endUnit = start - span + 1;
  if (endUnit < RACK_CONFIG.MIN_UNIT) {
    errors.push(`Device extends below unit ${RACK_CONFIG.MIN_UNIT}`);
  }
  
  // Check for conflicts with existing devices
  for (let i = 0; i < span; i++) {
    const unit = start - i;
    if (unitMap[unit] && unitMap[unit].id !== device.id) {
      errors.push(`Unit ${unit} is already occupied by ${unitMap[unit].name}`);
    }
  }
  
  // Check device type constraints
  const deviceType = DEVICE_TYPES[device.type?.toUpperCase()];
  if (deviceType && span > deviceType.maxSpan) {
    warnings.push(`${device.type} devices typically don't exceed ${deviceType.maxSpan}U`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Gets device type configuration
 * @param {string} type - Device type
 * @returns {Object} Device type configuration
 */
export const getDeviceTypeConfig = (type) => {
  const normalizedType = type?.toUpperCase();
  return DEVICE_TYPES[normalizedType] || DEVICE_TYPES.OTHER;
};

/**
 * Generates rack units array
 * @param {number} height - Rack height
 * @returns {Array} Array of unit numbers from top to bottom
 */
export const generateRackUnits = (height = RACK_CONFIG.DEFAULT_HEIGHT) => {
  return Array.from({ length: height }, (_, i) => height - i);
};

/**
 * Checks if a unit is empty
 * @param {number} unit - Unit number
 * @param {Object} unitMap - Unit mapping
 * @returns {boolean} True if unit is empty
 */
export const isUnitEmpty = (unit, unitMap) => {
  return !unitMap[unit];
};

/**
 * Gets devices filtered by type
 * @param {Array} devices - Array of devices
 * @param {string} type - Device type to filter by
 * @returns {Array} Filtered devices
 */
export const getDevicesByType = (devices = [], type) => {
  return devices.filter(device => 
    device.type?.toLowerCase() === type?.toLowerCase()
  );
};

/**
 * Calculates power consumption for devices
 * @param {Array} devices - Array of devices
 * @returns {Object} Power statistics
 */
export const calculatePowerConsumption = (devices = []) => {
  const totalPower = devices.reduce((sum, device) => {
    return sum + (parseFloat(device.powerConsumption) || 0);
  }, 0);
  
  const deviceCount = devices.length;
  const averagePower = deviceCount > 0 ? totalPower / deviceCount : 0;
  
  return {
    total: Math.round(totalPower * 100) / 100,
    average: Math.round(averagePower * 100) / 100,
    deviceCount
  };
};

/**
 * Formats device tooltip content
 * @param {Object} device - Device object
 * @returns {string} Formatted tooltip content
 */
export const formatDeviceTooltip = (device) => {
  const parts = [
    `${device.name} (${device.type})`,
    `Units: ${device.startUnit}${device.unitSpan > 1 ? `-${device.startUnit - device.unitSpan + 1}` : ''}`,
  ];
  
  if (device.manufacturer) {
    parts.push(`${device.manufacturer}${device.model ? ` ${device.model}` : ''}`);
  }
  
  if (device.powerConsumption) {
    parts.push(`Power: ${device.powerConsumption}W`);
  }
  
  if (device.status) {
    parts.push(`Status: ${device.status}`);
  }
  
  return parts.join('\n');
};
