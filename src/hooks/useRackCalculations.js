import { useMemo } from 'react';
import { createUnitMap, calculateUtilization, generateRackUnits } from '../utils/rackUtils.js';
import { RACK_CONFIG } from '../constants/rackConfig.js';

/**
 * Custom hook for rack calculations and memoized data
 * @param {Object} rack - Rack object with devices
 * @returns {Object} Calculated rack data
 */
export const useRackCalculations = (rack) => {
  return useMemo(() => {
    if (!rack) {
      return {
        unitMap: {},
        units: [],
        utilization: { occupied: 0, total: 0, available: 0, percentage: 0, status: 'low' },
        height: RACK_CONFIG.DEFAULT_HEIGHT
      };
    }

    const height = rack.height || RACK_CONFIG.DEFAULT_HEIGHT;
    const unitMap = createUnitMap(rack.devices);
    const units = generateRackUnits(height);
    const utilization = calculateUtilization(unitMap, height);

    return {
      unitMap,
      units,
      utilization,
      height,
      devices: rack.devices || []
    };
  }, [rack]);
};
