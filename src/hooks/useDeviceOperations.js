import { useCallback } from 'react';
import { validateDevicePlacement } from '../utils/rackUtils.js';

/**
 * Custom hook for device operations (CRUD)
 * @param {Object} options - Configuration options
 * @returns {Object} Device operation handlers
 */
export const useDeviceOperations = ({ 
  rack, 
  locationId, 
  unitMap, 
  onEdit, 
  onDelete, 
  onAdd 
}) => {
  
  const handleDeviceEdit = useCallback((locationId, rackId, device) => {
    if (!onEdit || !device) return;
    
    try {
      onEdit(locationId, rackId, device);
    } catch (error) {
      console.error('Error editing device:', error);
    }
  }, [onEdit]);

  const handleDeviceDelete = useCallback((device) => {
    if (!onDelete || !device) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${device.name}? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      try {
        onDelete(locationId, rack?.id, device.id);
      } catch (error) {
        console.error('Error deleting device:', error);
      }
    }
  }, [onDelete, locationId, rack?.id]);

  const handleDeviceAdd = useCallback((unitNumber) => {
    if (!onAdd) return;
    
    try {
      onAdd(locationId, rack?.id, { startUnit: unitNumber });
    } catch (error) {
      console.error('Error adding device:', error);
    }
  }, [onAdd, locationId, rack?.id]);

  const validateDevice = useCallback((device) => {
    if (!device || !unitMap) return { isValid: false, errors: ['Invalid device data'] };
    
    return validateDevicePlacement(device, unitMap, rack?.height);
  }, [unitMap, rack?.height]);

  const getDeviceConflicts = useCallback((startUnit, unitSpan) => {
    if (!unitMap || !startUnit || !unitSpan) return [];
    
    const conflicts = [];
    const start = parseInt(startUnit);
    const span = parseInt(unitSpan);
    
    for (let i = 0; i < span; i++) {
      const unit = start - i;
      if (unitMap[unit]) {
        conflicts.push({
          unit,
          device: unitMap[unit]
        });
      }
    }
    
    return conflicts;
  }, [unitMap]);

  return {
    handleDeviceEdit,
    handleDeviceDelete,
    handleDeviceAdd,
    validateDevice,
    getDeviceConflicts
  };
};
