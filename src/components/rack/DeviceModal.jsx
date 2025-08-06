import React from 'react';
import {
  Edit, Trash2, Info, Zap, Power, Thermometer, Activity,
  Server, Monitor, HardDrive, Wifi, Shield, Package
} from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { getDeviceTypeConfig } from '../../utils/rackUtils.js';
import { POWER_STATUS, THERMAL_STATUS } from '../../constants/rackConfig.js';

const DeviceModal = ({
  device,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  showControls = false,
  locationId,
  rackId,
  allDevices = []
}) => {
  if (!device) return null;

  const deviceConfig = getDeviceTypeConfig(device.type);
  
  // Get icon component
  const getIconComponent = (iconName) => {
    const icons = {
      Server, Monitor, HardDrive, Wifi, Shield, Package, Zap, Power, Thermometer, Activity
    };
    return icons[iconName] || Package;
  };

  const DeviceIcon = getIconComponent(deviceConfig.icon);

  const handleEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(locationId, rackId, device);
    }
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${device.name}? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      onClose();
      if (onDelete) {
        onDelete(locationId, rackId, device.id);
      }
    }
  };

  const renderDeviceInfo = () => (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${deviceConfig.bgColor}`}>
            <DeviceIcon size={24} className={deviceConfig.color} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {device.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {device.type}
            </p>
            {(device.manufacturer || device.model) && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {device.manufacturer} {device.model}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Physical Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rack Position
          </label>
          <div className="text-sm text-gray-900 dark:text-white">
            Units {device.startUnit}
            {device.unitSpan > 1 && ` - ${device.startUnit - device.unitSpan + 1}`}
            {device.unitSpan > 1 && (
              <span className="text-gray-500 ml-2">({device.unitSpan}U)</span>
            )}
          </div>
        </div>
        {device.depth && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Depth
            </label>
            <div className="text-sm text-gray-900 dark:text-white">
              {device.depth}
            </div>
          </div>
        )}
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {device.powerStatus && (
          <div className="flex items-center space-x-2">
            <Power size={16} className={
              device.powerStatus.toLowerCase() === 'on' ? 'text-green-500' : 'text-red-500'
            } />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Power</div>
              <div className={`text-sm font-medium ${
                device.powerStatus.toLowerCase() === 'on' ? 'text-green-600' : 'text-red-600'
              }`}>
                {device.powerStatus}
              </div>
            </div>
          </div>
        )}

        {device.temperature && (
          <div className="flex items-center space-x-2">
            <Thermometer size={16} className={
              parseFloat(device.temperature) > 45 ? 'text-red-500' : 
              parseFloat(device.temperature) > 35 ? 'text-yellow-500' : 'text-green-500'
            } />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Temperature</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {device.temperature}°C
              </div>
            </div>
          </div>
        )}

        {device.powerConsumption && (
          <div className="flex items-center space-x-2">
            <Zap size={16} className="text-yellow-500" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Power Draw</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {device.powerConsumption}W
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Network/Connection Info */}
      {(device.ipAddress || device.macAddress || device.hostname) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Network Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {device.ipAddress && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">IP Address:</span>
                <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                  {device.ipAddress}
                </span>
              </div>
            )}
            {device.macAddress && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">MAC Address:</span>
                <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                  {device.macAddress}
                </span>
              </div>
            )}
            {device.hostname && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Hostname:</span>
                <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                  {device.hostname}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Power Input Connections (for devices receiving power) */}
      {device.pduPorts && device.pduPorts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
            <Zap size={16} className="text-yellow-600" />
            <span>Power Input Connections</span>
          </h4>
          <div className="space-y-3">
            {device.pduPorts.map((port, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {port.deviceType?.toUpperCase()} Connection
                  </span>
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded text-yellow-700 dark:text-yellow-300">
                    Port {port.portNumber}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Device ID:</span>
                    <span className="ml-2 font-mono text-gray-900 dark:text-white">
                      {port.pduId}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Port:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {port.portNumber}
                    </span>
                  </div>
                </div>
                {port.voltage && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Voltage:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {port.voltage}V
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Power Output Connections (for PDUs and UPS devices providing power) */}
      {(['pdu', 'ups'].includes(device.type?.toLowerCase()) && allDevices.length > 0) && (() => {
        const connectedDevices = allDevices.filter(d => 
          (d.pduPorts || []).some(port => port.pduId === String(device.id))
        ).map(d => ({
          ...d,
          outlets: (d.pduPorts || []).filter(port => port.pduId === String(device.id))
        }));

        return connectedDevices.length > 0 ? (
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
              <Power size={16} className="text-orange-600" />
              <span>Power Output Mapping</span>
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Devices receiving power from this {device.type?.toUpperCase()}
            </div>
            <div className="space-y-3">
              {connectedDevices.map((connectedDevice, index) => (
                <div key={connectedDevice.id || index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {connectedDevice.name} ({connectedDevice.type})
                    </span>
                    <span className="text-xs bg-orange-100 dark:bg-orange-800 px-2 py-1 rounded text-orange-700 dark:text-orange-300">
                      {connectedDevice.outlets.length} connection{connectedDevice.outlets.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {connectedDevice.outlets.map((outlet, outletIndex) => (
                      <div key={outletIndex} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <span className="text-gray-600 dark:text-gray-400">Port:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{outlet.portNumber}</span>
                        {outlet.voltage && (
                          <>
                            <span className="ml-4 text-gray-600 dark:text-gray-400">Voltage:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{outlet.voltage}V</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Network/Data Connections */}
      {device.connections && device.connections.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Network/Data Connections</h4>
          <div className="space-y-2">
            {device.connections.map((conn, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {conn.type || 'Connection'} {conn.port && `(Port ${conn.port})`}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {conn.target}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Properties */}
      {(device.serialNumber || device.assetTag || device.warrantyExpiry) && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Asset Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {device.serialNumber && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Serial Number:</span>
                <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                  {device.serialNumber}
                </span>
              </div>
            )}
            {device.assetTag && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Asset Tag:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  {device.assetTag}
                </span>
              </div>
            )}
            {device.warrantyExpiry && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Warranty:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  {new Date(device.warrantyExpiry).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {device.notes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center space-x-2 text-gray-900 dark:text-white">
            <Info size={16} />
            <span>Notes</span>
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {device.notes}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Device Details">
      <div className="max-h-[80vh] overflow-y-auto">
        {renderDeviceInfo()}
        
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {showControls && (
            <>
              {onDelete && (
                <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                  <Trash2 size={16} />
                  Delete
                </Button>
              )}
              {onEdit && (
                <Button onClick={handleEdit}>
                  <Edit size={16} />
                  Edit Device
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DeviceModal;
